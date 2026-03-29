"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/lib/types";

const PRESET_COLORS = [
  "#C9B8E8", // lavender
  "#D4544A", // cherry
  "#9DBE8A", // sage
  "#F5C842", // golden amber
  "#B8E86B", // lime green
  "#7EC8E3", // sky blue
  "#F0A09A", // rose
  "#7890C8", // periwinkle
  "#E8A87C", // peach
  "#A8D8B9", // mint
  "#D4A5E8", // lilac
  "#F5B942", // marigold
];

const SUGGESTED_EMOJIS = [
  "🧙", "🦉", "🎩", "🔬", "🎭", "🎯",
  "🧪", "🗿", "🦁", "🐉", "🌙", "⚡",
  "🎸", "🏆", "🌊", "🔥", "💡", "🎪",
];

interface CreatePersonaSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (persona: Persona) => void;
  /** If provided, we're editing an existing custom persona */
  editingPersona?: Persona | null;
}

interface FormState {
  name: string;
  emoji: string;
  role_tag: string;
  accent_color: string;
  description: string;
  tone: string;
  teaching_style: string;
  is_public: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  emoji: "🧙",
  role_tag: "",
  accent_color: "#C9B8E8",
  description: "",
  tone: "",
  teaching_style: "",
  is_public: false,
};

export function CreatePersonaSheet({
  open,
  onClose,
  onCreated,
  editingPersona,
}: CreatePersonaSheetProps) {
  const isEditing = !!editingPersona;

  const [form, setForm] = useState<FormState>(() =>
    editingPersona
      ? {
          name: editingPersona.name,
          emoji: editingPersona.emoji,
          role_tag: editingPersona.role_tag,
          accent_color: editingPersona.accent_color,
          description: editingPersona.description ?? "",
          tone: editingPersona.tone ?? "",
          teaching_style: editingPersona.teaching_style ?? "",
          is_public: editingPersona.is_public,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customHex, setCustomHex] = useState("");
  const [emojiInput, setEmojiInput] = useState("");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    if (saving) return;
    setForm(DEFAULT_FORM);
    setError(null);
    setShowEmojiPicker(false);
    setCustomHex("");
    setEmojiInput("");
    onClose();
  }

  // Reset form when editingPersona changes
  const prevEditingId = editingPersona?.id;
  if (isEditing && editingPersona && editingPersona.id !== prevEditingId) {
    setForm({
      name: editingPersona.name,
      emoji: editingPersona.emoji,
      role_tag: editingPersona.role_tag,
      accent_color: editingPersona.accent_color,
      description: editingPersona.description ?? "",
      tone: editingPersona.tone ?? "",
      teaching_style: editingPersona.teaching_style ?? "",
      is_public: editingPersona.is_public,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { name, emoji, role_tag, accent_color, description, tone, teaching_style, is_public } =
      form;

    if (!name.trim()) return setError("Name is required.");
    if (!emoji.trim()) return setError("Emoji is required.");
    if (!role_tag.trim()) return setError("Role is required.");
    if (!description.trim()) return setError("Description is required.");
    if (!tone.trim()) return setError("Tone is required.");
    if (!teaching_style.trim()) return setError("Teaching style is required.");

    setSaving(true);
    try {
      let res: Response;
      if (isEditing && editingPersona) {
        res = await fetch(`/api/personas/${editingPersona.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, emoji, role_tag, accent_color, description, tone, teaching_style, is_public }),
        });
      } else {
        res = await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, emoji, role_tag, accent_color, description, tone, teaching_style, is_public }),
        });
      }

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }

      onCreated(json.persona);
      handleClose();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const preview = form;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-[2rem] shadow-card-hover max-h-[92dvh] flex flex-col focus:outline-none"
          >
            {/* Handle + header */}
            <div className="sticky top-0 bg-cream pt-4 pb-3 px-5 border-b border-warm-100 rounded-t-[2rem] shrink-0">
              <div className="w-10 h-1 bg-warm-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-xl text-charcoal">
                  {isEditing ? "Edit persona" : "Create a persona"}
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal/50 hover:bg-warm-200 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 1l12 12M13 1L1 13" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="px-5 py-5 space-y-6">

                {/* Live Preview */}
                <div
                  className="rounded-2xl p-4 flex items-center gap-4 border border-warm-200"
                  style={{ background: `linear-gradient(135deg, #FFF8F0 0%, ${preview.accent_color}22 100%)` }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shrink-0 ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: preview.accent_color + "30" }}
                  >
                    {preview.emoji || "🧙"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-charcoal text-base leading-tight truncate">
                      {preview.name || "Persona Name"}
                    </p>
                    <p
                      className="font-sans font-semibold text-xs mt-0.5 truncate"
                      style={{ color: preview.accent_color }}
                    >
                      {preview.role_tag || "Role Tag"}
                    </p>
                    {preview.description && (
                      <p className="font-sans text-xs text-charcoal/60 mt-1.5 leading-snug line-clamp-2">
                        {preview.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide">
                    Persona name <span className="text-cherry">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Socratic Sage, The Devil's Advocate…"
                    maxLength={50}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200"
                  />
                </div>

                {/* Emoji + Role Tag row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Emoji */}
                  <div>
                    <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide">
                      Emoji <span className="text-cherry">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-2xl border border-warm-200 flex items-center gap-2 hover:bg-warm-100 transition-colors"
                    >
                      <span>{form.emoji || "🧙"}</span>
                      <span className="text-xs font-sans text-charcoal/40 ml-auto">Change</span>
                    </button>
                    {showEmojiPicker && (
                      <div className="mt-2 p-3 bg-white rounded-2xl border border-warm-200 shadow-sm">
                        <div className="grid grid-cols-6 gap-1.5 mb-2">
                          {SUGGESTED_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                set("emoji", em);
                                setShowEmojiPicker(false);
                              }}
                              className={`text-xl p-1.5 rounded-xl hover:bg-warm-100 transition-colors ${form.emoji === em ? "bg-warm-200" : ""}`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2 border-t border-warm-100 pt-2">
                          <input
                            type="text"
                            value={emojiInput}
                            onChange={(e) => setEmojiInput(e.target.value)}
                            placeholder="Paste any emoji…"
                            maxLength={4}
                            className="flex-1 bg-warm-50 rounded-lg px-3 py-1.5 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-1 focus:ring-lavender/60 border border-warm-200"
                          />
                          <button
                            type="button"
                            disabled={!emojiInput.trim()}
                            onClick={() => {
                              if (emojiInput.trim()) {
                                set("emoji", emojiInput.trim());
                                setEmojiInput("");
                                setShowEmojiPicker(false);
                              }
                            }}
                            className="px-3 py-1.5 bg-charcoal text-cream rounded-lg text-xs font-sans font-semibold disabled:opacity-40"
                          >
                            Use
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Role Tag */}
                  <div>
                    <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide">
                      Role <span className="text-cherry">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.role_tag}
                      onChange={(e) => set("role_tag", e.target.value)}
                      placeholder="e.g. Devil's Advocate"
                      maxLength={30}
                      className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-2 uppercase tracking-wide">
                    Accent color <span className="text-cherry">*</span>
                  </label>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          set("accent_color", color);
                          setCustomHex("");
                        }}
                        className="w-full aspect-square rounded-xl border-2 transition-all active:scale-90"
                        style={{
                          backgroundColor: color,
                          borderColor: form.accent_color === color ? "#2D2926" : "transparent",
                          boxShadow: form.accent_color === color ? "0 0 0 2px #FFF8F0" : "none",
                        }}
                        aria-label={color}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-xl border border-warm-200 shrink-0"
                      style={{ backgroundColor: form.accent_color }}
                    />
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomHex(val);
                        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                          set("accent_color", val);
                        }
                      }}
                      placeholder="#C9B8E8"
                      maxLength={7}
                      className="flex-1 bg-warm-50 rounded-xl px-3 py-2 text-sm font-mono text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide">
                    Description <span className="text-cherry">*</span>
                  </label>
                  <p className="text-xs font-sans text-charcoal/40 mb-2">
                    Write in first person — this is how your persona introduces itself.
                  </p>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="e.g. I never just give you the answer. I ask the question behind the question until you figure it out yourself…"
                    rows={3}
                    maxLength={300}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200 resize-none"
                  />
                  <p className="text-[11px] font-sans text-charcoal/35 text-right mt-1">
                    {form.description.length}/300
                  </p>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide">
                    Tone <span className="text-cherry">*</span>
                  </label>
                  <p className="text-xs font-sans text-charcoal/40 mb-2">
                    How does this persona sound? A few words or a sentence.
                  </p>
                  <input
                    type="text"
                    value={form.tone}
                    onChange={(e) => set("tone", e.target.value)}
                    placeholder="e.g. Dry, Socratic, never gives direct answers"
                    maxLength={100}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200"
                  />
                </div>

                {/* Teaching Style */}
                <div>
                  <label className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide">
                    Teaching style <span className="text-cherry">*</span>
                  </label>
                  <p className="text-xs font-sans text-charcoal/40 mb-2">
                    How does this persona help you learn?
                  </p>
                  <input
                    type="text"
                    value={form.teaching_style}
                    onChange={(e) => set("teaching_style", e.target.value)}
                    placeholder="e.g. Analogies and real-world examples, step-by-step breakdowns"
                    maxLength={150}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200"
                  />
                </div>

                {/* Public toggle */}
                <div className="flex items-start justify-between gap-4 py-1">
                  <div>
                    <p className="font-sans text-sm font-semibold text-charcoal leading-tight">
                      Share with community
                    </p>
                    <p className="font-sans text-xs text-charcoal/50 mt-0.5">
                      Let other users discover and use this persona.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_public}
                    onClick={() => set("is_public", !form.is_public)}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender shrink-0 mt-0.5 ${
                      form.is_public ? "bg-charcoal" : "bg-warm-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        form.is_public ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {error && (
                  <p className="text-sm font-sans text-cherry">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-charcoal text-cream font-sans font-semibold py-3.5 rounded-2xl hover:bg-warm-black transition-colors disabled:opacity-40 active:scale-95"
                >
                  {saving
                    ? isEditing
                      ? "Saving…"
                      : "Creating…"
                    : isEditing
                    ? "Save changes"
                    : "Create persona"}
                </button>

                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
