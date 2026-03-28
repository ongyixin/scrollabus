import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/saved-posts?category_id=<uuid>
// Returns saved posts, optionally filtered to a single category.
// Each post includes a `category_ids` array of all categories it belongs to.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("category_id");

  // Fetch all memberships for this user so we can annotate category_ids on each post
  const { data: allMemberships } = await supabase
    .from("save_category_memberships")
    .select("post_id, category_id")
    .eq("user_id", user.id);

  const membershipMap: Record<string, string[]> = {};
  for (const m of allMemberships ?? []) {
    if (!membershipMap[m.post_id]) membershipMap[m.post_id] = [];
    membershipMap[m.post_id].push(m.category_id);
  }

  if (categoryId) {
    // Filter by category: join through save_category_memberships
    const { data: memberships, error } = await supabase
      .from("save_category_memberships")
      .select(`
        created_at,
        post:posts(
          *,
          persona:personas(*)
        )
      `)
      .eq("user_id", user.id)
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posts = (memberships ?? []).map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const post = m.post as any;
      return { ...post, is_saved: true, category_ids: membershipMap[post.id] ?? [] };
    });
    return NextResponse.json({ posts });
  }

  // No filter: return all saved posts
  const { data: saves, error } = await supabase
    .from("saves")
    .select(`
      created_at,
      post:posts(
        *,
        persona:personas(*)
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const posts = (saves ?? []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = s.post as any;
    return { ...post, is_saved: true, category_ids: membershipMap[post.id] ?? [] };
  });
  return NextResponse.json({ posts });
}
