"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { InterestsInput } from "@/components/InterestsInput";
import { InterestsPills } from "@/components/InterestsPills";
import { UserCard } from "@/components/UserCard";
import type { SimilarUser } from "@/lib/types";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function CommunityPage() {
  const [users, setUsers] = useState<SimilarUser[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditInterests, setShowEditInterests] = useState(false);

  useEffect(() => {
    loadData(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData(filter: string | null) {
    setIsLoading(true);
    const param = filter ? `?interest=${encodeURIComponent(filter)}` : "";
    const res = await fetch(`/api/community${param}`).catch(() => null);
    if (res?.ok) {
      const json = await res.json();
      setUsers(json.users ?? []);
      setUserInterests(json.userInterests ?? []);
    }
    setIsLoading(false);
  }

  function handleFilterClick(interest: string) {
    const newFilter = activeFilter === interest ? null : interest;
    setActiveFilter(newFilter);
    loadData(newFilter);
  }

  function handleInterestsSaved(interests: string[]) {
    setUserInterests(interests);
    setShowEditInterests(false);
    setActiveFilter(null);
    loadData(null);
  }

  return (
    <div className="min-h-dvh bg-cream pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-cream/90 backdrop-blur-md border-b border-warm-200 px-5 pt-safe">
        <div className="max-w-lg mx-auto py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-charcoal">Community</h1>
            <p className="font-sans text-charcoal/50 text-sm mt-0.5">People on your wavelength</p>
          </div>
          <button
            onClick={() => setShowEditInterests((v) => !v)}
            className="text-xs font-sans font-semibold text-lavender-deep bg-lavender/20 px-3 py-1.5 rounded-full hover:bg-lavender/40 transition-colors"
          >
            {showEditInterests ? "Done" : "Edit interests"}
          </button>
        </div>

        {/* Your interests pills + filter */}
        {userInterests.length > 0 && !showEditInterests && (
          <div className="max-w-lg mx-auto pb-3">
            <p className="text-[10px] font-sans font-semibold text-charcoal/40 uppercase tracking-wider mb-2">
              Filter by topic
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5">
              <button
                onClick={() => handleFilterClick(activeFilter ?? "")}
                className={`flex-shrink-0 text-xs font-sans font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  activeFilter === null
                    ? "bg-charcoal text-cream"
                    : "bg-warm-100 text-charcoal/60 hover:bg-warm-200"
                }`}
              >
                All
              </button>
              {userInterests.map((interest) => (
                <button
                  key={interest}
                  onClick={() => handleFilterClick(interest)}
                  className={`flex-shrink-0 text-xs font-sans font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    activeFilter === interest
                      ? "bg-lavender-deep text-white"
                      : "bg-lavender/20 text-lavender-deep hover:bg-lavender/40"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pt-5 space-y-5">
        {/* Edit interests inline */}
        {showEditInterests && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 border border-warm-200 rounded-3xl p-5 shadow-soft space-y-3"
          >
            <h2 className="font-display font-bold text-lg text-charcoal">Your interests</h2>
            <InterestsInput
              initialInterests={userInterests}
              onSaved={handleInterestsSaved}
            />
          </motion.div>
        )}

        {/* No interests CTA */}
        {!isLoading && userInterests.length === 0 && !showEditInterests && (
          <div className="flex flex-col items-center text-center py-16 gap-4">
            <Image src="/logo.png" alt="Scrollabus" width={80} height={44} className="opacity-40" />
            <p className="font-sans text-charcoal/50 text-sm max-w-xs">
              Add your interests to discover people studying the same things.
            </p>
            <button
              onClick={() => setShowEditInterests(true)}
              className="bg-lavender-deep text-white font-sans font-semibold text-sm px-5 py-2.5 rounded-2xl hover:bg-lavender-deep/90 transition-colors"
            >
              Add interests
            </button>
          </div>
        )}

        {/* User list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-warm-100 animate-pulse" />
            ))}
          </div>
        ) : users.length > 0 ? (
          <motion.div
            className="space-y-3"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {users.map((user) => (
              <motion.div key={user.id} variants={fadeUp}>
                <UserCard user={user} currentUserInterests={userInterests} />
              </motion.div>
            ))}
          </motion.div>
        ) : userInterests.length > 0 ? (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <p className="font-sans text-charcoal/40 text-sm italic">
              {activeFilter
                ? `No one else is studying "${activeFilter}" yet.`
                : "You're the first one here. That's kind of iconic."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
