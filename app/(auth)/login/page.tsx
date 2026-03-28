"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  AnimatedBlobBg,
  Sparkle,
  FloatingDots,
  Flower,
  SparkleCluster,
} from "@/components/Decorations";

// ── Inline helpers ────────────────────────────────────────────────────────────

function Heart({
  size = 18,
  color = "#F5A0C8",
  delay = 0,
  className = "",
}: {
  size?: number;
  color?: string;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={`absolute pointer-events-none ${className}`}
      animate={{ y: [0, -7, 0], scale: [1, 1.12, 1], opacity: [0.65, 0.95, 0.65] }}
      transition={{ duration: 2.8 + delay * 0.4, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
    </motion.svg>
  );
}

// Thin iridescent border wrapper — achieves rainbow rim effect
function IridescentCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "2px",
        borderRadius: "2.4rem",
        background:
          "linear-gradient(135deg, #C9B8E8 0%, #F5B8D4 18%, #FFD4B8 36%, #F5D97A 54%, #9DBE8A 72%, #7890C8 90%, #C9B8E8 100%)",
        boxShadow:
          "0 12px 56px rgba(201,184,232,0.38), 0 2px 12px rgba(120,144,200,0.18)",
      }}
    >
      {children}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden">

      {/* ── Background ── */}
      <AnimatedBlobBg colors={["#DCC8F5", "#FFB8D4", "#B8D8FF"]} />

      {/* Extra blobs for richness */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 380, height: 340, background: "#F5D97A", top: "60%", left: "-8%", filter: "blur(72px)", opacity: 0.22 }}
        animate={{ x: [0, 18, -12, 0], y: [0, -18, 12, 0], scale: [1, 1.07, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 300, height: 270, background: "#9DBE8A", top: "5%", right: "-5%", filter: "blur(65px)", opacity: 0.2 }}
        animate={{ x: [0, -22, 14, 0], y: [0, 20, -14, 0], scale: [1, 0.94, 1.09, 1] }}
        transition={{ duration: 16, delay: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 220, height: 200, background: "#FFB8D4", top: "35%", right: "10%", filter: "blur(55px)", opacity: 0.25 }}
        animate={{ x: [0, -10, 8, 0], y: [0, 12, -8, 0], scale: [1, 1.05, 0.97, 1] }}
        transition={{ duration: 11, delay: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating dots */}
      <FloatingDots color="#C9B8E8" count={6} />

      {/* ── Scattered sparkles ── */}
      <Sparkle size={26} color="#DCC8F5" delay={0}   className="absolute top-[7%]   left-[7%]   opacity-75" animate />
      <Sparkle size={14} color="#F5D97A" delay={0.6} className="absolute top-[13%]  right-[9%]  opacity-65" animate />
      <Sparkle size={20} color="#9DBE8A" delay={1.2} className="absolute top-[44%]  left-[4%]   opacity-60" animate />
      <Sparkle size={10} color="#C9B8E8" delay={0.3} className="absolute top-[28%]  right-[6%]  opacity-65" animate />
      <Sparkle size={22} color="#FFB8D4" delay={1.8} className="absolute bottom-[22%] left-[10%] opacity-70" animate />
      <Sparkle size={12} color="#7890C8" delay={0.9} className="absolute bottom-[32%] right-[5%] opacity-55" animate />
      <Sparkle size={16} color="#F5D97A" delay={2.1} className="absolute bottom-[11%] right-[20%] opacity-60" animate />
      <Sparkle size={8}  color="#E8D5F5" delay={1.5} className="absolute top-[58%]  right-[24%] opacity-70" animate />
      <Sparkle size={18} color="#DCC8F5" delay={0.4} className="absolute top-[22%]  left-[2%]   opacity-55" animate />

      {/* ── Floating hearts ── */}
      <Heart size={18} color="#F5A0C8" delay={0}   className="top-[17%]    left-[19%]   opacity-70" />
      <Heart size={13} color="#FFB8D4" delay={1.3} className="top-[38%]    right-[15%]  opacity-55" />
      <Heart size={15} color="#C9B8E8" delay={0.7} className="bottom-[26%] left-[23%]   opacity-65" />
      <Heart size={11} color="#F5D97A" delay={2.0} className="bottom-[14%] right-[27%]  opacity-50" />
      <Heart size={9}  color="#9DBE8A" delay={1.6} className="top-[70%]    left-[6%]    opacity-45" />

      {/* ── Flowers ── */}
      <Flower size={32} color="#FFD4B8" centerColor="#FFF8F0" className="absolute top-[8%]   right-[4%]  opacity-60" animate />
      <Flower size={24} color="#C9B8E8" centerColor="#FFF8F0" className="absolute bottom-[16%] left-[4%]  opacity-55" animate />
      <Flower size={20} color="#F5D97A" centerColor="#FFF8F0" className="absolute top-[52%]  left-[1%]   opacity-45" animate />
      <Flower size={18} color="#9DBE8A" centerColor="#FFF8F0" className="absolute bottom-[8%]  left-[48%] opacity-40" animate />

      {/* ── Logo ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-center mb-8 relative z-10"
      >
        {/* Mini sparkle cluster above logo */}
        <div className="flex justify-center items-end gap-2 mb-2 h-5">
          <Sparkle size={9}  color="#F5D97A" delay={0.2}  animate />
          <Sparkle size={14} color="#DCC8F5" delay={0.8}  animate />
          <Sparkle size={9}  color="#9DBE8A" delay={1.4}  animate />
        </div>

        {/* Logo with lavender glow aura */}
        <div className="relative inline-block">
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 70% 55% at 50% 55%, rgba(201,184,232,0.55) 0%, transparent 75%)",
              transform: "scale(1.5)",
              borderRadius: "50%",
            }}
            animate={{ opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <Image
            src="/logo.png"
            alt="Scrollabus"
            width={220}
            height={120}
            className="relative mb-2 mx-auto drop-shadow-lg"
            priority
          />
        </div>

        {/* Tagline flanked by tiny sparkles */}
        <p className="font-sans text-charcoal/55 text-sm flex items-center justify-center gap-2 mt-1">
          <Sparkle size={7} color="#C9B8E8" animate delay={0.5} />
          Doomscroll your syllabus.
          <Sparkle size={7} color="#F5D97A" animate delay={1.1} />
        </p>
      </motion.div>

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.14, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {sent ? (
          <IridescentCard>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="text-center p-8 relative overflow-hidden"
              style={{
                borderRadius: "calc(2.4rem - 2px)",
                background: "rgba(255, 250, 245, 0.91)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              <div
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{
                  height: "38%",
                  borderRadius: "calc(2.4rem - 2px) calc(2.4rem - 2px) 0 0",
                  background: "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)",
                }}
              />
              <SparkleCluster color="#DCC8F5" className="absolute -top-2 right-2 opacity-75 z-20" />

              <div className="text-4xl mb-4">✉️</div>
              <h2 className="font-display font-bold text-xl text-charcoal mb-2">
                Check your inbox
              </h2>
              <p className="font-sans text-charcoal/60 text-sm leading-relaxed">
                We sent a magic link to{" "}
                <span className="font-semibold text-charcoal">{email}</span>.
                Click it to sign in — no password needed.
              </p>

              {/* Celebratory sparkle row */}
              <div className="flex justify-center gap-3 mt-5">
                <Sparkle size={10} color="#F5D97A" animate delay={0}   />
                <Sparkle size={14} color="#DCC8F5" animate delay={0.4} />
                <Sparkle size={10} color="#9DBE8A" animate delay={0.8} />
                <Sparkle size={14} color="#FFB8D4" animate delay={1.2} />
                <Sparkle size={10} color="#7890C8" animate delay={1.6} />
              </div>
            </motion.div>
          </IridescentCard>
        ) : (
          <IridescentCard>
            <form
              onSubmit={handleSubmit}
              className="relative overflow-hidden"
              style={{
                borderRadius: "calc(2.4rem - 2px)",
                padding: "1.75rem",
                background: "rgba(255, 250, 245, 0.91)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
              }}
            >
              {/* Top glossy sheen */}
              <div
                className="absolute inset-x-0 top-0 pointer-events-none"
                style={{
                  height: "38%",
                  borderRadius: "calc(2.4rem - 2px) calc(2.4rem - 2px) 0 0",
                  background: "linear-gradient(to bottom, rgba(255,255,255,0.55), transparent)",
                }}
              />

              {/* SparkleCluster top-right */}
              <SparkleCluster color="#DCC8F5" className="absolute -top-1 right-4 opacity-70 z-20" />

              {/* Small heart bottom-right */}
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="#FFB8D4"
                className="absolute bottom-6 right-7 opacity-55 pointer-events-none"
              >
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
              {/* Small sparkle bottom-left */}
              <Sparkle size={10} color="#F5D97A" delay={1.5} className="absolute bottom-5 left-6 opacity-50 pointer-events-none" animate />

              {/* Heading */}
              <h2 className="relative z-10 font-display font-bold text-2xl text-charcoal flex items-center gap-2 mb-1">
                <Sparkle size={12} color="#C9B8E8" animate delay={0.2} />
                Sign in
                <Sparkle size={10} color="#F5D97A" animate delay={0.9} />
              </h2>

              {/* Squiggly divider */}
              <div className="relative z-10 mb-4">
                <svg width="100%" height="7" viewBox="0 0 280 7" preserveAspectRatio="none" fill="none">
                  <path
                    d="M0 3.5 Q35 0 70 3.5 Q105 7 140 3.5 Q175 0 210 3.5 Q245 7 280 3.5"
                    stroke="#DEC8AA"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>

              {/* Email field */}
              <div className="relative z-10 mb-4">
                <label className="block text-xs font-sans font-semibold text-charcoal/45 mb-1.5 uppercase tracking-widest">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  required
                  className="w-full bg-white/65 rounded-2xl px-4 py-3 text-base font-sans text-charcoal placeholder:text-charcoal/25 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200/80 transition-all"
                  style={{
                    boxShadow: "inset 0 1px 3px rgba(26,22,18,0.05)",
                    backdropFilter: "blur(8px)",
                  }}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 text-sm font-sans text-cherry bg-cherry-light/20 px-3 py-2 rounded-xl border border-cherry/20 mb-4"
                >
                  {error}
                </motion.p>
              )}

              {/* Lavender gel button */}
              <motion.button
                type="submit"
                disabled={loading || !email}
                className="relative z-10 btn-gel w-full py-3.5 rounded-2xl disabled:opacity-30 text-base font-semibold mb-3"
                style={{
                  background: "linear-gradient(135deg, #D5C8F5 0%, #C9B8E8 50%, #B4A0DC 100%)",
                  color: "#2D2926",
                  boxShadow:
                    "0 4px 22px rgba(201,184,232,0.55), inset 0 1px 0 rgba(255,255,255,0.55)",
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {loading ? "Sending…" : "Send magic link ✦"}
              </motion.button>

              <p className="relative z-10 text-xs font-sans text-charcoal/35 text-center tracking-wide">
                ✦ No password. No stress. Just learning. ✦
              </p>
            </form>
          </IridescentCard>
        )}
      </motion.div>
    </div>
  );
}
