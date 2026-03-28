import { createClient } from "@/lib/supabase/server";
import { writeMemory } from "@/lib/hydra";
import { NextRequest, NextResponse } from "next/server";

// POST /api/saves — save/unsave a post with optional category assignments
// Body: { post_id: string, category_ids: string[] }
// - category_ids non-empty → upsert saves row + sync memberships
// - category_ids empty    → delete saves row + all memberships (unsave)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { post_id, category_ids } = body as { post_id: string; category_ids?: string[] };

  if (!post_id) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  const ids: string[] = Array.isArray(category_ids) ? category_ids : [];

  if (ids.length === 0) {
    // Unsave: remove the save row and all category memberships
    await supabase
      .from("save_category_memberships")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", post_id);

    await supabase
      .from("saves")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", post_id);

    return NextResponse.json({ saved: false });
  }

  // Upsert the base save row
  await supabase
    .from("saves")
    .upsert({ user_id: user.id, post_id }, { onConflict: "user_id,post_id" });

  // Fire-and-forget: write save signal to learner memory
  void (async () => {
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("title, post_type, persona:personas(name)")
        .eq("id", post_id)
        .single();
      if (!post) return;
      const personaName = (post.persona as { name?: string } | null)?.name ?? "a persona";
      await writeMemory({
        userId: user.id,
        text: `User bookmarked a ${post.post_type} post by ${personaName}: "${post.title ?? "(untitled)"}"`,
      });
    } catch { /* non-critical */ }
  })();

  // Replace category memberships: delete all existing, then insert the new selection
  await supabase
    .from("save_category_memberships")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", post_id);

  const memberships = ids.map((category_id) => ({
    user_id: user.id,
    post_id,
    category_id,
  }));

  await supabase.from("save_category_memberships").insert(memberships);

  return NextResponse.json({ saved: true });
}
