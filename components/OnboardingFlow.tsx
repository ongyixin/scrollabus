"use client";

import type { ComponentType } from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  LectureBestieSprite,
  ExamGremlinSprite,
  ProblemGrinderSprite,
  DoodleProfSprite,
  MemeLordSprite,
  StudyBardSprite,
} from "@/components/PersonaSprites";
import { AnimatedBlobBg, Sparkle, FloatingDots, GlowRing, Squiggle } from "@/components/Decorations";
import { PERSONA_CONFIG } from "@/lib/constants";
import { PERSONAS } from "@/lib/personas";

type SpriteComponent = ComponentType<{ size?: number }>;

const ONBOARDING_SPRITES: Record<string, SpriteComponent> = {
  "lecture-bestie": LectureBestieSprite,
  "exam-gremlin": ExamGremlinSprite,
  "problem-grinder": ProblemGrinderSprite,
  "doodle-prof": DoodleProfSprite,
  "meme-lord": MemeLordSprite,
  "study-bard": StudyBardSprite,
};

const ONBOARDING_CARD_STYLE: Record<
  string,
  { gradientFrom: string; gradientTo: string; borderColor: string }
> = {
  "lecture-bestie": {
    gradientFrom: "#F5F0FF",
    gradientTo: "#E8D5F5",
    borderColor: "rgba(201,184,232,0.5)",
  },
  "exam-gremlin": {
    gradientFrom: "#FFF5F5",
    gradientTo: "#FFD4D0",
    borderColor: "rgba(212,84,74,0.3)",
  },
  "problem-grinder": {
    gradientFrom: "#F2F9F0",
    gradientTo: "#D4EBCA",
    borderColor: "rgba(157,190,138,0.4)",
  },
  "doodle-prof": {
    gradientFrom: "#FFFBF0",
    gradientTo: "#FFE8B8",
    borderColor: "rgba(245,200,66,0.45)",
  },
  "meme-lord": {
    gradientFrom: "#F8FFF0",
    gradientTo: "#DCF5A8",
    borderColor: "rgba(184,232,107,0.4)",
  },
  "study-bard": {
    gradientFrom: "#F0FAFF",
    gradientTo: "#C8E8F5",
    borderColor: "rgba(126,200,227,0.4)",
  },
};

const personas = PERSONA_CONFIG.map((c) => {
  const p = PERSONAS[c.slug];
  const Sprite = ONBOARDING_SPRITES[c.slug];
  const style = ONBOARDING_CARD_STYLE[c.slug];
  return {
    slug: c.slug,
    Sprite,
    name: p.name,
    roleTag: p.role_tag,
    description: p.description,
    accentColor: p.accent_color,
    ...style,
  };
});

const howItWorksSteps = [
  {
    number: "1",
    title: "Upload your notes",
    description: "Paste text, drop a PDF, or share a link.",
    emoji: "📄",
    accentColor: "#C9B8E8",
  },
  {
    number: "2",
    title: "AI creates your feed",
    description: "Six AI personas turn your material into bite-sized posts.",
    emoji: "✨",
    accentColor: "#F5D97A",
  },
  {
    number: "3",
    title: "Scroll & learn",
    description: "Swipe through concepts, traps, and worked examples.",
    emoji: "📱",
    accentColor: "#9DBE8A",
  },
];

const stepVariants = {
  enter: { opacity: 0, x: 48, scale: 0.97 },
  center: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -48, scale: 0.97 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1 },
};

interface OnboardingFlowProps {
  displayName: string | null;
  completeOnboarding: (formData: FormData) => Promise<void>;
}

export default function OnboardingFlow({ displayName, completeOnboarding }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [nameInput, setNameInput] = useState(displayName ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TOTAL_STEPS = 4;

  async function handleFinish(skip = false) {
    setIsSubmitting(true);
    const formData = new FormData();
    if (!skip && nameInput.trim()) {
      formData.set("displayName", nameInput.trim());
    }
    await completeOnboarding(formData);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-between px-5 py-10 relative overflow-hidden">
      {/* Animated background */}
      <AnimatedBlobBg colors={["#E8D5F5", "#FFD4B8", "#C9D4F5"]} />
      <FloatingDots color="#C9B8E8" count={5} />

      {/* ── Progress dots ─────────────────────────────────────────────── */}
      <div className="flex gap-2 pt-2 relative z-10">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === step ? 28 : 8,
              backgroundColor: i === step ? "#2D2926" : i < step ? "#9B85CE" : "#EDE0CC",
              boxShadow: i === step ? "0 0 0 0px rgba(45,41,38,0)" : "none",
            }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-2 rounded-full"
            style={{
              boxShadow: i === step ? "inset 0 1px 0 rgba(255,255,255,0.3)" : "none",
            }}
          />
        ))}
      </div>

      {/* ── Step content ───────────────────────────────────────────────── */}
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center relative z-10">
        <AnimatePresence mode="wait">

          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center text-center gap-7"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 20 }}
              >
                <Image
                  src="/logo.png"
                  alt="Scrollabus"
                  width={200}
                  height={109}
                  priority
                  className="drop-shadow-md"
                />
              </motion.div>

              <div className="space-y-1.5">
                <h1 className="font-display font-bold text-3xl text-charcoal leading-tight">
                  Welcome to Scrollabus
                </h1>
                <p className="font-sans text-charcoal/55 text-base">
                  Your syllabus, but make it bingeable.
                </p>
              </div>

              {/* Persona sprites with glow rings */}
              <div className="flex flex-wrap gap-2.5 items-end justify-center max-w-[300px]">
                {PERSONA_CONFIG.map((c, i) => {
                  const Sprite = ONBOARDING_SPRITES[c.slug];
                  const delay = i * 0.08;
                  return (
                    <motion.div
                      key={c.slug}
                      initial={{ y: 0 }}
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 1.8,
                        delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <GlowRing color={c.accentColor} size={44}>
                        <Sprite size={44} />
                      </GlowRing>
                    </motion.div>
                  );
                })}
              </div>

              {/* Decorative sparkles */}
              <Sparkle size={16} color="#C9B8E8" delay={0}   className="absolute top-8 left-4 opacity-55" animate />
              <Sparkle size={10} color="#F5D97A" delay={0.7} className="absolute top-12 right-6 opacity-50" animate />
              <Sparkle size={12} color="#9DBE8A" delay={1.3} className="absolute bottom-8 left-8 opacity-50" animate />
            </motion.div>
          )}

          {/* Step 1: Meet personas */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-2xl text-charcoal">
                  Meet your study crew
                </h2>
                <Sparkle size={14} color="#C9B8E8" delay={0} className="opacity-70" animate />
              </div>

              <motion.div
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2.5 max-h-[min(62vh,520px)] overflow-y-auto pr-1 -mr-1"
              >
                {personas.map(({ slug, Sprite, name, roleTag, description, accentColor, gradientFrom, gradientTo, borderColor }) => (
                  <motion.div
                    key={slug}
                    variants={cardVariants}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="rounded-3xl flex items-start gap-4 px-4 py-4 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(145deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
                      border: `1px solid ${borderColor}`,
                      boxShadow: `0 4px 20px ${accentColor}22, inset 0 1px 0 rgba(255,255,255,0.6)`,
                    }}
                  >
                    {/* Glossy sheen */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-3xl pointer-events-none" />

                    <div className="shrink-0 relative z-10">
                      <GlowRing color={accentColor} size={52}>
                        <Sprite size={52} />
                      </GlowRing>
                    </div>

                    <div className="flex-1 min-w-0 relative z-10">
                      <p className="font-display font-bold text-base text-charcoal leading-tight">
                        {name}
                      </p>
                      <p className="font-mono text-xs font-bold mt-0.5" style={{ color: accentColor }}>
                        {roleTag}
                      </p>
                      <p className="font-sans text-xs text-charcoal/65 mt-1 leading-snug">
                        {description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: How it works */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-2xl text-charcoal">
                  How it works
                </h2>
                <Squiggle color="#EDE0CC" width={80} />
              </div>

              <motion.div
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-3"
              >
                {howItWorksSteps.map(({ number, title, description, emoji, accentColor }) => (
                  <motion.div
                    key={number}
                    variants={cardVariants}
                    transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                    className="rounded-2xl flex items-start gap-4 px-4 py-4 relative overflow-hidden"
                    style={{
                      background: "rgba(253,250,245,0.85)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: `1px solid ${accentColor}30`,
                      boxShadow: `0 3px 12px ${accentColor}15, inset 0 1px 0 rgba(255,255,255,0.7)`,
                    }}
                  >
                    {/* Glossy sheen */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-2xl pointer-events-none" />

                    <div
                      className="shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}80, ${accentColor}cc)`,
                        boxShadow: `0 3px 10px ${accentColor}45, inset 0 1px 0 rgba(255,255,255,0.3)`,
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent rounded-2xl" />
                      <span className="relative z-10 text-base">{emoji}</span>
                    </div>

                    <div className="relative z-10">
                      <p className="font-sans font-semibold text-sm text-charcoal leading-tight">
                        {title}
                      </p>
                      <p className="font-sans text-xs text-charcoal/60 mt-0.5 leading-snug">
                        {description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Name */}
          {step === 3 && (
            <motion.div
              key="step-3"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col gap-5"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display font-bold text-2xl text-charcoal">
                    What should we call you?
                  </h2>
                </div>
                <p className="font-sans text-charcoal/50 text-sm">
                  You can always change this later.
                </p>
              </div>

              <div className="rounded-3xl p-5 relative overflow-hidden" style={{
                background: "rgba(255,248,240,0.80)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.6)",
                boxShadow: "0 6px 30px rgba(201,184,232,0.2), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}>
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent rounded-t-3xl pointer-events-none" />
                <label className="relative z-10 block text-xs font-sans font-semibold text-charcoal/50 mb-2 uppercase tracking-wide">
                  Display name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name"
                  className="relative z-10 w-full bg-warm-50/70 rounded-xl px-4 py-3 text-base font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/70 border border-warm-200 transition-shadow"
                  style={{ boxShadow: "inset 0 1px 3px rgba(26,22,18,0.05)" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm flex flex-col gap-3 pb-safe relative z-10">
        {step < 3 ? (
          <motion.button
            onClick={() => setStep((s) => s + 1)}
            className="btn-gel btn-gel-dark w-full py-4 rounded-2xl text-base"
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {step === 0 ? "Let's go ✨" : step === 2 ? "Almost done" : "Next →"}
          </motion.button>
        ) : (
          <>
            <motion.button
              onClick={() => handleFinish(false)}
              disabled={isSubmitting}
              className="btn-gel btn-gel-dark w-full py-4 rounded-2xl text-base disabled:opacity-40"
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {isSubmitting ? "Starting…" : "Start scrolling 🚀"}
            </motion.button>
            <button
              onClick={() => handleFinish(true)}
              disabled={isSubmitting}
              className="font-sans text-sm text-charcoal/40 underline underline-offset-2 disabled:opacity-40"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
