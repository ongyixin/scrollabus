"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { PersonaSprite } from "@/components/PersonaSprites";
import type { Post, Quiz, FeedItem } from "@/lib/types";
import { PERSONA_CONFIG, QUIZ_INSERT_INTERVAL } from "@/lib/constants";
import { FeedCard } from "@/components/FeedCard";
import { QuizCard } from "@/components/QuizCard";
import { CommentSheet } from "@/components/CommentSheet";
import { PersonaProfileSheet } from "@/components/PersonaProfileSheet";
import { EmptyFeedLanding } from "@/components/EmptyFeedLanding";

interface PendingImpression {
  post_id: string;
  duration_ms: number;
}

// Deterministically interleave quizzes into the post list at pseudo-random intervals.
// Uses a simple hash of quiz IDs to pick positions so the layout is stable across renders.
function buildFeedItems(posts: Post[], quizzes: Quiz[]): FeedItem[] {
  if (quizzes.length === 0) {
    return posts.map((p) => ({ _type: "post" as const, data: p }));
  }

  const { min, max } = QUIZ_INSERT_INTERVAL;
  const range = max - min + 1;

  // Derive a seeded offset per quiz from its ID to vary insertion gaps
  function quizOffset(quiz: Quiz, index: number): number {
    const seed = quiz.id.charCodeAt(0) + index;
    return min + (seed % range);
  }

  const items: FeedItem[] = [];
  let postIdx = 0;
  let quizIdx = 0;
  let postsUntilNextQuiz = quizOffset(quizzes[0], 0);

  while (postIdx < posts.length || quizIdx < quizzes.length) {
    if (postIdx < posts.length && postsUntilNextQuiz > 0) {
      items.push({ _type: "post", data: posts[postIdx++] });
      postsUntilNextQuiz--;
    } else if (quizIdx < quizzes.length) {
      items.push({ _type: "quiz", data: quizzes[quizIdx] });
      quizIdx++;
      postsUntilNextQuiz = quizIdx < quizzes.length
        ? quizOffset(quizzes[quizIdx], quizIdx)
        : Infinity;
    } else {
      // Remaining posts
      items.push({ _type: "post", data: posts[postIdx++] });
    }
  }

  return items;
}

function FeedContent() {
  const searchParams = useSearchParams();
  const materialId = searchParams.get("material_id");

  const [posts, setPosts] = useState<Post[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeCommentPersonaSlug, setActiveCommentPersonaSlug] = useState<string | null>(null);
  const [activePersonaSlug, setActivePersonaSlug] = useState<string | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string | null>(null);
  const [quizFilter, setQuizFilter] = useState(false);

  const impressionsQueue = useRef<PendingImpression[]>([]);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);

  const flushImpressions = useCallback(async () => {
    const batch = impressionsQueue.current.splice(0);
    if (batch.length === 0) return;
    await fetch("/api/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ impressions: batch }),
    }).catch(() => {});
  }, []);

  const handleVisible = useCallback((postId: string, durationMs: number) => {
    impressionsQueue.current.push({ post_id: postId, duration_ms: durationMs });
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushImpressions, 3000);
  }, [flushImpressions]);

  async function fetchFeed(cursor?: string, filterSlug?: string | null) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (materialId) params.set("material_id", materialId);
    const slug = filterSlug !== undefined ? filterSlug : personaFilter;
    if (slug) params.set("persona_slug", slug);

    const res = await fetch(`/api/feed?${params}`);

    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 300));
      const retry = await fetch(`/api/feed?${params}`);
      if (retry.status === 401) { window.location.href = "/login"; return; }
      if (!retry.ok) { console.error("[feed] retry error", retry.status); return; }
      return retry.json();
    }
    if (!res.ok) { console.error("[feed] API error", res.status); return; }
    return res.json();
  }

  async function fetchQuizzes(fMaterialId?: string | null) {
    // Only load quizzes for the general home feed or a specific material
    const params = new URLSearchParams();
    if (fMaterialId) params.set("material_id", fMaterialId);
    try {
      const res = await fetch(`/api/quizzes?${params}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.quizzes ?? []) as Quiz[];
    } catch {
      return [];
    }
  }

  // Rebuild feed items whenever posts, quizzes, or filters change
  useEffect(() => {
    let items: FeedItem[];
    if (quizFilter) {
      items = quizzes.map((q) => ({ _type: "quiz" as const, data: q }));
    } else if (personaFilter) {
      items = posts.map((p) => ({ _type: "post" as const, data: p }));
    } else {
      items = buildFeedItems(posts, quizzes);
    }
    setFeedItems(items);
  }, [posts, quizzes, personaFilter, quizFilter]);

  useEffect(() => {
    let polling: NodeJS.Timeout | null = null;

    async function load() {
      setIsLoading(true);
      const [feedData, quizData] = await Promise.all([
        fetchFeed(undefined, personaFilter),
        fetchQuizzes(materialId),
      ]);

      if (feedData) {
        setPosts(feedData.posts);
        setNextCursor(feedData.nextCursor);
      }
      setQuizzes(quizData);
      setIsLoading(false);

      // Poll every 2s until posts are ready. Also re-fetch quizzes on each tick
      // since quiz generation (Gemini, ~5-15s) finishes well before posts (n8n, ~30-60s).
      const hasPosts = feedData && feedData.posts.length > 0;
      if (!hasPosts) {
        polling = setInterval(async () => {
          const [d, qd] = await Promise.all([
            fetchFeed(undefined, personaFilter),
            fetchQuizzes(materialId),
          ]);
          if (qd.length > 0) setQuizzes(qd);
          if (d && d.posts.length > 0) {
            setPosts(d.posts);
            setNextCursor(d.nextCursor);
            if (polling) clearInterval(polling);
          }
        }, 2000);
      }
    }

    load();
    return () => {
      if (polling) clearInterval(polling);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushImpressions();
    };
  }, [materialId, personaFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    if (!nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    const data = await fetchFeed(nextCursor, personaFilter);
    if (data) {
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
    }
    setIsFetchingMore(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-cream">
        <Image src="/logo.png" alt="Scrollabus" width={160} height={87} className="mb-4 animate-pulse" />
        <p className="font-sans text-charcoal/60 text-sm">Loading your feed…</p>
      </div>
    );
  }

  if (posts.length === 0) {
    if (materialId) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-cream px-6 text-center pb-20">
          <Image src="/logo.png" alt="Scrollabus" width={160} height={87} className="mb-4" />
          <h2 className="font-display font-bold text-2xl text-charcoal mb-2">Nothing here yet</h2>
          <p className="font-sans text-charcoal/60 text-sm max-w-xs">
            Your personas are working on it. Check back in a moment…
          </p>
          <div className="flex gap-3 mt-6">
            {["lecture-bestie", "exam-gremlin", "problem-grinder"].map((slug, i) => (
              <div key={slug} className="animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>
                <PersonaSprite slug={slug} size={44} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return <EmptyFeedLanding />;
  }

  return (
    <>
      {/* Filter bar */}
      <div className="fixed top-0 left-0 right-0 z-20 pt-safe">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
          {/* All */}
          <button
            type="button"
            onClick={() => { setPersonaFilter(null); setQuizFilter(false); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all ${
              personaFilter === null && !quizFilter
                ? "bg-charcoal text-cream shadow-sm"
                : "bg-white/70 backdrop-blur-sm text-charcoal/70 border border-warm-200"
            }`}
          >
            All
          </button>

          {/* Quizzes */}
          <button
            type="button"
            onClick={() => { setQuizFilter((prev) => !prev); setPersonaFilter(null); }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all"
            style={quizFilter
              ? {
                  background: "linear-gradient(135deg, #8B6FD4, #5B8BD4)",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(139,111,212,0.4)",
                }
              : {
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(139,111,212,0.3)",
                  color: "#8B6FD4",
                }
            }
          >
            <span>🧠</span>
            <span>Quizzes</span>
            {quizzes.length > 0 && (
              <span
                className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
                style={quizFilter
                  ? { background: "rgba(255,255,255,0.3)", color: "white" }
                  : { background: "rgba(139,111,212,0.15)", color: "#8B6FD4" }
                }
              >
                {quizzes.length}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="shrink-0 w-px bg-warm-200 self-stretch my-1" />

          {/* Persona filters */}
          {PERSONA_CONFIG.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => { setPersonaFilter(personaFilter === p.slug ? null : p.slug); setQuizFilter(false); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all ${
                personaFilter === p.slug
                  ? "text-white shadow-sm"
                  : "bg-white/70 backdrop-blur-sm text-charcoal/70 border border-warm-200"
              }`}
              style={personaFilter === p.slug ? { backgroundColor: p.accentColor } : {}}
            >
              <span className="inline-flex items-center justify-center rounded-full overflow-hidden" style={{ width: 16, height: 16 }}>
                <PersonaSprite slug={p.slug} size={16} />
              </span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed: CSS snap scroll */}
      <div className="feed-container pb-16">
        {feedItems.map((item) =>
          item._type === "quiz" ? (
            <QuizCard
              key={`quiz-${item.data.id}`}
              quiz={item.data}
              onVisible={handleVisible}
            />
          ) : (
            <FeedCard
              key={`post-${item.data.id}`}
              post={item.data}
              onOpenComments={(postId, personaSlug) => {
                setActiveCommentPostId(postId);
                setActiveCommentPersonaSlug(personaSlug ?? null);
              }}
              onVisible={handleVisible}
              onPersonaClick={setActivePersonaSlug}
            />
          )
        )}

        {/* Load more trigger */}
        {nextCursor && (
          <div
            className="h-dvh flex items-center justify-center"
            style={{ scrollSnapAlign: "start" }}
            ref={(el) => {
              if (el) {
                const observer = new IntersectionObserver(
                  ([entry]) => { if (entry.isIntersecting) loadMore(); },
                  { threshold: 0.5 }
                );
                observer.observe(el);
                return () => observer.disconnect();
              }
            }}
          >
            {isFetchingMore ? (
              <Image src="/logo.png" alt="Scrollabus" width={100} height={55} className="animate-pulse" />
            ) : (
              <p className="font-sans text-charcoal/40 text-sm">Scroll for more…</p>
            )}
          </div>
        )}
      </div>

      {/* Comment sheet */}
      <CommentSheet
        postId={activeCommentPostId}
        personaSlug={activeCommentPersonaSlug}
        onClose={() => { setActiveCommentPostId(null); setActiveCommentPersonaSlug(null); }}
      />

      {/* Persona profile sheet */}
      <PersonaProfileSheet
        slug={activePersonaSlug}
        onClose={() => setActivePersonaSlug(null)}
      />
    </>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex flex-col items-center justify-center bg-cream">
        <Image src="/logo.png" alt="Scrollabus" width={160} height={87} className="mb-4 animate-pulse" />
        <p className="font-sans text-charcoal/60 text-sm">Loading your feed…</p>
      </div>
    }>
      <FeedContent />
    </Suspense>
  );
}
