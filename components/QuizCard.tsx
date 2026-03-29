"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz, QuizOption, QuizResponse } from "@/lib/types";
import { PERSONA_CONFIG } from "@/lib/constants";
import { QuizHelpSheet } from "./QuizHelpSheet";

interface QuizCardProps {
  quiz: Quiz;
  onVisible: (quizId: string, durationMs: number) => void;
}

// ─── Persona accent helper ────────────────────────────────────────────────────

function getPersonaStyle(slug: string | null): { color: string; name: string; emoji: string } {
  if (!slug) return { color: "#8B6FD4", name: "Quiz", emoji: "❓" };
  const found = PERSONA_CONFIG.find((p) => p.slug === slug);
  return found
    ? { color: found.accentColor, name: found.name, emoji: found.emoji }
    : { color: "#8B6FD4", name: "Quiz", emoji: "❓" };
}

// ─── Quiz type badge ──────────────────────────────────────────────────────────

const QUIZ_ACCENT = "#8B6FD4"; // Purple — fallback when no persona

function QuizTypeBadge({ type }: { type: Quiz["question_type"] }) {
  const labels: Record<Quiz["question_type"], string> = {
    multiple_choice: "Multiple Choice",
    multiple_response: "Select All That Apply",
    free_text: "Free Response",
  };
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold text-white"
      style={{
        background: "linear-gradient(135deg, #8B6FD4, #5B8BD4)",
        boxShadow: "0 2px 8px rgba(139,111,212,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span>{labels[type]}</span>
    </div>
  );
}

// ─── MCQ / Multiple response option ──────────────────────────────────────────

interface OptionProps {
  option: QuizOption;
  selected: boolean;
  submitted: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function AnswerOption({ option, selected, submitted, isCorrect, isWrong, disabled, onToggle }: OptionProps) {
  let bg = "rgba(255,255,255,0.7)";
  let border = "1px solid rgba(139,111,212,0.2)";
  let textColor = "#2D2926";

  if (submitted && isCorrect) {
    bg = "rgba(157,190,138,0.25)";
    border = "2px solid #6A9E58";
    textColor = "#3A6628";
  } else if (submitted && isWrong) {
    bg = "rgba(212,84,74,0.15)";
    border = "2px solid #D4544A";
    textColor = "#8B2020";
  } else if (selected && !submitted) {
    bg = "rgba(139,111,212,0.15)";
    border = "2px solid #8B6FD4";
  }

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.97 }}
      className="w-full text-left rounded-2xl px-4 py-3 flex items-center gap-3 transition-all"
      style={{
        background: bg,
        border,
        backdropFilter: "blur(8px)",
        boxShadow: selected && !submitted ? "0 2px 12px rgba(139,111,212,0.2)" : "0 1px 4px rgba(26,22,18,0.06)",
      }}
    >
      {/* Indicator */}
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: submitted && isCorrect
            ? "#6A9E58"
            : submitted && isWrong
            ? "#D4544A"
            : selected && !submitted
            ? QUIZ_ACCENT
            : "rgba(139,111,212,0.15)",
          color: (submitted && (isCorrect || isWrong)) || (selected && !submitted) ? "white" : QUIZ_ACCENT,
        }}
      >
        {submitted && isCorrect ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : submitted && isWrong ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span className="text-xs font-sans font-bold">{option.id.toUpperCase()}</span>
        )}
      </div>
      <span className="font-sans text-sm leading-snug" style={{ color: textColor }}>
        {option.text}
      </span>
    </motion.button>
  );
}

// ─── Main QuizCard ────────────────────────────────────────────────────────────

export function QuizCard({ quiz, onVisible }: QuizCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const entryTimeRef = useRef<number | null>(null);
  const personaStyle = getPersonaStyle(quiz.persona_slug ?? null);
  const accentColor = personaStyle.color;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [freeTextValue, setFreeTextValue] = useState("");

  // Submission state
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    is_correct: boolean | null;
    correct_answer: string[] | { text: string };
    explanation: string;
  } | null>(null);

  // Help sheet state
  const [helpOpen, setHelpOpen] = useState(false);

  // Pre-populate if user already answered (from feed load)
  useEffect(() => {
    if (quiz.user_response) {
      setSubmitted(true);
      const ans = quiz.user_response.answer;
      if (Array.isArray(ans)) setSelectedIds(ans as string[]);
      else if (ans && typeof ans === "object" && "text" in (ans as object)) {
        setFreeTextValue((ans as { text: string }).text);
      }
      setSubmissionResult({
        is_correct: quiz.user_response.is_correct,
        correct_answer: quiz.correct_answer,
        explanation: quiz.explanation,
      });
    }
  }, [quiz.user_response, quiz.correct_answer, quiz.explanation]);

  // Intersection observer for impression tracking
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entryTimeRef.current = Date.now();
        } else if (entryTimeRef.current !== null) {
          const duration = Date.now() - entryTimeRef.current;
          onVisible(quiz.id, duration);
          entryTimeRef.current = null;
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [quiz.id, onVisible]);

  const toggleOption = useCallback((id: string) => {
    if (submitted) return;
    if (quiz.question_type === "multiple_choice") {
      setSelectedIds([id]);
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  }, [submitted, quiz.question_type]);

  const canSubmit = quiz.question_type === "free_text"
    ? freeTextValue.trim().length > 0
    : selectedIds.length > 0;

  async function handleSubmit() {
    if (!canSubmit || isSubmitting || submitted) return;
    setIsSubmitting(true);

    const answer = quiz.question_type === "free_text"
      ? { text: freeTextValue.trim() }
      : selectedIds;

    try {
      const res = await fetch("/api/quiz-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quiz.id, answer }),
      });
      if (res.ok) {
        const json = await res.json();
        setSubmitted(true);
        setSubmissionResult({
          is_correct: json.response.is_correct,
          correct_answer: json.correct_answer,
          explanation: json.explanation,
        });
      }
    } catch (err) {
      console.error("[quiz] submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const correctAnswerIds = submissionResult
    ? Array.isArray(submissionResult.correct_answer)
      ? submissionResult.correct_answer as string[]
      : []
    : [];

  const options = quiz.options ?? [];

  return (
    <div
      ref={cardRef}
      className="relative h-dvh w-full flex flex-col overflow-hidden"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Background gradient — tinted by persona accent color */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(160deg, #FFF8F0 0%, ${accentColor}14 50%, ${accentColor}22 100%)`,
        }}
      />

      {/* Decorative blobs using persona accent */}
      <div
        className="absolute top-[-60px] right-[-60px] w-52 h-52 rounded-full pointer-events-none"
        style={{ background: accentColor, filter: "blur(60px)", opacity: 0.14 }}
      />
      <div
        className="absolute bottom-24 left-[-50px] w-40 h-40 rounded-full pointer-events-none"
        style={{ background: accentColor, filter: "blur(50px)", opacity: 0.1 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">

        {/* Header */}
        <div className="px-5 pt-14 pb-3 flex items-start justify-between">
          <QuizTypeBadge type={quiz.question_type} />
          {/* Persona badge — shows who authored this quiz */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-semibold"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${accentColor}40`,
              color: accentColor,
            }}
          >
            <span>{personaStyle.emoji}</span>
            <span>{personaStyle.name}</span>
          </div>
        </div>

        {/* Scrollable answer area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col items-center justify-start">
        <div className="w-full flex flex-col gap-5" style={{ maxWidth: "min(100%, 580px)" }}>

          {/* Question */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative rounded-3xl p-6 overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(139,111,212,0.08))",
              border: "1px solid rgba(139,111,212,0.25)",
              boxShadow: "0 8px 32px rgba(139,111,212,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-3xl pointer-events-none" />
            <p className="relative z-10 font-display font-bold text-charcoal text-xl leading-snug">
              {quiz.question}
            </p>
          </motion.div>

          {/* Answer input area */}
          {quiz.question_type === "free_text" ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <textarea
                value={freeTextValue}
                onChange={(e) => {
                  if (!submitted) setFreeTextValue(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                readOnly={submitted}
                placeholder="Type your answer here…"
                rows={4}
                className="w-full resize-none rounded-2xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/40 focus:outline-none transition-all leading-relaxed"
                style={{
                  background: submitted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)",
                  border: `1px solid ${submitted ? "rgba(139,111,212,0.3)" : "rgba(139,111,212,0.4)"}`,
                  boxShadow: "0 2px 8px rgba(139,111,212,0.08)",
                }}
              />
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <AnimatePresence>
                {options.map((option, i) => {
                  const isSelected = selectedIds.includes(option.id);
                  const isCorrect = submitted && correctAnswerIds.includes(option.id);
                  const isWrong = submitted && isSelected && !correctAnswerIds.includes(option.id);

                  return (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <AnswerOption
                        option={option}
                        selected={isSelected}
                        submitted={submitted}
                        isCorrect={isCorrect}
                        isWrong={isWrong}
                        disabled={submitted}
                        onToggle={() => toggleOption(option.id)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Submit button (pre-submission) */}
          <AnimatePresence>
            {!submitted && (
              <motion.button
                key="submit-btn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: canSubmit ? 1 : 0.4, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="w-full py-3.5 rounded-2xl font-sans font-semibold text-sm text-white transition-all"
                style={{
                  background: canSubmit
                    ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                    : `${accentColor}4d`,
                  boxShadow: canSubmit
                    ? `0 4px 16px ${accentColor}59, inset 0 1px 0 rgba(255,255,255,0.25)`
                    : "none",
                }}
              >
                {isSubmitting ? "Submitting…" : "Submit Answer"}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Result reveal (post-submission) */}
          <AnimatePresence>
            {submitted && submissionResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="rounded-3xl overflow-hidden"
                style={{
                  border: submissionResult.is_correct === true
                    ? "2px solid #6A9E58"
                    : submissionResult.is_correct === false
                    ? "2px solid #D4544A"
                    : "2px solid rgba(139,111,212,0.4)",
                  boxShadow: submissionResult.is_correct === true
                    ? "0 4px 20px rgba(157,190,138,0.25)"
                    : submissionResult.is_correct === false
                    ? "0 4px 20px rgba(212,84,74,0.15)"
                    : "0 4px 20px rgba(139,111,212,0.15)",
                }}
              >
                {/* Result header */}
                <div
                  className="px-5 py-3 flex items-center gap-2.5"
                  style={{
                    background: submissionResult.is_correct === true
                      ? "rgba(157,190,138,0.2)"
                      : submissionResult.is_correct === false
                      ? "rgba(212,84,74,0.1)"
                      : "rgba(139,111,212,0.1)",
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: submissionResult.is_correct === true
                        ? "#6A9E58"
                        : submissionResult.is_correct === false
                        ? "#D4544A"
                        : QUIZ_ACCENT,
                    }}
                  >
                    {submissionResult.is_correct === true ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : submissionResult.is_correct === false ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="font-sans font-bold text-sm"
                    style={{
                      color: submissionResult.is_correct === true
                        ? "#3A6628"
                        : submissionResult.is_correct === false
                        ? "#8B2020"
                        : QUIZ_ACCENT,
                    }}
                  >
                    {submissionResult.is_correct === true
                      ? "Correct!"
                      : submissionResult.is_correct === false
                      ? "Not quite"
                      : "Response recorded"}
                  </span>
                </div>

                {/* Free text model answer */}
                {quiz.question_type === "free_text" && submissionResult.correct_answer && (
                  <div className="px-5 pt-3 pb-2">
                    <p className="font-sans text-xs font-semibold text-charcoal/50 uppercase tracking-wider mb-1">
                      Model answer
                    </p>
                    <p className="font-sans text-sm text-charcoal leading-relaxed">
                      {(submissionResult.correct_answer as { text: string }).text}
                    </p>
                  </div>
                )}

                {/* Explanation */}
                <div className="px-5 pt-2 pb-5">
                  <p className="font-sans text-xs font-semibold text-charcoal/50 uppercase tracking-wider mb-1">
                    Explanation
                  </p>
                  <p className="font-sans text-sm text-charcoal/85 leading-relaxed">
                    {submissionResult.explanation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ask the quiz's persona for help */}
          <motion.button
            type="button"
            onClick={() => setHelpOpen(true)}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-sans font-semibold text-sm transition-all"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: `1px solid ${accentColor}40`,
              boxShadow: `0 2px 10px ${accentColor}1a, inset 0 1px 0 rgba(255,255,255,0.6)`,
              color: accentColor,
            }}
          >
            <span>{personaStyle.emoji}</span>
            <span>Ask {personaStyle.name}</span>
          </motion.button>

          {/* Bottom padding spacer */}
          <div className="h-4" />
        </div>
        </div>
      </div>

      {/* Help sheet — defaults to the quiz's authoring persona */}
      <QuizHelpSheet
        quizId={quiz.id}
        question={quiz.question}
        hasAnswered={submitted}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        defaultPersonaSlug={quiz.persona_slug ?? undefined}
      />
    </div>
  );
}
