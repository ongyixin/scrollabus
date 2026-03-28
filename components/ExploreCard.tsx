"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TrendingPost } from "@/lib/types";
import { PersonaSprite } from "./PersonaSprites";
import { Sparkle } from "./Decorations";

const POST_TYPE_LABELS: Record<string, string> = {
  concept: "Concept",
  example: "Example",
  trap: "Common Trap",
  review: "Review",
  recap: "Recap",
};

interface ExploreCardProps {
  post: TrendingPost;
  hero?: boolean;
}

export function ExploreCard({ post, hero = false }: ExploreCardProps) {
  const persona = post.persona;
  const accentColor = persona?.accent_color ?? "#C9B8E8";

  if (hero) {
    return (
      <Link
        href={`/feed?material_id=${post.material_id ?? ""}`}
        className="block rounded-4xl overflow-hidden relative group"
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.95) 0%, ${accentColor}30 100%)`,
          border: `1px solid ${accentColor}45`,
          boxShadow: `0 12px 48px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,0.7)`,
        }}
      >
        {/* Gradient header stripe */}
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
          }}
        />

        <div className="p-5 flex flex-col gap-3">
          {/* Persona row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center relative"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}60)`,
                  boxShadow: `0 4px 12px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.5)`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-2xl" />
                <PersonaSprite slug={persona?.slug ?? ""} size={36} />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-charcoal leading-tight">
                  {persona?.name ?? "Community"}
                </p>
                <p className="font-mono text-[10px] font-semibold" style={{ color: accentColor }}>
                  {persona?.role_tag ?? ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkle size={10} color={accentColor} delay={0} className="opacity-70" />
              <span
                className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: `${accentColor}25`,
                  color: accentColor,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
              </span>
            </div>
          </div>

          {/* Title */}
          {post.title && (
            <h3 className="font-display font-bold text-lg text-charcoal leading-snug">
              {post.title}
            </h3>
          )}

          {/* Body */}
          <p className="font-sans text-sm text-charcoal/65 leading-relaxed line-clamp-3">
            {post.body}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 pt-1 border-t border-warm-100 mt-1">
            <span className="flex items-center gap-1.5 text-[11px] font-sans text-charcoal/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <span>{post.save_count} saves</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-sans text-charcoal/50">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{post.comment_count} replies</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Standard compact card
  return (
    <Link
      href={`/feed?material_id=${post.material_id ?? ""}`}
      className="flex flex-col rounded-3xl overflow-hidden group transition-transform active:scale-[0.97]"
      style={{
        background: `linear-gradient(145deg, rgba(255,255,255,0.92) 0%, ${accentColor}20 100%)`,
        border: `1px solid ${accentColor}35`,
        boxShadow: `0 4px 20px ${accentColor}18, inset 0 1px 0 rgba(255,255,255,0.6)`,
      }}
    >
      {/* Gradient header */}
      <div
        className="px-3 pt-3 pb-2.5 flex items-center gap-2 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accentColor}35 0%, ${accentColor}18 100%)`,
          borderBottom: `1px solid ${accentColor}25`,
        }}
      >
        {/* Glossy sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

        <div
          className="w-7 h-7 rounded-xl overflow-hidden flex items-center justify-center relative shrink-0"
          style={{ background: `${accentColor}50` }}
        >
          <PersonaSprite slug={persona?.slug ?? ""} size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wide truncate" style={{ color: accentColor }}>
            {persona?.role_tag ?? persona?.name ?? "Persona"}
          </p>
        </div>
        <span
          className="shrink-0 text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${accentColor}30`, color: accentColor }}
        >
          {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
        </span>
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {post.title && (
          <h3 className="font-display font-bold text-sm text-charcoal leading-snug line-clamp-2">
            {post.title}
          </h3>
        )}
        <p className="font-sans text-xs text-charcoal/60 leading-relaxed line-clamp-3 flex-1">
          {post.body}
        </p>

        <div className="flex items-center gap-2.5 mt-auto pt-1.5 border-t border-warm-100/80">
          <span className="flex items-center gap-1 text-[10px] font-sans text-charcoal/40">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-60">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {post.save_count}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-sans text-charcoal/40">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {post.comment_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
