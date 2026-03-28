import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const interestsParam = searchParams.get("interests");
  const limitParam = searchParams.get("limit");

  const interestKeywords = interestsParam
    ? interestsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const limit = Math.min(parseInt(limitParam ?? "20", 10) || 20, 50);

  const { data: trendingPosts, error } = await supabase.rpc("get_trending_posts", {
    limit_count: limit,
    interest_keywords: interestKeywords.length > 0 ? interestKeywords : null,
    exclude_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!trendingPosts || trendingPosts.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  // Fetch personas and save status for the returned posts
  const postIds = trendingPosts.map((p: { id: string }) => p.id);

  const [personaRes, savesRes, commentsRes] = await Promise.all([
    supabase
      .from("personas")
      .select("*"),
    supabase
      .from("saves")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds),
    supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds),
  ]);

  const personaMap = new Map(
    (personaRes.data ?? []).map((p: { id: string }) => [p.id, p])
  );
  const savedSet = new Set(
    (savesRes.data ?? []).map((s: { post_id: string }) => s.post_id)
  );

  const annotated = trendingPosts.map((post: {
    id: string;
    persona_id: string;
    save_count: number;
    comment_count: number;
    engagement_score: number;
  }) => ({
    ...post,
    persona: personaMap.get(post.persona_id) ?? null,
    is_saved: savedSet.has(post.id),
  }));

  return NextResponse.json({ posts: annotated });
}
