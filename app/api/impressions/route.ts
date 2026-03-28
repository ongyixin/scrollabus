import { createClient } from "@/lib/supabase/server";
import { writeMemory } from "@/lib/hydra";
import { NextRequest, NextResponse } from "next/server";

// POST /api/impressions — batch log impressions
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { impressions } = await req.json();
  if (!Array.isArray(impressions) || impressions.length === 0) {
    return NextResponse.json({ error: "impressions array required" }, { status: 400 });
  }

  const rows = impressions
    .filter((imp) => imp.post_id && typeof imp.duration_ms === "number")
    .map((imp) => ({
      user_id: user.id,
      post_id: imp.post_id,
      duration_ms: imp.duration_ms,
    }));

  if (rows.length > 0) {
    await supabase.from("impressions").insert(rows);

    // Fire-and-forget: write significant dwell time signals to learner memory.
    // Only track engagements ≥2s to filter scroll-bys.
    const significant = rows.filter((r) => r.duration_ms >= 2000);
    if (significant.length > 0) {
      const postIds = significant.map((r) => r.post_id);
      void (async () => {
        try {
          const { data: posts } = await supabase
            .from("posts")
            .select("id, title, post_type, media_type, persona:personas(name)")
            .in("id", postIds);
          if (!posts) return;
          const postMap = new Map(posts.map((p) => [p.id, p]));
          for (const r of significant) {
            const post = postMap.get(r.post_id);
            if (!post) continue;
            const personaName = (post.persona as { name?: string } | null)?.name ?? "a persona";
            const seconds = Math.round(r.duration_ms / 1000);
            await writeMemory({
              userId: user.id,
              text: `User spent ${seconds}s viewing a ${post.media_type} ${post.post_type} post by ${personaName}: "${post.title ?? "(untitled)"}"`,
              infer: true,
            });
          }
        } catch { /* non-critical */ }
      })();
    }
  }

  return NextResponse.json({ logged: rows.length });
}
