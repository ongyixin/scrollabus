import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/likes — toggle like
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { post_id } = await req.json();
  if (!post_id) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("likes")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", post_id)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post_id);
    return NextResponse.json({ liked: false });
  } else {
    await supabase.from("likes").insert({ user_id: user.id, post_id });
    return NextResponse.json({ liked: true });
  }
}
