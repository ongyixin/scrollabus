"use client";

import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import type { Comment } from "@/lib/types";
import { PersonaBadge } from "./PersonaBadge";
import { PersonaSprite } from "./PersonaSprites";

interface CommentSheetProps {
  postId: string | null;
  personaSlug?: string | null;
  onClose: () => void;
}

export function CommentSheet({ postId, personaSlug, onClose }: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postId) return;
    setComments([]);
    fetchComments();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchComments() {
    if (!postId) return;
    const res = await fetch(`/api/comments?post_id=${postId}`);
    if (res.ok) {
      const json = await res.json();
      setComments(json.comments);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !postId || isSubmitting) return;

    setIsSubmitting(true);
    const body = input.trim();
    setInput("");

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, body }),
      });

      if (res.ok) {
        const json = await res.json();
        setComments((prev) => [...prev, json.comment]);
        setIsLoadingReply(true);

        // Poll for AI reply (up to 12s)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const r = await fetch(`/api/comments?post_id=${postId}`);
          if (r.ok) {
            const j = await r.json();
            if (j.comments.length > comments.length + 1) {
              setComments(j.comments);
              setIsLoadingReply(false);
              clearInterval(poll);
            }
          }
          if (attempts >= 12) {
            setIsLoadingReply(false);
            clearInterval(poll);
          }
        }, 1000);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  return (
    <Drawer.Root open={!!postId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-warm-black/30 backdrop-blur-sm z-40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-cream max-h-[85dvh] focus:outline-none"
          aria-label="Comments"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-warm-300" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 flex items-center justify-between shrink-0 border-b border-warm-200">
            <Drawer.Title className="font-display font-semibold text-charcoal text-lg">
              Replies
            </Drawer.Title>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal/60 hover:text-charcoal transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {comments.length === 0 && (
              <p className="text-center text-charcoal/40 text-sm font-sans py-8">
                Be the first to reply ✨
              </p>
            )}

            <AnimatePresence initial={false}>
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 ${comment.persona_id ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div className="shrink-0 mt-0.5">
                    {comment.persona ? (
                      <div
                        className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white flex items-center justify-center"
                        style={{ backgroundColor: comment.persona.accent_color + "25" }}
                      >
                        <PersonaSprite slug={comment.persona.slug} size={32} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-xs font-sans font-semibold text-charcoal/60">
                        {(comment.profile?.display_name ?? "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`flex-1 ${comment.persona_id ? "items-end" : "items-start"} flex flex-col`}>
                    <span className="text-xs font-sans text-charcoal/50 mb-1">
                      {comment.persona
                        ? comment.persona.name
                        : comment.profile?.display_name ?? "You"}
                    </span>
                    <div
                      className={`
                        rounded-2xl px-4 py-2.5 text-sm font-sans leading-relaxed max-w-[85%]
                        ${comment.persona_id
                          ? "bg-warm-100 text-charcoal rounded-tr-sm"
                          : "bg-charcoal text-cream rounded-tl-sm"
                        }
                      `}
                      style={comment.persona_id
                        ? { borderLeft: `3px solid ${comment.persona?.accent_color}` }
                        : {}
                      }
                    >
                      {comment.body}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* AI typing indicator */}
            {isLoadingReply && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-row-reverse gap-3"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-lavender/20">
                  {personaSlug
                    ? <PersonaSprite slug={personaSlug} size={32} />
                    : <span className="w-3 h-3 rounded-full bg-lavender/50 animate-pulse" />
                  }
                </div>
                <div className="bg-warm-100 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 px-4 py-3 border-t border-warm-200 flex gap-2 items-end bg-cream"
          >
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Reply before you peek…"
              rows={1}
              className="flex-1 resize-none bg-warm-100 rounded-2xl px-4 py-2.5 text-sm font-sans text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-lavender/50 transition-all leading-relaxed"
              style={{ maxHeight: 100 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting}
              className="w-10 h-10 rounded-full bg-charcoal flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity active:scale-90"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

          {/* Safe area spacer */}
          <div className="h-safe-area-inset-bottom bg-cream" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
