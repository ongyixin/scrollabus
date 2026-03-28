"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { LectureBestieSprite, ExamGremlinSprite, ProblemGrinderSprite } from "@/components/PersonaSprites";

type Step = "input" | "processing";

export function UploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [smartAnalysis, setSmartAnalysis] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePdfUpload(file: File) {
    setIsParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("smart", smartAnalysis ? "true" : "false");

      const res = await fetch("/api/materials/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setText(json.text);
        if (!title) setTitle(file.name.replace(/\.pdf$/i, ""));
      } else {
        const json = await res.json();
        setError(json.error ?? "Failed to parse PDF.");
      }
    } catch {
      setError("Failed to read PDF — please try again.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    setError(null);
    setStep("processing");

    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), raw_text: text.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setStep("input");
        return;
      }

      router.push(`/feed?material_id=${json.material_id}`);
    } catch {
      setError("Network error — please try again.");
      setStep("input");
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-sans font-semibold text-charcoal/60 mb-1.5 uppercase tracking-wide">
                  Topic / Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 6 — Macroeconomics"
                  className="w-full bg-white rounded-2xl px-4 py-3 text-base font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 shadow-soft border border-warm-200"
                  required
                />
              </div>

              {/* Text area */}
              <div>
                <label className="block text-xs font-sans font-semibold text-charcoal/60 mb-1.5 uppercase tracking-wide">
                  Paste your notes or reading
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste lecture notes, textbook excerpts, or any study material here…"
                  rows={8}
                  className="w-full bg-white rounded-2xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 shadow-soft border border-warm-200 resize-none leading-relaxed"
                  required
                />
                <p className="text-xs font-sans text-charcoal/40 mt-1 text-right">
                  {text.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>

              {/* PDF upload option */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-warm-200" />
                <span className="text-xs font-sans text-charcoal/40">or</span>
                <div className="flex-1 h-px bg-warm-200" />
              </div>

              {/* Smart analysis toggle */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <span className="text-sm font-sans font-medium text-charcoal/80">Smart analysis</span>
                  <p className="text-xs font-sans text-charcoal/40 mt-0.5">OCR handwriting &amp; describe charts with AI</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={smartAnalysis}
                  onClick={() => setSmartAnalysis((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-lavender/60 ${smartAnalysis ? "bg-lavender" : "bg-warm-200"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${smartAnalysis ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => !isParsing && fileRef.current?.click()}
                disabled={isParsing}
                className="w-full flex items-center justify-center gap-2 bg-warm-100 hover:bg-warm-200 rounded-2xl px-4 py-3 text-sm font-sans font-medium text-charcoal/70 transition-colors border border-warm-200 border-dashed disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isParsing ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    {smartAnalysis ? "Analysing PDF…" : "Reading PDF…"}
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload PDF
                  </>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                }}
              />

              {error && (
                <p className="text-sm font-sans text-cherry bg-cherry-light/20 px-4 py-3 rounded-xl">
                  {error}
                </p>
              )}

              <motion.button
                type="submit"
                disabled={!title.trim() || !text.trim()}
                className="btn-gel btn-gel-dark w-full text-base rounded-2xl py-4 disabled:opacity-30"
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                Generate my feed →
              </motion.button>
            </form>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16 space-y-4"
          >
            <Image src="/logo.png" alt="Scrollabus" width={160} height={87} className="mx-auto animate-pulse" />
            <h3 className="font-display font-bold text-2xl text-charcoal">
              Building your feed…
            </h3>
            <p className="font-sans text-charcoal/60 text-sm max-w-xs mx-auto">
              Lecture Bestie, Exam Gremlin, and Problem Grinder are on it. Give them a moment.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              {[LectureBestieSprite, ExamGremlinSprite, ProblemGrinderSprite].map((Sprite, i) => (
                <div key={i} className="animate-bounce" style={{ animationDelay: `${i * 150}ms` }}>
                  <Sprite size={44} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
