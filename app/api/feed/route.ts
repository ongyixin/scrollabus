import { createClient } from "@/lib/supabase/server";
import { recallMemory } from "@/lib/hydra";
import { triggerTeachingWorkflow } from "@/lib/dify";
import { NextRequest, NextResponse } from "next/server";
import { FEED_PAGE_SIZE } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get("cursor"); // JSON map of { [materialId]: lastCreatedAt|null } for home feed
  const materialId = searchParams.get("material_id");
  const personaSlug = searchParams.get("persona_slug"); // optional persona filter

  // On fresh feed load (no cursor, no material filter), fire-and-forget memory recall
  // to surface weak/stale concepts as a study nudge (result is informational, non-blocking)
  if (!cursor && !materialId) {
    recallMemory({
      userId: user.id,
      query: "weak concepts, repeated mistakes, stale topics, things not reviewed recently",
      maxResults: 5,
      recencyBias: 0.1,
    }).then((memories) => {
      if (memories.length > 0) {
        triggerTeachingWorkflow({
          eventType: "feed_opened",
          userId: user.id,
          payload: { weak_concepts: memories },
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  // Resolve persona_id from slug if a filter is requested
  let personaIdFilter: string | null = null;
  if (personaSlug) {
    const { data: personaRow } = await supabase
      .from("personas")
      .select("id")
      .eq("slug", personaSlug)
      .single();
    personaIdFilter = personaRow?.id ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function annotate(posts: any[], likedPostIds?: Set<string>) {
    return posts.map((post) => ({
      ...post,
      is_saved: Array.isArray(post.saves)
        ? post.saves.some((s: { user_id: string }) => s.user_id === user!.id)
        : false,
      is_liked: likedPostIds?.has(post.id)
        ?? (Array.isArray(post.likes)
          ? post.likes.some((l: { user_id: string }) => l.user_id === user!.id)
          : false),
      comment_count: Array.isArray(post.comment_count)
        ? (post.comment_count[0]?.count ?? 0)
        : 0,
      saves: undefined,
      likes: undefined,
      material: undefined,
    }));
  }

  // Distribute page slots across materials using exponential decay so the most
  // recent material gets the most cards, but older materials still appear.
  // e.g. with 5 materials and pageSize=10: [4, 3, 1, 1, 1]
  function allocateSlots(count: number, pageSize: number, decay: number): number[] {
    if (count === 0) return [];
    if (count === 1) return [pageSize];
    const weights = Array.from({ length: count }, (_, i) => Math.pow(decay, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const exact = weights.map((w) => (w / totalWeight) * pageSize);
    const floors = exact.map(Math.floor);
    const remaining = pageSize - floors.reduce((a, b) => a + b, 0);
    const indexed = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    for (let j = 0; j < remaining; j++) floors[indexed[j].i]++;
    return floors;
  }

  // Round-robin across material buckets (largest/newest bucket first) so the
  // feed visually interleaves content from different upload sessions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function interleaveRoundRobin(buckets: any[][]): any[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any[] = [];
    const maxLen = Math.max(...buckets.map((b) => b.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const bucket of buckets) {
        if (i < bucket.length) result.push(bucket[i]);
      }
    }
    return result;
  }

  if (materialId) {
    // Material-specific feed: filter by material_id directly
    let query = supabase
      .from("posts")
      .select(`
        *,
        persona:personas(*),
        saves!left(user_id),
        likes!left(user_id),
        comment_count:comments(count)
      `)
      .eq("material_id", materialId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(FEED_PAGE_SIZE);

    if (personaIdFilter) query = query.eq("persona_id", personaIdFilter);
    if (cursor) query = query.lt("created_at", cursor);

    const { data: posts, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const annotated = annotate(posts ?? []);
    const nextCursor =
      annotated.length === FEED_PAGE_SIZE
        ? annotated[annotated.length - 1].created_at
        : null;

    return NextResponse.json({ posts: annotated, nextCursor });
  }

  // Fetch the user's most-recent materials (newest first) so we can weight
  // the feed toward recent uploads while still surfacing older ones.
  // Cap at MAX_FEED_MATERIALS so every material always gets at least one slot.
  const MAX_FEED_MATERIALS = 5;
  const RECENCY_DECAY = 0.6; // each older material gets 60% of the previous one's slots

  const { data: userMaterials, error: matError } = await supabase
    .from("materials")
    .select("id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_FEED_MATERIALS);

  if (matError) {
    return NextResponse.json({ error: matError.message }, { status: 500 });
  }

  const materials = userMaterials ?? [];
  if (materials.length === 0) {
    return NextResponse.json({ posts: [], nextCursor: null });
  }

  // Cursor is a JSON map of { [materialId]: lastSeenCreatedAt | null }
  // null = exhausted, absent = not yet started (fetch from beginning)
  let materialCursors: Record<string, string | null> = {};
  if (cursor) {
    try {
      const parsed = JSON.parse(cursor);
      if (parsed && typeof parsed === "object") materialCursors = parsed;
    } catch {
      // Legacy single-value cursor — discard and start fresh
    }
  }

  const slots = allocateSlots(materials.length, FEED_PAGE_SIZE, RECENCY_DECAY);

  // Fetch each material's allocated posts in parallel.
  // Omit the likes join here — concurrent PostgREST requests sharing the schema
  // cache can produce PGRST200 "relationship not found" for the likes FK.
  // Likes are resolved in a single follow-up query below.
  const rawBuckets = await Promise.all(
    materials.map(async (mat: { id: string; created_at: string }, i: number) => {
      if (slots[i] === 0) return [];
      const matCursor = materialCursors[mat.id];
      if (matCursor === null) return []; // already exhausted

      let q = supabase
        .from("posts")
        .select(`
          *,
          persona:personas(*),
          saves!left(user_id),
          comment_count:comments(count)
        `)
        .eq("material_id", mat.id)
        .order("created_at", { ascending: false })
        .limit(slots[i]);

      if (personaIdFilter) q = q.eq("persona_id", personaIdFilter);
      // matCursor is a string (previous position) or undefined (not started)
      if (matCursor) q = q.lt("created_at", matCursor);

      const { data, error: qErr } = await q;
      if (qErr) console.error(`[feed] posts query error for material ${mat.id}:`, qErr);
      return data ?? [];
    })
  );

  // Resolve likes in a single query to avoid concurrent schema-cache issues
  const allPostIds = rawBuckets.flat().map((p: { id: string }) => p.id);
  let likedPostIds = new Set<string>();
  if (allPostIds.length > 0) {
    const { data: likeRows } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", allPostIds);
    likedPostIds = new Set((likeRows ?? []).map((r: { post_id: string }) => r.post_id));
  }

  // Build the next per-material cursor
  const nextCursorObj: Record<string, string | null> = {};
  materials.forEach((mat: { id: string; created_at: string }, i: number) => {
    const prevCursor = materialCursors[mat.id];
    if (prevCursor === null) {
      nextCursorObj[mat.id] = null; // stay exhausted
    } else if (slots[i] === 0) {
      // Not fetched this round — carry forward previous position if any
      if (prevCursor !== undefined) nextCursorObj[mat.id] = prevCursor;
    } else if (rawBuckets[i].length < slots[i]) {
      nextCursorObj[mat.id] = null; // fewer results than requested = exhausted
    } else {
      nextCursorObj[mat.id] = rawBuckets[i][rawBuckets[i].length - 1].created_at;
    }
  });

  const hasMore = materials.some(
    (mat: { id: string }) =>
      nextCursorObj[mat.id] !== null && nextCursorObj[mat.id] !== undefined
  );
  const nextCursor = hasMore ? JSON.stringify(nextCursorObj) : null;

  const annotatedBuckets = rawBuckets.map((bucket) => annotate(bucket, likedPostIds));
  const resultPosts = interleaveRoundRobin(annotatedBuckets);
  return NextResponse.json({ posts: resultPosts, nextCursor });
}
