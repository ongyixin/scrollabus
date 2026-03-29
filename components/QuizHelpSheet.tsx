"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Drawer } from "vaul";
import { motion, AnimatePresence } from "framer-motion";
import { PERSONA_CONFIG } from "@/lib/constants";
import { PersonaSprite } from "./PersonaSprites";
import type { QuizMessage } from "@/lib/types";

interface QuizHelpSheetProps {
  quizId: string;
  question: string;
  hasAnswered: boolean;
  open: boolean;
  onClose: () => void;
  defaultPersonaSlug?: string;
}

const QUIZ_ACCENT = "#8B6FD4";

// Parses the input to find a @mention and the active persona.
// Checks for each known persona name specifically (e.g. "@Lecture Bestie") so
// that text typed after the mention ("@Lecture Bestie my question") is not
// accidentally included in the name match.
function parseMention(text: string): { personaSlug: string | null; cleanText: string } {
  let lastValidSlug: string | null = null;
  let cleanText = text;

  for (const persona of PERSONA_CONFIG) {
    const escaped = persona.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`@${escaped}`, "gi");
    if (regex.test(text)) {
      lastValidSlug = persona.slug;
      cleanText = text.replace(new RegExp(`@${escaped}`, "gi"), "").trim();
    }
  }

  return { personaSlug: lastValidSlug, cleanText };
}

// ─── Mention Picker Dropdown ──────────────────────────────────────────────────

interface MentionPickerProps {
  filter: string;
  onSelect: (name: string) => void;
}

function MentionPicker({ filter, onSelect }: MentionPickerProps) {
  const filtered = PERSONA_CONFIG.filter((p) =>
    p.name.toLowerCase().startsWith(filter.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden shadow-card-hover"
      style={{
        background: "rgba(255,248,240,0.97)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(139,111,212,0.2)",
      }}
    >
      <div className="px-3 py-2 border-b border-warm-200">
        <p className="text-xs font-sans text-charcoal/50 font-semibold">Ping a study persona</p>
      </div>
      {filtered.map((p) => (
        <button
          key={p.slug}
          type="button"
          onClick={() => onSelect(p.name)}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-warm-100 transition-colors"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ backgroundColor: p.accentColor + "25" }}
          >
            <PersonaSprite slug={p.slug} size={32} />
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-sans font-semibold text-charcoal leading-none">{p.name}</p>
            <p className="text-xs font-sans text-charcoal/50 truncate">{p.tooltip.slice(0, 48)}…</p>
          </div>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Chat message bubble ──────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: QuizMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isPersona = message.role === "persona";
  const knownPersona = isPersona
    ? PERSONA_CONFIG.find((p) => p.slug === message.persona_slug)
    : null;
  // Accent color falls back to quiz purple for unknown (custom) personas
  const accentColor = knownPersona?.accentColor ?? QUIZ_ACCENT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isPersona ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isPersona ? (
          <div
            className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white flex items-center justify-center"
            style={{ backgroundColor: accentColor + "25" }}
          >
            <PersonaSprite slug={message.persona_slug ?? ""} size={32} />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-xs font-sans font-semibold text-charcoal/60">
            Me
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`flex-1 flex flex-col ${isPersona ? "items-end" : "items-start"}`}>
        {isPersona && knownPersona && (
          <span className="text-xs font-sans text-charcoal/50 mb-1">{knownPersona.name}</span>
        )}
        <div
          className="rounded-2xl px-4 py-2.5 text-sm font-sans leading-relaxed max-w-[85%]"
          style={isPersona
            ? {
                background: "rgba(248,242,232,0.9)",
                color: "#2D2926",
                borderTopRightRadius: 4,
                borderLeft: `3px solid ${accentColor}`,
              }
            : {
                background: "#2D2926",
                color: "#FFF8F0",
                borderTopLeftRadius: 4,
              }
          }
        >
          {message.body}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main QuizHelpSheet ───────────────────────────────────────────────────────

export function QuizHelpSheet({ quizId, question, hasAnswered, open, onClose, defaultPersonaSlug }: QuizHelpSheetProps) {
  const [messages, setMessages] = useState<QuizMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Mention picker state — pre-populate with quiz's authoring persona if available
  // For custom personas not in PERSONA_CONFIG, use the slug as the display name fallback
  const defaultKnownPersona = defaultPersonaSlug
    ? PERSONA_CONFIG.find((p) => p.slug === defaultPersonaSlug) ?? null
    : null;

  const [showPicker, setShowPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedPersonaSlug, setSelectedPersonaSlug] = useState<string | null>(defaultPersonaSlug ?? null);
  const [selectedPersonaName, setSelectedPersonaName] = useState<string | null>(defaultKnownPersona?.name ?? null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history when sheet opens; pre-fill input with default persona mention
  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetch(`/api/quiz-chat?quiz_id=${quizId}`)
      .then((r) => r.ok ? r.json() : { messages: [] })
      .then((json) => {
        setMessages(json.messages ?? []);
        // Pre-fill the mention if no conversation yet and a default persona exists
        if ((json.messages ?? []).length === 0 && defaultKnownPersona) {
          setInput(`@${defaultKnownPersona.name} `);
          setSelectedPersonaSlug(defaultKnownPersona.slug);
          setSelectedPersonaName(defaultKnownPersona.name);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quizId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Detect @ trigger
    const lastAt = val.lastIndexOf("@");
    if (lastAt !== -1) {
      const afterAt = val.slice(lastAt + 1);
      // Only show picker if we're actively typing after @
      if (!afterAt.includes(" ") || afterAt.length === 0) {
        setMentionFilter(afterAt);
        setShowPicker(true);
        return;
      }
    }
    setShowPicker(false);
  }, []);

  const handleSelectPersona = useCallback((name: string) => {
    const persona = PERSONA_CONFIG.find((p) => p.name === name);
    if (!persona) return;

    setSelectedPersonaSlug(persona.slug);
    setSelectedPersonaName(persona.name);
    setShowPicker(false);

    // Replace the @... token in input with the full persona name (nicely formatted)
    setInput((prev) => {
      const lastAt = prev.lastIndexOf("@");
      if (lastAt === -1) return prev + `@${name} `;
      return prev.slice(0, lastAt) + `@${name} `;
    });

    textareaRef.current?.focus();
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    setSendError(null);

    // Parse out the persona slug and clean message
    const { personaSlug, cleanText } = parseMention(input);
    const slug = personaSlug ?? selectedPersonaSlug;

    if (!slug) {
      // Prompt user to mention a persona
      setInput("@");
      setShowPicker(true);
      setMentionFilter("");
      textareaRef.current?.focus();
      return;
    }

    if (!cleanText) {
      // Only a mention with no body — also prompt
      textareaRef.current?.focus();
      return;
    }

    setIsSending(true);
    const rawInput = input;
    setInput("");
    setSelectedPersonaSlug(null);
    setSelectedPersonaName(null);

    // Optimistic user message
    const optimisticMsg: QuizMessage = {
      id: `temp-${Date.now()}`,
      quiz_id: quizId,
      user_id: "",
      persona_slug: null,
      role: "user",
      body: rawInput.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/quiz-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quizId, persona_slug: slug, message: cleanText }),
      });

      if (res.ok) {
        const json = await res.json();
        const personaMsg: QuizMessage = {
          id: `reply-${Date.now()}`,
          quiz_id: quizId,
          user_id: "",
          persona_slug: json.persona_slug,
          role: "persona",
          body: json.reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => {
          // Replace optimistic user message with real ones from server
          const without = prev.filter((m) => m.id !== optimisticMsg.id);
          return [
            ...without,
            { ...optimisticMsg, id: `user-${Date.now()}` },
            personaMsg,
          ];
        });
      } else {
        const json = await res.json().catch(() => ({}));
        console.error("[quiz-help] API error:", res.status, json);
        setSendError(json.error ?? "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } catch (err) {
      console.error("[quiz-help] send error:", err);
      setSendError("Couldn't reach the server. Check your connection.");
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setIsSending(false);
    }
  }

  const noMessages = messages.length === 0 && !isLoading;

  return (
    <Drawer.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-warm-black/30 backdrop-blur-sm z-40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl max-h-[88dvh] focus:outline-none"
          style={{ background: "#FFF8F0" }}
          aria-label="Ask a persona for help"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-warm-300" />
          </div>

          {/* Header */}
          <div className="px-5 pb-3 shrink-0 border-b border-warm-200">
            <div className="flex items-center justify-between mb-1">
              <Drawer.Title className="font-display font-semibold text-charcoal text-lg">
                Ask a Persona
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
            {/* Context hint */}
            <p className="text-xs font-sans text-charcoal/50 leading-snug">
              {hasAnswered
                ? "You've answered — ask any persona for a deeper explanation."
                : "Haven't answered yet? Personas will give you hints, not the answer."}
            </p>
            {/* Question preview */}
            <div
              className="mt-2 px-3 py-2 rounded-xl text-xs font-sans text-charcoal/70 leading-snug line-clamp-2"
              style={{ background: "rgba(139,111,212,0.08)", borderLeft: `3px solid ${QUIZ_ACCENT}` }}
            >
              {question}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {isLoading && (
              <div className="flex justify-center py-8">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-charcoal/20 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {noMessages && (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3">✨</div>
                <p className="font-sans text-sm text-charcoal/50 leading-relaxed max-w-xs mx-auto">
                  Type <span className="font-semibold text-charcoal/70">@</span> and a persona name
                  to ping them for help with this question.
                </p>
                {/* Persona chips */}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {PERSONA_CONFIG.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      onClick={() => {
                        setInput(`@${p.name} `);
                        setSelectedPersonaSlug(p.slug);
                        setSelectedPersonaName(p.name);
                        textareaRef.current?.focus();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-all"
                      style={{
                        background: p.accentColor + "20",
                        border: `1px solid ${p.accentColor}40`,
                        color: "#2D2926",
                      }}
                    >
                      <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center"
                        style={{ background: p.accentColor + "30" }}>
                        <PersonaSprite slug={p.slug} size={16} />
                      </span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {/* AI typing indicator */}
            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-row-reverse gap-3"
              >
                {selectedPersonaSlug ? (
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: (PERSONA_CONFIG.find(p => p.slug === selectedPersonaSlug)?.accentColor ?? QUIZ_ACCENT) + "25" }}
                  >
                    <PersonaSprite slug={selectedPersonaSlug} size={32} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center">
                    <span className="text-lg">✨</span>
                  </div>
                )}
                <div className="bg-warm-100 rounded-2xl rounded-tr-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-charcoal/30 animate-bounce [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <form
            onSubmit={handleSend}
            className="shrink-0 px-4 py-3 border-t border-warm-200 bg-cream"
          >
            {/* Selected persona chip */}
            <AnimatePresence>
              {selectedPersonaName && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-sans text-charcoal/50">Asking:</span>
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold"
                      style={{
                        background: (PERSONA_CONFIG.find(p => p.name === selectedPersonaName)?.accentColor ?? QUIZ_ACCENT) + "20",
                        border: `1px solid ${(PERSONA_CONFIG.find(p => p.name === selectedPersonaName)?.accentColor ?? QUIZ_ACCENT)}40`,
                        color: "#2D2926",
                      }}
                    >
                      <span className="w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center"
                        style={{ background: (PERSONA_CONFIG.find(p => p.name === selectedPersonaName)?.accentColor ?? QUIZ_ACCENT) + "30" }}>
                        {selectedPersonaSlug && <PersonaSprite slug={selectedPersonaSlug} size={16} />}
                      </span>
                      {selectedPersonaName}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPersonaSlug(null);
                          setSelectedPersonaName(null);
                          setInput((prev) => prev.replace(/@[^\n]+/g, "").trim());
                        }}
                        className="ml-0.5 text-charcoal/40 hover:text-charcoal/70"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Send error */}
            <AnimatePresence>
              {sendError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-2 text-xs font-sans text-red-500 leading-snug"
                >
                  {sendError}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="relative">
              {/* Mention picker */}
              <AnimatePresence>
                {showPicker && (
                  <MentionPicker
                    filter={mentionFilter}
                    onSelect={handleSelectPersona}
                  />
                )}
              </AnimatePresence>

              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setShowPicker(false); return; }
                    if (e.key === "Enter" && !e.shiftKey && !showPicker) {
                      e.preventDefault();
                      handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder={`@Persona Name — ask for ${hasAnswered ? "an explanation" : "a hint"}…`}
                  rows={1}
                  className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm font-sans text-charcoal placeholder:text-charcoal/40 focus:outline-none transition-all leading-relaxed"
                  style={{
                    background: "rgba(248,242,232,0.9)",
                    border: "1px solid rgba(139,111,212,0.25)",
                    maxHeight: 100,
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 transition-all active:scale-90"
                  style={{
                    background: "linear-gradient(135deg, #8B6FD4, #5B8BD4)",
                    boxShadow: "0 2px 8px rgba(139,111,212,0.35)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          <div className="h-safe-area-inset-bottom" style={{ background: "#FFF8F0" }} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
