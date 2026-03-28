"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ActionBarProps {
  commentCount: number;
  isSaved: boolean;
  isLiked: boolean;
  onComment: () => void;
  onSave: () => void;
  onLike: () => void;
  accentColor?: string;
}

export function ActionBar({ commentCount, isSaved, isLiked, onComment, onSave, onLike, accentColor = "#C9B8E8" }: ActionBarProps) {
  const [savedBurst, setSavedBurst] = useState(false);
  const [likedBurst, setLikedBurst] = useState(false);

  function handleSave() {
    if (!isSaved) setSavedBurst(true);
    onSave();
    setTimeout(() => setSavedBurst(false), 600);
  }

  function handleLike() {
    if (!isLiked) setLikedBurst(true);
    onLike();
    setTimeout(() => setLikedBurst(false), 600);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Like */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <AnimatePresence>
            {likedBurst && (
              <>
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.div
                    key={angle}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{}}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#F87171" }}
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: Math.cos((angle * Math.PI) / 180) * 22,
                        y: Math.sin((angle * Math.PI) / 180) * 22,
                        scale: 0,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.02 }}
                    />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleLike}
            aria-label={isLiked ? "Unlike post" : "Like post"}
            whileTap={{ scale: 0.82 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-300"
              style={isLiked ? {
                background: "linear-gradient(135deg, #F87171cc, #EF4444)",
                boxShadow: "0 4px 16px #EF444470, inset 0 1px 0 rgba(255,255,255,0.4)",
                border: "1px solid #EF444480",
              } : {
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 4px 12px rgba(26,22,18,0.10), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isLiked ? "white" : "none"}
                stroke={isLiked ? "white" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative z-10 text-charcoal"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </motion.button>
        </div>
        <span className="text-xs font-sans font-semibold text-white drop-shadow-md">
          {isLiked ? "Liked" : "Like"}
        </span>
      </div>

      {/* Comment */}
      <motion.button
        onClick={onComment}
        className="flex flex-col items-center gap-1 group"
        aria-label="View comments"
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 4px 12px rgba(26,22,18,0.10), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-charcoal">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className="text-xs font-sans font-semibold text-white drop-shadow-md">
          {commentCount > 0 ? commentCount : "Reply"}
        </span>
      </motion.button>

      {/* Save */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          {/* Burst sparkle animation on save */}
          <AnimatePresence>
            {savedBurst && (
              <>
                {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                  <motion.div
                    key={angle}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    exit={{}}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                      initial={{ x: 0, y: 0, scale: 1 }}
                      animate={{
                        x: Math.cos((angle * Math.PI) / 180) * 22,
                        y: Math.sin((angle * Math.PI) / 180) * 22,
                        scale: 0,
                        opacity: 0,
                      }}
                      transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.02 }}
                    />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleSave}
            aria-label={isSaved ? "Unsave post" : "Save post"}
            whileTap={{ scale: 0.82 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-300"
              style={isSaved ? {
                background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})`,
                boxShadow: `0 4px 16px ${accentColor}70, inset 0 1px 0 rgba(255,255,255,0.4)`,
                border: `1px solid ${accentColor}80`,
              } : {
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 4px 12px rgba(26,22,18,0.10), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              {/* Glossy sheen */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isSaved ? "white" : "none"}
                stroke={isSaved ? "white" : "currentColor"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative z-10 text-charcoal"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </motion.button>
        </div>
        <span className="text-xs font-sans font-semibold text-white drop-shadow-md">
          {isSaved ? "Saved" : "Save"}
        </span>
      </div>
    </div>
  );
}
