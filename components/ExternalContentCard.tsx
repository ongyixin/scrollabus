"use client";

import { useState } from "react";
import type { ExternalContent, SocialPlatform } from "@/lib/types";

// ─── Platform icons ───────────────────────────────────────────────────────────

function YouTubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

const PLATFORM_CONFIG: Record<SocialPlatform, {
  label: string;
  color: string;
  bgColor: string;
  Icon: React.FC<{ size?: number }>;
}> = {
  youtube: {
    label: "YouTube",
    color: "#FF0000",
    bgColor: "#FF000018",
    Icon: YouTubeIcon,
  },
  tiktok: {
    label: "TikTok",
    color: "#010101",
    bgColor: "#01010112",
    Icon: TikTokIcon,
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    bgColor: "#E1306C15",
    Icon: InstagramIcon,
  },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Embed modal ──────────────────────────────────────────────────────────────

function EmbedModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-charcoal shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="aspect-video">
          <iframe
            src={url}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

// ─── Card components ──────────────────────────────────────────────────────────

interface ExternalContentCardProps {
  item: ExternalContent;
  hero?: boolean;
}

export function ExternalContentCard({ item, hero = false }: ExternalContentCardProps) {
  const [showEmbed, setShowEmbed] = useState(false);
  const config = PLATFORM_CONFIG[item.platform] ?? PLATFORM_CONFIG.youtube;
  const { Icon } = config;
  const duration = formatDuration(item.duration_seconds);

  const isEmbeddable = item.platform === "youtube";
  const embedUrl = item.platform === "youtube"
    ? `https://www.youtube.com/embed/${item.external_id}?autoplay=1`
    : item.embed_url;

  function handleClick() {
    if (isEmbeddable) {
      setShowEmbed(true);
    } else {
      window.open(item.embed_url, "_blank", "noopener,noreferrer");
    }
  }

  if (hero) {
    return (
      <>
        <button
          onClick={handleClick}
          className="w-full text-left block rounded-4xl overflow-hidden relative group focus:outline-none"
          style={{
            boxShadow: `0 12px 48px ${config.color}20, inset 0 1px 0 rgba(255,255,255,0.7)`,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          {/* Thumbnail */}
          {item.thumbnail_url ? (
            <div className="relative w-full aspect-video overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail_url}
                alt={item.title ?? ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1" style={{ color: config.color }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Duration badge */}
              {duration && (
                <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/75 text-white text-[11px] font-mono font-bold">
                  {duration}
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-full aspect-video flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${config.bgColor}, ${config.color}25)` }}
            >
              <Icon size={48} />
            </div>
          )}

          {/* Content */}
          <div className="p-4 bg-white">
            {/* Author row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {item.author_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.author_avatar_url}
                    alt={item.author_name ?? ""}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: `${config.color}20`, color: config.color }}
                  >
                    <Icon size={14} />
                  </div>
                )}
                <span className="font-sans text-xs font-semibold text-charcoal/70 truncate max-w-[140px]">
                  {item.author_name ?? config.label}
                </span>
              </div>
              <span
                className="flex items-center gap-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full"
                style={{ background: config.bgColor, color: config.color }}
              >
                <Icon size={10} />
                {config.label}
              </span>
            </div>

            {/* Title */}
            {item.title && (
              <h3 className="font-display font-bold text-base text-charcoal leading-snug line-clamp-2 mb-2">
                {item.title}
              </h3>
            )}

            {/* Stats */}
            {item.view_count > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-sans text-charcoal/45">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>{formatCount(item.view_count)} views</span>
              </div>
            )}
          </div>
        </button>

        {showEmbed && (
          <EmbedModal url={embedUrl} onClose={() => setShowEmbed(false)} />
        )}
      </>
    );
  }

  // Compact grid card
  return (
    <>
      <button
        onClick={handleClick}
        className="w-full text-left flex flex-col rounded-3xl overflow-hidden group transition-transform active:scale-[0.97] focus:outline-none"
        style={{
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow: `0 4px 20px ${config.color}12, inset 0 1px 0 rgba(255,255,255,0.6)`,
        }}
      >
        {/* Thumbnail */}
        <div className="relative w-full aspect-video overflow-hidden">
          {item.thumbnail_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnail_url}
                alt={item.title ?? ""}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/85 flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5" style={{ color: config.color }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${config.bgColor}, ${config.color}20)` }}
            >
              <Icon size={28} />
            </div>
          )}

          {/* Platform badge */}
          <div
            className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
            style={{ background: `${config.color}cc`, color: "#fff" }}
          >
            <Icon size={8} />
            {config.label}
          </div>

          {/* Duration */}
          {duration && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-mono font-bold">
              {duration}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="p-2.5 flex flex-col gap-1 flex-1">
          {item.title && (
            <h3 className="font-display font-bold text-xs text-charcoal leading-snug line-clamp-2">
              {item.title}
            </h3>
          )}
          <div className="flex items-center gap-1 mt-auto pt-1">
            {item.author_name && (
              <p className="font-sans text-[10px] text-charcoal/50 truncate flex-1">
                {item.author_name}
              </p>
            )}
            {item.view_count > 0 && (
              <span className="text-[9px] font-sans text-charcoal/40 shrink-0">
                {formatCount(item.view_count)}
              </span>
            )}
          </div>
        </div>
      </button>

      {showEmbed && (
        <EmbedModal url={embedUrl} onClose={() => setShowEmbed(false)} />
      )}
    </>
  );
}
