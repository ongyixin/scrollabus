"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ExploreCard } from "@/components/ExploreCard";
import { ExternalContentCard } from "@/components/ExternalContentCard";
import { Sparkle, Squiggle } from "@/components/Decorations";
import { PersonaSprite } from "@/components/PersonaSprites";
import type { TrendingPost, ExternalContent, Persona } from "@/lib/types";

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDbContent, setSearchDbContent] = useState<ExternalContent[]>([]);
  const [searchLiveContent, setSearchLiveContent] = useState<ExternalContent[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [youtubeEnabled, setYoutubeEnabled] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Community personas state
  const [communityPersonas, setCommunityPersonas] = useState<Persona[]>([]);
  const [myPersonaSlugs, setMyPersonaSlugs] = useState<Set<string>>(new Set());
  const [addingPersonaSlug, setAddingPersonaSlug] = useState<string | null>(null);

  // Shared
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const [interestsRes, personasRes] = await Promise.all([
        fetch("/api/profile/interests").catch(() => null),
        fetch("/api/personas").catch(() => null),
      ]);
      let interests: string[] = [];
      if (interestsRes?.ok) {
        const json = await interestsRes.json();
        interests = json.interests ?? [];
        setUserInterests(interests);
      }
      if (personasRes?.ok) {
        const json = await personasRes.json();
        const personas: Persona[] = json.personas ?? [];
        // Public community personas = custom (created_by not null) + public
        const publicCustom = personas.filter((p) => p.created_by !== null && p.is_public);
        setCommunityPersonas(publicCustom);
        // Track which ones the user already has enabled (own or follows)
        const profileRes = await fetch("/api/profile").catch(() => null);
        if (profileRes?.ok) {
          const pj = await profileRes.json();
          const enabled: string[] = pj.profile?.enabled_personas ?? [];
          setMyPersonaSlugs(new Set(enabled));
        }
      }
      await loadCommunityPosts(interests, null);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search effect
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const q = searchQuery.trim();
    if (!q) {
      setSearchDbContent([]);
      setSearchLiveContent([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await fetch(`/api/explore/search?q=${encodeURIComponent(q)}`).catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        setSearchDbContent(json.dbContent ?? []);
        setSearchLiveContent(json.liveContent ?? []);
        if (typeof json.youtubeEnabled === "boolean") {
          setYoutubeEnabled(json.youtubeEnabled);
        }
      }
      setSearchLoading(false);
    }, 450);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  async function loadCommunityPosts(interests: string[], filter: string | null) {
    setCommunityLoading(true);
    const interestsToUse = filter ? [filter] : interests;
    const param =
      interestsToUse.length > 0
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
    const interestsToUse = filter ? [filter] : [];
    const param =
      interestsToUse.length > 0
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
    setSearchQuery("");
    if (tab === "social" && !socialFetched) {
      loadSocialContent(userInterests, null);
    }
  }

  async function addPersonaToMyList(slug: string) {
    setAddingPersonaSlug(slug);
    const next = new Set(myPersonaSlugs).add(slug);
    const slugArray = Array.from(next);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_personas: slugArray }),
      });
      if (res.ok) {
        setMyPersonaSlugs(next);
      }
    } catch {
      // silently fail
    } finally {
      setAddingPersonaSlug(null);
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

  // Community search: client-side filter
  const filteredPosts =
    searchQuery.trim()
      ? posts.filter(
          (p) =>
            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.body?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : posts;

  const isTabLoading = activeTab === "community" ? communityLoading : socialLoading;
  const heroPost = filteredPosts[0] ?? null;
  const gridPosts = filteredPosts.slice(1);
  const heroExternal = externalContent[0] ?? null;
  const gridExternal = externalContent.slice(1);

  const isSearchActive = searchQuery.trim().length > 0;

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

          {/* Search bar */}
          <div className="mt-3 relative">
            <div
              className="flex items-center gap-2.5 bg-warm-100 rounded-2xl px-3.5 py-2.5 transition-shadow"
              style={
                isSearchActive
                  ? { boxShadow: "0 0 0 2px rgba(155,133,206,0.4)" }
                  : {}
              }
            >
              {searchLoading ? (
                <div className="w-3.5 h-3.5 shrink-0 border-2 border-charcoal/30 border-t-charcoal/60 rounded-full animate-spin" />
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-charcoal/40 shrink-0"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              )}
              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  activeTab === "social"
                    ? "Search YouTube, TikTok…"
                    : "Search community posts…"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm font-sans text-charcoal placeholder:text-charcoal/35 outline-none"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="shrink-0 w-5 h-5 rounded-full bg-charcoal/15 flex items-center justify-center text-charcoal/50 hover:bg-charcoal/25 transition-colors"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Interest filter chips — hidden when search is active */}
        {userInterests.length > 0 && !isSearchActive && (
          <div className="pb-3 flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5">
            <button
              onClick={() => handleFilterClick(activeFilter ?? "")}
              className={`flex-shrink-0 text-xs font-sans font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                activeFilter === null
                  ? "bg-charcoal text-cream shadow-sm"
                  : "bg-warm-100 text-charcoal/60 hover:bg-warm-200"
              }`}
              style={
                activeFilter === null
                  ? {
                      boxShadow:
                        "0 2px 8px rgba(45,41,38,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                    }
                  : {}
              }
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
                style={
                  activeFilter === interest
                    ? {
                        background: "linear-gradient(135deg, #C9B8E8, #9B85CE)",
                        boxShadow:
                          "0 2px 8px rgba(155,133,206,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
                      }
                    : {}
                }
              >
                {interest}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pt-5">
        {/* ── Search results (social tab) ── */}
        {isSearchActive && activeTab === "social" ? (
          <SearchResults
            query={searchQuery}
            dbContent={searchDbContent}
            liveContent={searchLiveContent}
            loading={searchLoading}
            youtubeEnabled={youtubeEnabled}
          />
        ) : isSearchActive && activeTab === "community" ? (
          /* ── Search results (community tab) ── */
          communityLoading ? (
            <LoadingSkeleton />
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              filter={null}
              message={`No posts matching "${searchQuery}"`}
            />
          ) : (
            <motion.div
              className="space-y-4"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              <SectionHeader
                label={`${filteredPosts.length} result${filteredPosts.length !== 1 ? "s" : ""}`}
                icon={<MagnifyIcon />}
              />
              <div className="grid grid-cols-2 gap-3">
                {filteredPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    variants={fadeUp}
                    transition={{
                      duration: 0.4,
                      ease: [0.34, 1.56, 0.64, 1],
                      delay: i * 0.04,
                    }}
                  >
                    <ExploreCard post={post} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        ) : isTabLoading ? (
          <LoadingSkeleton />
        ) : activeTab === "community" ? (
          /* ── Community tab ── */
          <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
            {/* Community Personas section */}
            {communityPersonas.length > 0 && (
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.35 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-charcoal/50">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                    Community Personas
                  </span>
                  <Squiggle color="#EDE0CC" width={50} />
                </div>
                <div className="space-y-2">
                  {communityPersonas.map((p) => {
                    const alreadyAdded = myPersonaSlugs.has(p.slug);
                    const isAdding = addingPersonaSlug === p.slug;
                    return (
                      <div
                        key={p.slug}
                        className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-warm-200 shadow-soft"
                        style={{ borderLeft: `3px solid ${p.accent_color}` }}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-2 ring-white"
                          style={{ backgroundColor: p.accent_color + "25" }}
                        >
                          <PersonaSprite slug={p.slug} size={40} emoji={p.emoji} accentColor={p.accent_color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans font-semibold text-sm text-charcoal leading-tight truncate">
                            {p.name}
                          </p>
                          <p
                            className="font-sans text-xs font-medium mt-0.5 truncate"
                            style={{ color: p.accent_color }}
                          >
                            {p.role_tag}
                          </p>
                          {p.description && (
                            <p className="font-sans text-xs text-charcoal/50 mt-1 leading-snug line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded || isAdding}
                          onClick={() => addPersonaToMyList(p.slug)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all active:scale-95 disabled:cursor-default ${
                            alreadyAdded
                              ? "bg-warm-200 text-charcoal/40"
                              : "text-white"
                          }`}
                          style={
                            !alreadyAdded
                              ? { backgroundColor: p.accent_color }
                              : {}
                          }
                        >
                          {isAdding ? "…" : alreadyAdded ? "Added" : "+ Add"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {posts.length === 0 ? (
              <EmptyState
                filter={activeFilter}
                message={
                  activeFilter
                    ? `No posts about "${activeFilter}" yet.`
                    : "Be the first to upload!"
                }
              />
            ) : (
              <motion.div
                className="space-y-4"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
              {heroPost && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
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
                    transition={{
                      duration: 0.4,
                      ease: [0.34, 1.56, 0.64, 1],
                      delay: i * 0.04,
                    }}
                  >
                    <ExploreCard post={post} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
            )}
          </motion.div>
        ) : (
          /* ── Social tab ── */
          externalContent.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              message={
                activeFilter
                  ? `No social content about "${activeFilter}" yet.`
                  : "No social content ingested yet."
              }
              social
            />
          ) : (
            <motion.div
              className="space-y-4"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {heroExternal && (
                <motion.div
                  variants={fadeUp}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
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
                    transition={{
                      duration: 0.4,
                      ease: [0.34, 1.56, 0.64, 1],
                      delay: i * 0.04,
                    }}
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

// ─── Search results component (social tab) ────────────────────────────────────

function SearchResults({
  query,
  dbContent,
  liveContent,
  loading,
  youtubeEnabled,
}: {
  query: string;
  dbContent: ExternalContent[];
  liveContent: ExternalContent[];
  loading: boolean;
  youtubeEnabled: boolean;
}) {
  if (loading) return <LoadingSkeleton />;

  const hasAnyResults = dbContent.length > 0 || liveContent.length > 0;

  if (!hasAnyResults) {
    return (
      <EmptyState
        filter={null}
        message={
          youtubeEnabled
            ? `No results for "${query}"`
            : `No results for "${query}". Add a YouTube API key to search live videos.`
        }
        social
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Live YouTube results */}
      {liveContent.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="visible"
        >
          <SectionHeader
            label="Live from YouTube"
            icon={<YouTubeBadgeIcon />}
            accent="#FF0000"
          />
          <div className="grid grid-cols-2 gap-3">
            {liveContent.map((item, i) => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.04 }}
              >
                <ExternalContentCard item={item} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Supabase library matches */}
      {dbContent.length > 0 && (
        <motion.div
          className="space-y-3"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="visible"
        >
          <SectionHeader label="In your library" icon={<LibraryIcon />} />
          <div className="grid grid-cols-2 gap-3">
            {dbContent.map((item, i) => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.04 }}
              >
                <ExternalContentCard item={item} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {!youtubeEnabled && (
        <p className="text-center text-[11px] font-sans text-charcoal/35 pb-2">
          Add <code className="font-mono">YOUTUBE_API_KEY</code> to enable live YouTube search
        </p>
      )}
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  icon,
  accent,
}: {
  label: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span style={accent ? { color: accent } : {}} className="text-charcoal/50">
        {icon}
      </span>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
        {label}
      </span>
      <Squiggle color="#EDE0CC" width={50} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[200px] rounded-4xl bg-warm-100 animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[180px] rounded-3xl bg-warm-100 animate-pulse" />
        ))}
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
      <Image
        src="/logo.png"
        alt="Scrollabus"
        width={80}
        height={44}
        className="opacity-40"
      />
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

function MagnifyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function YouTubeBadgeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
