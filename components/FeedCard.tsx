"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { Post } from "@/lib/types";
import { PersonaBadge } from "./PersonaBadge";
import { ActionBar } from "./ActionBar";
import { PostTypeTag } from "./PostTypeTag";
import { Sparkle, SparkleCluster } from "./Decorations";
import { SaveCategorySheet } from "./SaveCategorySheet";

interface FeedCardProps {
  post: Post;
  onOpenComments: (postId: string, personaSlug?: string) => void;
  onVisible: (postId: string, durationMs: number) => void;
  onPersonaClick?: (slug: string) => void;
}

// ─── Media sub-components ────────────────────────────────────────────────────

function ImageMedia({ url, title }: { url: string; title: string | null }) {
  return (
    <div className="relative w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={title ?? "Generated image"}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Softer gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
    </div>
  );
}

function VideoMedia({ url, isVisible }: { url: string; isVisible: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isVisible) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isVisible]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        src={url}
        muted={muted}
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute top-16 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-lg shadow-soft"
        aria-label={muted ? "Unmute video" : "Mute video"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}

function AudioMedia({ url, title, accentColor }: { url: string; title: string | null; accentColor: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState(false);

  function togglePlay() {
    const a = audioRef.current;
    if (!a || loadError) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          setLoadError(true);
        });
    }
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnded = () => setPlaying(false);
    const onTimeUpdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onError = () => { setPlaying(false); setLoadError(true); };
    a.addEventListener("ended", onEnded);
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("error", onError);
    };
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-8 gap-8 relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, #FFF8F0 0%, ${accentColor}28 100%)` }}
    >
      {/* Decorative background sparkles */}
      <Sparkle size={20} color={accentColor} delay={0}   className="absolute top-16 left-8 opacity-50" />
      <Sparkle size={12} color={accentColor} delay={0.6} className="absolute top-24 right-12 opacity-40" />
      <Sparkle size={16} color={accentColor} delay={1.2} className="absolute bottom-32 left-16 opacity-45" />

      {/* Album art */}
      <motion.div
        className="w-48 h-48 rounded-4xl shadow-card-hover flex items-center justify-center text-7xl relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}70)` }}
        animate={playing ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Glossy highlight on album art */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-4xl" />
        🎵
      </motion.div>

      {title && (
        <p className="font-display font-bold text-xl text-charcoal text-center leading-tight">
          {title}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full h-2 bg-warm-200 rounded-full overflow-hidden shadow-soft">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accentColor }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Play/pause button — gel style */}
      {loadError ? (
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white relative overflow-hidden opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            <span>⚠️</span>
          </div>
          <p className="text-xs text-warm-500">Unable to play audio</p>
        </div>
      ) : (
        <motion.button
          type="button"
          onClick={togglePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white relative overflow-hidden"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 4px 20px ${accentColor}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          aria-label={playing ? "Pause" : "Play"}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-full" />
          <span className="relative z-10">{playing ? "⏸" : "▶️"}</span>
        </motion.button>
      )}

      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  );
}

// ─── Pull-quote text rendering ────────────────────────────────────────────────

function TtsButton({
  isSpeaking,
  onTts,
  accentColor,
}: {
  isSpeaking: boolean;
  onTts: () => void;
  accentColor: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onTts}
      aria-label={isSpeaking ? "Stop reading" : "Listen to post"}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all duration-300"
      style={isSpeaking ? {
        background: `linear-gradient(135deg, ${accentColor}dd, ${accentColor})`,
        boxShadow: `0 2px 10px ${accentColor}60`,
        border: `1px solid ${accentColor}80`,
      } : {
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0 2px 8px rgba(26,22,18,0.08)",
      }}
    >
      {isSpeaking ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
          <rect x="5" y="5" width="5" height="14" rx="1" />
          <rect x="14" y="5" width="5" height="14" rx="1" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: accentColor }}>
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
      <span
        className="text-xs font-sans font-semibold leading-none"
        style={{ color: isSpeaking ? "white" : accentColor }}
      >
        {isSpeaking ? "Stop" : "Listen"}
      </span>
    </motion.button>
  );
}

function TextContent({
  title,
  body,
  accentColor,
  isTrap,
  isSpeaking,
  onTts,
}: {
  title: string | null;
  body: string;
  accentColor: string;
  isTrap: boolean;
  isSpeaking: boolean;
  onTts: () => void;
}) {
  const isShortQuote = !title && body.length < 120;

  if (isShortQuote) {
    return (
      <div className="flex-1 px-5 pb-4 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative rounded-4xl p-7 overflow-hidden"
          style={{
            background: `linear-gradient(145deg, rgba(255,255,255,0.92), ${accentColor}22)`,
            border: `1px solid ${accentColor}40`,
            boxShadow: `0 8px 32px ${accentColor}25, inset 0 1px 0 rgba(255,255,255,0.7)`,
          }}
        >
          {/* Glossy top sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-4xl" />

          {/* Decorative quote mark */}
          <div
            className="absolute top-3 left-5 font-display text-7xl leading-none opacity-10 select-none pointer-events-none"
            style={{ color: accentColor }}
          >
            &ldquo;
          </div>

          {/* Sparkle accent */}
          <Sparkle size={14} color={accentColor} delay={0.3} className="absolute top-4 right-5 opacity-70" />

          <p className="relative z-10 font-display font-bold text-2xl text-charcoal leading-snug italic pt-2 pb-6">
            {body}
          </p>

          <TtsButton isSpeaking={isSpeaking} onTts={onTts} accentColor={accentColor} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4 flex flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative rounded-3xl p-6 overflow-hidden"
        style={isTrap ? {
          background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,220,216,0.4))",
          border: "1px solid rgba(212,84,74,0.35)",
          borderLeft: "4px solid #D4544A",
          boxShadow: "0 8px 32px rgba(212,84,74,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
        } : {
          background: `linear-gradient(145deg, rgba(255,255,255,0.92), ${accentColor}18)`,
          border: `1px solid ${accentColor}35`,
          boxShadow: `0 8px 32px ${accentColor}18, inset 0 1px 0 rgba(255,255,255,0.7)`,
        }}
      >
        {/* Glossy top sheen */}
        <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/30 to-transparent rounded-t-3xl pointer-events-none" />

        {/* Accent dot + sparkle cluster */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full opacity-50"
            style={{ backgroundColor: accentColor }}
          />
          <Sparkle size={10} color={accentColor} delay={0.5} className="opacity-60" />
        </div>

        {title && (
          <h2 className={`relative z-10 font-display font-bold text-charcoal leading-tight mb-3 ${
            title.length < 40 ? "text-2xl" : "text-xl"
          }`}>
            {title}
          </h2>
        )}

        <div className="relative z-10 font-sans text-charcoal/85 text-base leading-relaxed whitespace-pre-wrap pb-7">
          {body}
        </div>

        <TtsButton isSpeaking={isSpeaking} onTts={onTts} accentColor={accentColor} />
      </motion.div>
    </div>
  );
}

// ─── Main FeedCard ────────────────────────────────────────────────────────────

export function FeedCard({ post, onOpenComments, onVisible, onPersonaClick }: FeedCardProps) {
  const [isSaved, setIsSaved] = useState(post.is_saved ?? false);
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [saveCategoryOpen, setSaveCategoryOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [isVisible, setIsVisible] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const entryTimeRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          entryTimeRef.current = Date.now();
        } else if (entryTimeRef.current !== null) {
          const duration = Date.now() - entryTimeRef.current;
          onVisible(post.id, duration);
          entryTimeRef.current = null;
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id, onVisible]);

  // Opens the category picker; actual save happens in the sheet
  const handleSave = useCallback(() => {
    setSaveCategoryOpen(true);
  }, []);

  const handleLike = useCallback(async () => {
    const next = !isLiked;
    setIsLiked(next);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      const json = await res.json();
      setIsLiked(json.liked);
    } catch {
      setIsLiked(!next);
    }
  }, [isLiked, post.id]);

  const handleComment = useCallback(() => {
    onOpenComments(post.id, post.persona?.slug);
  }, [onOpenComments, post.id, post.persona?.slug]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleTts = useCallback(async () => {
    // Stop if already playing
    if (isSpeaking) {
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      const text = [post.title, post.body].filter(Boolean).join(". ");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("TTS request failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setIsSpeaking(false);
      };

      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }, [isSpeaking, post.title, post.body]);

  // Stop TTS when card scrolls out of view
  useEffect(() => {
    if (!isVisible && isSpeaking) {
      audioRef.current?.pause();
      if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
      setIsSpeaking(false);
    }
  }, [isVisible, isSpeaking]);

  const isReview = post.post_type === "review";
  const isTrap = post.post_type === "trap";
  const mediaType = post.media_type ?? "text";
  const accentColor = post.persona?.accent_color ?? "#C9B8E8";
  const isFullBleed = mediaType === "image" || mediaType === "video";

  return (
    <div
      ref={cardRef}
      className="relative h-dvh w-full flex flex-col overflow-hidden"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      {isFullBleed ? (
        <div className="absolute inset-0">
          {mediaType === "image" && post.media_url && (
            <ImageMedia url={post.media_url} title={post.title} />
          )}
          {mediaType === "video" && post.media_url && (
            <VideoMedia url={post.media_url} isVisible={isVisible} />
          )}
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: mediaType === "audio"
              ? undefined
              : `linear-gradient(160deg, #FFF8F0 0%, ${accentColor}14 60%, ${accentColor}28 100%)`,
          }}
        />
      )}

      {/* Subtle decorative blobs in background for text cards */}
      {!isFullBleed && mediaType !== "audio" && (
        <>
          <div
            className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: accentColor,
              filter: "blur(50px)",
              opacity: 0.18,
            }}
          />
          <div
            className="absolute bottom-20 left-[-40px] w-36 h-36 rounded-full pointer-events-none"
            style={{
              background: accentColor,
              filter: "blur(40px)",
              opacity: 0.12,
            }}
          />
        </>
      )}

      {/* Review badge overlay */}
      {isReview && (
        <div className="absolute top-4 left-4 right-16 z-10">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(245,217,122,0.85), rgba(232,196,58,0.7))",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(232,196,58,0.5)",
              boxShadow: "0 2px 8px rgba(232,196,58,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            <span className="text-xs">🔁</span>
            <span className="text-xs font-sans font-semibold text-amber-800">You saw this before. Still got it?</span>
          </div>
        </div>
      )}

      {/* ── Main content layer ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Top: persona badge + post type tag */}
        <div className={`px-5 pt-14 pb-3 flex items-start justify-between gap-3 ${isFullBleed ? "drop-shadow-lg" : ""}`}>
          {post.persona ? (
            <div className="flex items-center gap-2">
              <PersonaBadge
                persona={post.persona}
                onClick={onPersonaClick ? () => onPersonaClick(post.persona!.slug) : undefined}
              />
              {/* Sparkle cluster near persona for text cards */}
              {!isFullBleed && (
                <SparkleCluster color={accentColor} className="opacity-60 hidden sm:block" />
              )}
            </div>
          ) : (
            <div />
          )}
          <PostTypeTag type={post.post_type} glass={isFullBleed} />
        </div>

        {/* Center: media-specific content */}
        {mediaType === "audio" && post.media_url ? (
          <div className="flex-1">
            <AudioMedia url={post.media_url} title={post.title} accentColor={accentColor} />
          </div>
        ) : mediaType === "text" || !post.media_url ? (
          <TextContent
            title={post.title}
            body={post.body}
            accentColor={accentColor}
            isTrap={isTrap}
            isSpeaking={isSpeaking}
            onTts={handleTts}
          />
        ) : (
          <div className="flex-1" />
        )}

        {/* Bottom: caption (for image/video) + action bar */}
        <div className={`px-5 pb-8 flex items-end justify-between ${isFullBleed ? "drop-shadow-lg" : ""}`}>
          <div className="flex-1 pr-4">
            {isFullBleed && (post.title || post.body) ? (
              // Frosted glass caption
              <div
                className="rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(20, 16, 12, 0.5)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {post.title && (
                  <p className="font-display font-bold text-white text-sm leading-tight mb-0.5">
                    {post.title}
                  </p>
                )}
                <p className="font-sans text-white/80 text-xs leading-snug line-clamp-2">
                  {post.body}
                </p>
              </div>
            ) : mediaType !== "audio" ? (
              <p className="text-xs font-sans text-charcoal/50 italic">
                {isTrap
                  ? "Reply before you peek. 👀"
                  : isReview
                  ? "Can you explain this in one sentence?"
                  : "What's your take?"}
              </p>
            ) : null}
          </div>

          <ActionBar
            commentCount={commentCount}
            isSaved={isSaved}
            isLiked={isLiked}
            onComment={handleComment}
            onSave={handleSave}
            onLike={handleLike}
            accentColor={accentColor}
          />
        </div>
      </div>

      <SaveCategorySheet
        postId={saveCategoryOpen ? post.id : null}
        currentlySaved={isSaved}
        onClose={() => setSaveCategoryOpen(false)}
        onConfirm={(saved) => setIsSaved(saved)}
      />
    </div>
  );
}
