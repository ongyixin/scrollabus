import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/saved-posts/memberships?post_id=<uuid>
// Returns the category IDs a saved post belongs to for the current user.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = req.nextUrl.searchParams.get("post_id");
  if (!postId) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("save_category_memberships")
    .select("category_id")
    .eq("user_id", user.id)
    .eq("post_id", postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const category_ids = (data ?? []).map((r: { category_id: string }) => r.category_id);
  return NextResponse.json({ category_ids });
}
