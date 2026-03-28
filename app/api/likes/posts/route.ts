import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/likes/posts — return posts liked by the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("likes")
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

  const posts = (data ?? []).map((l) => ({ ...l.post, is_liked: true }));
  return NextResponse.json({ posts });
}
