"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { InterestsInput } from "./InterestsInput";
import { InterestsPills } from "./InterestsPills";
import { ExploreCard } from "./ExploreCard";
import { UserCard } from "./UserCard";
import type { TrendingPost, SimilarUser } from "@/lib/types";

const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 22 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export function EmptyFeedLanding() {
  const [savedInterests, setSavedInterests] = useState<string[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Load initial data
  useEffect(() => {
    async function init() {
      // Fetch current interests
      const interestsRes = await fetch("/api/profile/interests").catch(() => null);
      let currentInterests: string[] = [];
      if (interestsRes?.ok) {
        const json = await interestsRes.json();
        currentInterests = json.interests ?? [];
        setSavedInterests(currentInterests);
      }

      // Fetch trending posts (optionally filtered by interests)
      const interestsParam = currentInterests.length > 0
        ? `?interests=${encodeURIComponent(currentInterests.join(","))}`
        : "";
      const trendingRes = await fetch(`/api/explore${interestsParam}`).catch(() => null);
      if (trendingRes?.ok) {
        const json = await trendingRes.json();
        setTrendingPosts(json.posts ?? []);
      }
      setLoadingTrending(false);

      // Fetch community if interests exist
      if (currentInterests.length > 0) {
        fetchCommunity();
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCommunity() {
    setLoadingCommunity(true);
    const res = await fetch("/api/community").catch(() => null);
    if (res?.ok) {
      const json = await res.json();
      setSimilarUsers(json.users ?? []);
    }
    setLoadingCommunity(false);
  }

  async function handleInterestsSaved(interests: string[]) {
    setSavedInterests(interests);

    // Refetch trending posts filtered by new interests
    setLoadingTrending(true);
    const param = interests.length > 0
      ? `?interests=${encodeURIComponent(interests.join(","))}`
      : "";
    const res = await fetch(`/api/explore${param}`).catch(() => null);
    if (res?.ok) {
      const json = await res.json();
      setTrendingPosts(json.posts ?? []);
    }
    setLoadingTrending(false);

    // Refetch community
    fetchCommunity();
  }

  return (
    <div className="min-h-dvh bg-cream overflow-y-auto pb-32">
      <motion.div
        className="max-w-lg mx-auto px-5 pt-10 space-y-10"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={fadeUp} className="flex justify-center">
          <Image src="/logo.png" alt="Scrollabus" width={120} height={65} />
        </motion.div>

        {/* Interests section */}
        <motion.section variants={fadeUp} className="space-y-4">
          <div className="space-y-1">
            <h1 className="font-display font-bold text-3xl text-charcoal">
              What are you into?
            </h1>
            <p className="font-sans text-charcoal/60 text-sm">
              Drop your interests and we&apos;ll curate your vibe.
            </p>
          </div>

          <InterestsInput
            initialInterests={savedInterests}
            onSaved={handleInterestsSaved}
          />

          {savedInterests.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-sans font-semibold text-charcoal/40 uppercase tracking-wider">
                Your topics
              </p>
              <InterestsPills interests={savedInterests} size="md" />
            </div>
          )}
        </motion.section>

        {/* Divider */}
        <motion.div variants={fadeUp} className="border-t border-warm-200" />

        {/* Trending posts */}
        <motion.section variants={fadeUp} className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-2xl text-charcoal">
              See what&apos;s trending
            </h2>
            <p className="font-sans text-charcoal/50 text-sm">
              Top posts from the community
            </p>
          </div>

          {loadingTrending ? (
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[260px] h-[180px] rounded-3xl bg-warm-100 animate-pulse"
                />
              ))}
            </div>
          ) : trendingPosts.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-none">
              {trendingPosts.map((post) => (
                <ExploreCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="font-sans text-charcoal/40 text-sm italic">
              No posts yet — be the first to upload!
            </p>
          )}
        </motion.section>

        {/* Community section — only if interests are saved */}
        {savedInterests.length > 0 && (
          <>
            <motion.div variants={fadeUp} className="border-t border-warm-200" />

            <motion.section variants={fadeUp} className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-display font-bold text-2xl text-charcoal">
                  People on your wavelength
                </h2>
                <p className="font-sans text-charcoal/50 text-sm">
                  Others studying the same things
                </p>
              </div>

              {loadingCommunity ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 rounded-2xl bg-warm-100 animate-pulse" />
                  ))}
                </div>
              ) : similarUsers.length > 0 ? (
                <div className="space-y-3">
                  {similarUsers.slice(0, 5).map((u) => (
                    <UserCard
                      key={u.id}
                      user={u}
                      currentUserInterests={savedInterests}
                    />
                  ))}
                  {similarUsers.length > 5 && (
                    <Link
                      href="/community"
                      className="block text-center text-sm font-sans font-semibold text-lavender-deep py-2"
                    >
                      See {similarUsers.length - 5} more →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="font-sans text-charcoal/40 text-sm italic">
                  You&apos;re the first one here. That&apos;s kind of iconic.
                </p>
              )}
            </motion.section>
          </>
        )}

        {/* Divider */}
        <motion.div variants={fadeUp} className="border-t border-warm-200" />

        {/* CTA */}
        <motion.div variants={fadeUp} className="pb-4">
          <Link
            href="/upload"
            className="btn-gel btn-gel-dark block w-full text-center py-4 rounded-3xl text-base font-bold"
          >
            Upload your first notes →
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
