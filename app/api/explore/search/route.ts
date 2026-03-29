import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { ExternalContent } from "@/lib/types";

interface YouTubeSearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium?: { url: string };
      high?: { url: string };
      default?: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ dbContent: [], liveContent: [] });
  }

  // ── 1. Search existing Supabase external_content by title / description ────
  const { data: dbRows } = await supabase
    .from("external_content")
    .select("*")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("view_count", { ascending: false })
    .limit(10);

  const dbContent: ExternalContent[] = dbRows ?? [];

  // ── 2. Live YouTube search via Data API v3 ─────────────────────────────────
  const liveContent: ExternalContent[] = [];
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (youtubeApiKey) {
    try {
      const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      ytUrl.searchParams.set("part", "snippet");
      ytUrl.searchParams.set("q", query);
      ytUrl.searchParams.set("type", "video");
      ytUrl.searchParams.set("maxResults", "12");
      ytUrl.searchParams.set("key", youtubeApiKey);
      ytUrl.searchParams.set("relevanceLanguage", "en");
      ytUrl.searchParams.set("safeSearch", "moderate");

      const ytRes = await fetch(ytUrl.toString(), {
        next: { revalidate: 300 }, // cache for 5 min
      });

      if (ytRes.ok) {
        const ytData = await ytRes.json();
        for (const item of (ytData.items ?? []) as YouTubeSearchItem[]) {
          const videoId = item.id?.videoId;
          if (!videoId) continue;

          // Skip videos already in Supabase
          const alreadyInDb = dbContent.some((c) => c.external_id === videoId);
          if (alreadyInDb) continue;

          liveContent.push({
            id: `yt-search-${videoId}`,
            platform: "youtube",
            external_id: videoId,
            title: item.snippet.title ?? null,
            description: item.snippet.description ?? null,
            thumbnail_url:
              item.snippet.thumbnails.high?.url ??
              item.snippet.thumbnails.medium?.url ??
              item.snippet.thumbnails.default?.url ??
              null,
            embed_url: `https://www.youtube.com/watch?v=${videoId}`,
            author_name: item.snippet.channelTitle ?? null,
            author_avatar_url: null,
            view_count: 0,
            like_count: 0,
            tags: [],
            duration_seconds: null,
            published_at: item.snippet.publishedAt ?? null,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // YouTube API unavailable — continue with Supabase results only
    }
  }

  return NextResponse.json({ dbContent, liveContent, youtubeEnabled: !!youtubeApiKey });
}
