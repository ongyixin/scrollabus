import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const platformParam = searchParams.get("platform");
  const interestsParam = searchParams.get("interests");
  const limitParam = searchParams.get("limit");
  const cursorParam = searchParams.get("cursor");

  const interestKeywords = interestsParam
    ? interestsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const limit = Math.min(parseInt(limitParam ?? "20", 10) || 20, 50);
  const beforePublishedAt = cursorParam ? decodeURIComponent(cursorParam) : null;

  const { data: items, error } = await supabase.rpc("get_external_content", {
    limit_count: limit,
    platform_filter: platformParam ?? null,
    interest_keywords: interestKeywords.length > 0 ? interestKeywords : null,
    before_published_at: beforePublishedAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const content = items ?? [];
  const nextCursor =
    content.length === limit
      ? encodeURIComponent(content[content.length - 1].published_at ?? content[content.length - 1].created_at)
      : null;

  return NextResponse.json({ content, nextCursor });
}
