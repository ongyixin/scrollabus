"use client";

import { motion } from "framer-motion";

// ─── 4-Pointed Sparkle Star ───────────────────────────────────────────────────

interface SparkleProps {
  size?: number;
  color?: string;
  animate?: boolean;
  delay?: number;
  className?: string;
}

export function Sparkle({ size = 16, color = "#C9B8E8", animate = true, delay = 0, className }: SparkleProps) {
  const s = size;
  const c = s / 2;
  const arm = s * 0.42;
  const inner = s * 0.10;

  // 4-pointed star path
  const d = `
    M ${c} ${c - arm}
    Q ${c + inner} ${c - inner} ${c + arm} ${c}
    Q ${c + inner} ${c + inner} ${c} ${c + arm}
    Q ${c - inner} ${c + inner} ${c - arm} ${c}
    Q ${c - inner} ${c - inner} ${c} ${c - arm}
    Z
  `;

  if (!animate) {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" className={className}>
        <path d={d} fill={color} />
      </svg>
    );
  }

  return (
    <motion.svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      className={className}
      animate={{
        scale: [1, 0.75, 1],
        rotate: [0, 15, 0],
        opacity: [1, 0.55, 1],
      }}
      transition={{
        duration: 2.2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <path d={d} fill={color} />
    </motion.svg>
  );
}

// ─── Cluster of Sparkles (3-4 at random positions) ───────────────────────────

interface SparkleClusterProps {
  color?: string;
  className?: string;
}

export function SparkleCluster({ color = "#C9B8E8", className }: SparkleClusterProps) {
  return (
    <div className={`relative pointer-events-none ${className ?? ""}`} style={{ width: 56, height: 48 }}>
      <Sparkle size={12} color={color} delay={0}    className="absolute top-0 left-2" />
      <Sparkle size={8}  color={color} delay={0.4}  className="absolute top-4 right-0" />
      <Sparkle size={10} color={color} delay={0.8}  className="absolute bottom-0 left-8" />
      <Sparkle size={6}  color={color} delay={1.2}  className="absolute top-2 right-6" />
    </div>
  );
}

// ─── Squiggly Line Divider ────────────────────────────────────────────────────

interface SquiggleProps {
  color?: string;
  width?: number;
  className?: string;
}

export function Squiggle({ color = "#EDE0CC", width = 160, className }: SquiggleProps) {
  const h = 10;
  const amplitude = 4;
  const freq = 16;
  const steps = Math.floor(width / freq);

  let d = `M 0 ${h / 2}`;
  for (let i = 0; i <= steps; i++) {
    const x = i * freq;
    const y = h / 2 + (i % 2 === 0 ? -amplitude : amplitude);
    const cx = x - freq / 2;
    const cy = h / 2 + (i % 2 === 0 ? amplitude : -amplitude);
    d += ` Q ${cx} ${cy} ${x} ${y}`;
  }

  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} fill="none" className={className}>
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── Soft Blob Background Shape ───────────────────────────────────────────────

interface BlobProps {
  color?: string;
  size?: number;
  animate?: boolean;
  delay?: number;
  className?: string;
}

export function Blob({ color = "#C9B8E8", size = 200, animate = true, delay = 0, className }: BlobProps) {
  const s = size;

  if (!animate) {
    return (
      <svg width={s} height={s} viewBox="0 0 200 200" fill="none" className={className}>
        <path
          d="M 50,20 C 80,5 130,5 155,30 C 180,55 190,100 175,135 C 160,170 115,185 80,180 C 45,175 15,150 10,115 C 5,80 20,35 50,20 Z"
          fill={color}
          opacity="0.4"
        />
      </svg>
    );
  }

  return (
    <motion.svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      animate={{
        scale: [1, 1.05, 0.96, 1],
        rotate: [0, 8, -5, 0],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <path
        d="M 50,20 C 80,5 130,5 155,30 C 180,55 190,100 175,135 C 160,170 115,185 80,180 C 45,175 15,150 10,115 C 5,80 20,35 50,20 Z"
        fill={color}
        opacity="0.4"
      />
    </motion.svg>
  );
}

// ─── Floating Dots (soft Y2K scatter) ────────────────────────────────────────

interface FloatingDotsProps {
  color?: string;
  count?: number;
  className?: string;
}

export function FloatingDots({ color = "#C9B8E8", count = 5, className }: FloatingDotsProps) {
  const positions = [
    { x: "10%", y: "15%", size: 6, delay: 0 },
    { x: "75%", y: "8%",  size: 4, delay: 0.5 },
    { x: "88%", y: "55%", size: 8, delay: 1.0 },
    { x: "20%", y: "78%", size: 5, delay: 0.7 },
    { x: "60%", y: "85%", size: 3, delay: 1.5 },
    { x: "45%", y: "25%", size: 4, delay: 0.3 },
  ].slice(0, count);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className ?? ""}`}>
      {positions.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: pos.x,
            top: pos.y,
            width: pos.size,
            height: pos.size,
            backgroundColor: color,
            opacity: 0.45,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.45, 0.7, 0.45],
          }}
          transition={{
            duration: 3 + i * 0.4,
            delay: pos.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Small Flower / Daisy (empty state accent) ────────────────────────────────

interface FlowerProps {
  size?: number;
  color?: string;
  centerColor?: string;
  animate?: boolean;
  className?: string;
}

export function Flower({ size = 32, color = "#F5D97A", centerColor = "#FFF8F0", animate = true, className }: FlowerProps) {
  const petalCount = 6;
  const petals = Array.from({ length: petalCount }, (_, i) => {
    const angle = (i * 360) / petalCount;
    return angle;
  });

  const svgContent = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={animate ? undefined : className}>
      {petals.map((angle, i) => (
        <ellipse
          key={i}
          cx="16"
          cy="16"
          rx="4"
          ry="7"
          fill={color}
          opacity="0.85"
          transform={`rotate(${angle} 16 16) translate(0 -6)`}
        />
      ))}
      <circle cx="16" cy="16" r="5" fill={centerColor} />
      <circle cx="16" cy="16" r="3" fill={color} opacity="0.6" />
    </svg>
  );

  if (!animate) return svgContent;

  return (
    <motion.div
      className={className}
      animate={{ rotate: [0, 10, -8, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {svgContent}
    </motion.div>
  );
}

// ─── Persona Glow Ring (for sprite containers) ────────────────────────────────

interface GlowRingProps {
  color: string;
  size: number;
  children: React.ReactNode;
  className?: string;
}

export function GlowRing({ color, size, children, className }: GlowRingProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className ?? ""}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      {/* Glow halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color, opacity: 0.2 }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Animated Background Blobs (for login/onboarding) ────────────────────────

interface AnimatedBlobBgProps {
  colors?: string[];
  className?: string;
}

export function AnimatedBlobBg({ colors = ["#E8D5F5", "#FFD4B8", "#C9B8E8"], className }: AnimatedBlobBgProps) {
  const blobs = [
    { color: colors[0], width: 300, height: 280, top: "-10%", left: "-15%", delay: 0 },
    { color: colors[1] ?? colors[0], width: 260, height: 240, top: "55%", right: "-10%", delay: 2 },
    { color: colors[2] ?? colors[0], width: 220, height: 200, top: "30%", left: "40%", delay: 4 },
  ];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className ?? ""}`}>
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: b.width,
            height: b.height,
            background: b.color,
            top: b.top,
            left: "left" in b ? b.left : undefined,
            right: "right" in b ? b.right : undefined,
            filter: "blur(60px)",
            opacity: 0.35,
          }}
          animate={{
            x: [0, 20, -15, 0],
            y: [0, -20, 15, 0],
            scale: [1, 1.08, 0.94, 1],
          }}
          transition={{
            duration: 10 + i * 2,
            delay: b.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
