"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExploreCard } from "@/components/ExploreCard";
import { ExternalContentCard } from "@/components/ExternalContentCard";
import { Sparkle, Squiggle } from "@/components/Decorations";
import type { TrendingPost, ExternalContent } from "@/lib/types";

const fadeUp = {
  hidden: { opacity: 0, y: 20, rotate: -1 },
  visible: { opacity: 1, y: 0, rotate: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

type Tab = "community" | "social";

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<Tab>("community");

  // Community state
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(true);

  // Social state
  const [externalContent, setExternalContent] = useState<ExternalContent[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialFetched, setSocialFetched] = useState(false);

  // Shared
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const interestsRes = await fetch("/api/profile/interests").catch(() => null);
      let interests: string[] = [];
      if (interestsRes?.ok) {
        const json = await interestsRes.json();
        interests = json.interests ?? [];
        setUserInterests(interests);
      }
      await loadCommunityPosts(interests, null);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCommunityPosts(interests: string[], filter: string | null) {
    setCommunityLoading(true);
    const interestsToUse = filter ? [filter] : interests;
    const param = interestsToUse.length > 0
      ? `?interests=${encodeURIComponent(interestsToUse.join(","))}&limit=40`
      : "?limit=40";
    const res = await fetch(`/api/explore${param}`).catch(() => null);
    if (res?.ok) {
      const json = await res.json();
      setPosts(json.posts ?? []);
    }
    setCommunityLoading(false);
  }

  async function loadSocialContent(interests: string[], filter: string | null) {
    setSocialLoading(true);
    // Only filter by interest when a specific chip is selected; show all content by default
    const interestsToUse = filter ? [filter] : [];
    const param = interestsToUse.length > 0
      ? `?interests=${encodeURIComponent(interestsToUse.join(","))}&limit=40`
      : "?limit=40";
    const res = await fetch(`/api/explore/external${param}`).catch(() => null);
    if (res?.ok) {
      const json = await res.json();
      setExternalContent(json.content ?? []);
    }
    setSocialLoading(false);
    setSocialFetched(true);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setActiveFilter(null);
    if (tab === "social" && !socialFetched) {
      loadSocialContent(userInterests, null);
    }
  }

  async function handleFilterClick(interest: string) {
    const newFilter = activeFilter === interest ? null : interest;
    setActiveFilter(newFilter);
    if (activeTab === "community") {
      await loadCommunityPosts(userInterests, newFilter);
    } else {
      await loadSocialContent(userInterests, newFilter);
    }
  }

  const isLoading = activeTab === "community" ? communityLoading : socialLoading;
  const heroPost = posts[0] ?? null;
  const gridPosts = posts.slice(1);
  const heroExternal = externalContent[0] ?? null;
  const gridExternal = externalContent.slice(1);

  return (
    <div className="min-h-dvh bg-cream pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream/90 backdrop-blur-md border-b border-warm-200 px-5 pt-safe">
        <div className="max-w-lg mx-auto py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-bold text-2xl text-charcoal leading-tight">
                Explore
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="font-sans text-charcoal/50 text-sm">
                  {activeTab === "community"
                    ? "Trending across the community"
                    : "From YouTube & TikTok"}
                </p>
                <Sparkle size={10} color="#C9B8E8" delay={0} className="opacity-70" />
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-3 bg-warm-100 rounded-2xl p-1">
            <button
              onClick={() => handleTabChange("community")}
              className={`flex-1 text-xs font-sans font-bold py-2 px-3 rounded-xl transition-all ${
                activeTab === "community"
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-charcoal/50 hover:text-charcoal/70"
              }`}
            >
              Community
            </button>
            <button
              onClick={() => handleTabChange("social")}
              className={`flex-1 text-xs font-sans font-bold py-2 px-3 rounded-xl transition-all ${
                activeTab === "social"
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-charcoal/50 hover:text-charcoal/70"
              }`}
            >
              Social
            </button>
          </div>
        </div>

        {/* Interest filter chips */}
        {userInterests.length > 0 && (
          <div className="pb-3 flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5">
            <button
              onClick={() => handleFilterClick(activeFilter ?? "")}
              className={`flex-shrink-0 text-xs font-sans font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                activeFilter === null
                  ? "bg-charcoal text-cream shadow-sm"
                  : "bg-warm-100 text-charcoal/60 hover:bg-warm-200"
              }`}
              style={activeFilter === null ? {
                boxShadow: "0 2px 8px rgba(45,41,38,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              } : {}}
            >
              All
            </button>
            {userInterests.map((interest) => (
              <button
                key={interest}
                onClick={() => handleFilterClick(interest)}
                className={`flex-shrink-0 text-xs font-sans font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                  activeFilter === interest
                    ? "text-white shadow-sm"
                    : "bg-lavender/20 text-lavender-deep hover:bg-lavender/40"
                }`}
                style={activeFilter === interest ? {
                  background: "linear-gradient(135deg, #C9B8E8, #9B85CE)",
                  boxShadow: "0 2px 8px rgba(155,133,206,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                } : {}}
              >
                {interest}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pt-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-[200px] rounded-4xl bg-warm-100 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[180px] rounded-3xl bg-warm-100 animate-pulse" />
              ))}
            </div>
          </div>
        ) : activeTab === "community" ? (
          /* ── Community tab ── */
          posts.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              message={activeFilter ? `No posts about "${activeFilter}" yet.` : "Be the first to upload!"}
            />
          ) : (
            <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="visible">
              {heroPost && (
                <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkle size={12} color="#C9B8E8" delay={0} />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                      Top Pick
                    </span>
                    <Squiggle color="#EDE0CC" width={60} />
                  </div>
                  <ExploreCard post={heroPost} hero />
                </motion.div>
              )}

              {gridPosts.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-3 pt-2"
                >
                  <h2 className="font-display font-bold text-lg text-charcoal whitespace-nowrap">
                    More to explore
                  </h2>
                  <Squiggle color="#EDE0CC" width={80} className="flex-1" />
                  <Sparkle size={10} color="#9B85CE" delay={0.4} className="opacity-60" />
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {gridPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    variants={fadeUp}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.04 }}
                  >
                    <ExploreCard post={post} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        ) : (
          /* ── Social tab ── */
          externalContent.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              message={activeFilter ? `No social content about "${activeFilter}" yet.` : "No social content ingested yet."}
              social
            />
          ) : (
            <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="visible">
              {heroExternal && (
                <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkle size={12} color="#FF0000" delay={0} />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                      Featured
                    </span>
                    <Squiggle color="#EDE0CC" width={60} />
                  </div>
                  <ExternalContentCard item={heroExternal} hero />
                </motion.div>
              )}

              {gridExternal.length > 0 && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-3 pt-2"
                >
                  <h2 className="font-display font-bold text-lg text-charcoal whitespace-nowrap">
                    More videos
                  </h2>
                  <Squiggle color="#EDE0CC" width={80} className="flex-1" />
                  <Sparkle size={10} color="#9B85CE" delay={0.4} className="opacity-60" />
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {gridExternal.map((item, i) => (
                  <motion.div
                    key={item.id}
                    variants={fadeUp}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.04 }}
                  >
                    <ExternalContentCard item={item} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({
  filter,
  message,
  social = false,
}: {
  filter: string | null;
  message: string;
  social?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <Image src="/logo.png" alt="Scrollabus" width={80} height={44} className="opacity-40" />
      <div className="space-y-1">
        <p className="font-display font-bold text-lg text-charcoal/50">
          {social ? "Nothing here yet" : "Nothing trending yet"}
        </p>
        <p className="font-sans text-charcoal/40 text-sm">{message}</p>
      </div>
      <Squiggle color="#EDE0CC" width={120} />
    </div>
  );
}
