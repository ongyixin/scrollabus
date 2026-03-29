"use client";

import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona, Post } from "@/lib/types";
import { PostTypeTag } from "./PostTypeTag";
import { PersonaSprite } from "./PersonaSprites";
import { ConfirmSheet } from "./ConfirmSheet";

interface PersonaProfileSheetProps {
  slug: string | null;
  onClose: () => void;
}

interface PersonaWithPosts {
  persona: Persona;
  posts: Pick<Post, "id" | "title" | "body" | "post_type" | "created_at">[];
}

interface DmMessage {
  role: "user" | "model";
  content: string;
}

type SheetView = "profile" | "dm";

export function PersonaProfileSheet({ slug, onClose }: PersonaProfileSheetProps) {
  const [data, setData] = useState<PersonaWithPosts | null>(null);
  const [posts, setPosts] = useState<PersonaWithPosts["posts"]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<SheetView>("profile");

  // Post selection / deletion state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [deletingPosts, setDeletingPosts] = useState(false);
  const [deletePostsError, setDeletePostsError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // DM state
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [dmError, setDmError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist DM messages to sessionStorage so they survive HMR and sheet close/reopen
  const setAndPersistMessages = (updater: DmMessage[] | ((prev: DmMessage[]) => DmMessage[])) => {
    setMessages((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (slug) {
        try { sessionStorage.setItem(`dm_${slug}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  };

  useEffect(() => {
    if (!slug) {
      setData(null);
      setPosts([]);
      setView("profile");
      setMessages([]);
      setDmError(null);
      setSelectMode(false);
      setSelectedPosts(new Set());
      setDeletePostsError(null);
      return;
    }
    setIsLoading(true);
    setData(null);
    setPosts([]);
    setView("profile");
    // Restore persisted messages for this persona
    try {
      const saved = sessionStorage.getItem(`dm_${slug}`);
      setMessages(saved ? JSON.parse(saved) : []);
    } catch {
      setMessages([]);
    }
    setDmError(null);
    setSelectMode(false);
    setSelectedPosts(new Set());
    setDeletePostsError(null);

    fetch(`/api/personas/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json) {
          setData(json);
          setPosts(json.posts ?? []);
        }
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const persona = data?.persona;

  function togglePostSelection(id: string) {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedPosts(new Set());
    setDeletePostsError(null);
    setConfirmDeleteOpen(false);
  }

  async function deleteSelectedPosts() {
    if (selectedPosts.size === 0) return;
    setDeletingPosts(true);
    setDeletePostsError(null);
    const ids = Array.from(selectedPosts);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/posts/${id}`, { method: "DELETE" }).then((r) => r.json())
        )
      );
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setConfirmDeleteOpen(false);
        setDeletePostsError("Some posts could not be deleted.");
      } else {
        setPosts((prev) => prev.filter((p) => !ids.includes(p.id)));
        exitSelectMode();
      }
    } catch {
      setConfirmDeleteOpen(false);
      setDeletePostsError("Failed to delete. Please try again.");
    } finally {
      setDeletingPosts(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !slug || isSending) return;

    const userMsg: DmMessage = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setAndPersistMessages(updated);
    setInput("");
    setDmError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsSending(true);

    try {
      const res = await fetch(`/api/personas/${slug}/dm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      if (res.ok) {
        const json = await res.json();
        setAndPersistMessages((prev) => [...prev, { role: "model", content: json.reply }]);
      } else {
        const json = await res.json().catch(() => ({}));
        setDmError(json.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setDmError("Couldn't reach the server. Check your connection.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Drawer.Root open={!!slug} onOpenChange={(open) => { if (!open) onClose(); }} dismissible={view !== "dm"}>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-warm-black/30 backdrop-blur-sm z-40"
          onClick={view === "dm" ? (e) => e.stopPropagation() : undefined}
        />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-cream h-[90dvh] focus:outline-none overflow-hidden"
          aria-label="Persona profile"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-warm-300" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 flex items-center gap-3 shrink-0 border-b border-warm-200">
            {/* Back button (DM view only) */}
            <AnimatePresence>
              {view === "dm" && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setView("profile")}
                  className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal/60 hover:text-charcoal transition-colors shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>

            <Drawer.Title className="font-display font-semibold text-charcoal text-lg flex-1">
              {view === "dm" && persona ? `Chat with ${persona.name}` : (persona ? persona.name : "Profile")}
            </Drawer.Title>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal/60 hover:text-charcoal transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body: animated between profile and DM views */}
          <div className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait" initial={false}>
              {view === "profile" ? (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0 overflow-y-auto"
                >
                  {isLoading && (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-6 h-6 rounded-full border-2 border-lavender/40 border-t-lavender animate-spin" />
                    </div>
                  )}

                  {!isLoading && persona && (
                    <>
                      {/* Persona hero */}
                      <div
                        className="px-5 py-6 flex flex-col items-center text-center gap-3"
                        style={{
                          background: `linear-gradient(160deg, #FFF8F0 0%, ${persona.accent_color}22 100%)`,
                        }}
                      >
                        <div
                          className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-md flex items-center justify-center"
                          style={{ backgroundColor: persona.accent_color + "25" }}
                        >
                          <PersonaSprite slug={persona.slug} size={80} />
                        </div>

                        <div>
                          <h2 className="font-display font-bold text-charcoal text-xl leading-tight">
                            {persona.name}
                          </h2>
                          <p
                            className="font-sans font-semibold text-sm mt-0.5"
                            style={{ color: persona.accent_color }}
                          >
                            {persona.role_tag}
                          </p>
                        </div>

                        {persona.description && (
                          <p className="font-sans text-charcoal/70 text-sm leading-relaxed max-w-xs">
                            {persona.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium"
                            style={{
                              backgroundColor: persona.accent_color + "20",
                              color: persona.accent_color,
                            }}
                          >
                            <span>{posts.length} {posts.length === 1 ? "post" : "posts"} in your feed</span>
                          </div>

                          {/* DM button */}
                          <button
                            onClick={() => setView("dm")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold text-white transition-opacity active:opacity-70"
                            style={{ backgroundColor: persona.accent_color }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            Message
                          </button>
                        </div>
                      </div>

                      {/* Posts list */}
                      {posts.length > 0 && (
                        <div className="px-5 pt-5 pb-8 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="font-display font-semibold text-charcoal text-sm uppercase tracking-wide opacity-50">
                              Recent posts
                            </p>
                            <button
                              type="button"
                              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                              className="font-sans text-xs font-semibold text-charcoal/50 hover:text-charcoal/70 transition-colors"
                            >
                              {selectMode ? "Cancel" : "Select"}
                            </button>
                          </div>

                          {selectMode && (
                            <div className="flex items-center justify-between py-1">
                              <button
                                type="button"
                                onClick={() =>
                                  selectedPosts.size === posts.length
                                    ? setSelectedPosts(new Set())
                                    : setSelectedPosts(new Set(posts.map((p) => p.id)))
                                }
                                className="font-sans text-xs font-semibold text-charcoal/60 hover:text-charcoal transition-colors"
                              >
                                {selectedPosts.size === posts.length ? "Deselect all" : "Select all"}
                              </button>
                              {selectedPosts.size > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteOpen(true)}
                                  className="flex items-center gap-1.5 font-sans text-xs font-semibold text-cherry hover:text-cherry/70 transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                  </svg>
                                  Delete {selectedPosts.size} {selectedPosts.size === 1 ? "post" : "posts"}
                                </button>
                              )}
                            </div>
                          )}

                          {deletePostsError && (
                            <p className="font-sans text-xs text-cherry">{deletePostsError}</p>
                          )}

                          {posts.map((post) => {
                            const isSelected = selectedPosts.has(post.id);
                            return (
                              <div
                                key={post.id}
                                onClick={() => selectMode && togglePostSelection(post.id)}
                                className={`rounded-2xl p-4 shadow-sm border transition-colors ${
                                  selectMode ? "cursor-pointer" : ""
                                } ${
                                  isSelected
                                    ? "bg-cherry/5 border-cherry/30"
                                    : "bg-white border-warm-200"
                                }`}
                                style={
                                  !isSelected
                                    ? { borderLeft: `3px solid ${persona.accent_color}` }
                                    : undefined
                                }
                              >
                                <div className="flex items-start gap-3">
                                  {selectMode && (
                                    <div
                                      className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                        isSelected ? "bg-cherry border-cherry" : "border-warm-300 bg-white"
                                      }`}
                                    >
                                      {isSelected && (
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M2 5l2.5 2.5L8 2.5" />
                                        </svg>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      {post.title && (
                                        <p className="font-display font-semibold text-charcoal text-sm leading-snug flex-1">
                                          {post.title}
                                        </p>
                                      )}
                                      <PostTypeTag type={post.post_type} />
                                    </div>
                                    <p className="font-sans text-charcoal/70 text-xs leading-relaxed line-clamp-3">
                                      {post.body}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {posts.length === 0 && (
                        <div className="px-5 py-10 text-center">
                          <p className="font-sans text-charcoal/40 text-sm">
                            No posts yet. Upload some material to get started.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              ) : (
                /* DM view */
                <motion.div
                  key="dm"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col"
                >
                  {/* Message list */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {messages.length === 0 && persona && (
                      <div className="flex flex-col items-center text-center gap-2 pt-6 pb-2">
                        <div
                          className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white shadow flex items-center justify-center"
                          style={{ backgroundColor: persona.accent_color + "25" }}
                        >
                          <PersonaSprite slug={persona.slug} size={56} />
                        </div>
                        <p className="font-display font-semibold text-charcoal text-sm">
                          {persona.name}
                        </p>
                        <p className="font-sans text-charcoal/50 text-xs max-w-[220px] leading-relaxed">
                          Ask me anything about your studies — I&apos;m here to help!
                        </p>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {messages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {/* Avatar */}
                          {msg.role === "model" && persona && (
                            <div
                              className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-white flex items-center justify-center"
                              style={{ backgroundColor: persona.accent_color + "25" }}
                            >
                              <PersonaSprite slug={persona.slug} size={28} />
                            </div>
                          )}

                          {/* Bubble */}
                          <div
                            className={`
                              max-w-[78%] rounded-2xl px-4 py-2.5 text-sm font-sans leading-relaxed
                              ${msg.role === "user"
                                ? "bg-charcoal text-cream rounded-tr-sm"
                                : "bg-white text-charcoal rounded-tl-sm shadow-sm"
                              }
                            `}
                            style={
                              msg.role === "model" && persona
                                ? { borderLeft: `3px solid ${persona.accent_color}` }
                                : {}
                            }
                          >
                            {msg.content}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {isSending && persona && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2"
                      >
                        <div
                          className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-white flex items-center justify-center"
                          style={{ backgroundColor: persona.accent_color + "25" }}
                        >
                          <PersonaSprite slug={persona.slug} size={28} />
                        </div>
                        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </motion.div>
                    )}

                    <div ref={bottomRef} />
                  </div>

                  {/* Error banner */}
                  {dmError && (
                    <div className="shrink-0 mx-4 mb-2 px-3 py-2 rounded-xl bg-cherry/10 border border-cherry/20 flex items-center gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cherry shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <p className="font-sans text-xs text-cherry leading-snug">{dmError}</p>
                    </div>
                  )}

                  {/* Input */}
                  <form
                    onSubmit={sendMessage}
                    className="shrink-0 px-4 py-3 border-t border-warm-200 flex gap-2 items-end bg-cream"
                  >
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder={persona ? `Ask ${persona.name} something…` : "Type a message…"}
                      rows={1}
                      className="flex-1 resize-none bg-warm-100 rounded-2xl px-4 py-2.5 text-sm font-sans text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-lavender/50 transition-all leading-relaxed"
                      style={{ maxHeight: 120 }}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isSending}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity active:scale-90"
                      style={{ backgroundColor: persona?.accent_color ?? "#C9B8E8" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </form>

                  <div className="h-safe-area-inset-bottom bg-cream shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>

      <ConfirmSheet
        open={confirmDeleteOpen}
        title={`Delete ${selectedPosts.size} ${selectedPosts.size === 1 ? "post" : "posts"}?`}
        description="This will permanently delete the selected posts. This cannot be undone."
        confirmLabel={`Delete ${selectedPosts.size === 1 ? "post" : "posts"}`}
        onConfirm={deleteSelectedPosts}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={deletingPosts}
      />
    </Drawer.Root>
  );
}
