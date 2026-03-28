"use client";

import { motion } from "framer-motion";
import type { Persona } from "@/lib/types";
import { PersonaSprite } from "./PersonaSprites";

interface PersonaBadgeProps {
  persona: Pick<Persona, "name" | "slug" | "accent_color" | "role_tag" | "emoji">;
  size?: "sm" | "md";
  onClick?: () => void;
}

export function PersonaBadge({ persona, size = "md", onClick }: PersonaBadgeProps) {
  const isSmall = size === "sm";
  const spriteSize = isSmall ? 32 : 40;
  const avatarClass = isSmall ? "w-8 h-8" : "w-11 h-11";

  const inner = (
    <div
      className={`flex items-center gap-2 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      {/* Avatar sprite with glow ring */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Glow halo */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: persona.accent_color,
            filter: "blur(6px)",
            opacity: 0.4,
            transform: "scale(1.2)",
          }}
        />
        <div
          className={`
            relative rounded-full overflow-hidden ring-2 ring-white/70 shrink-0 flex items-center justify-center
            ${avatarClass}
          `}
          style={{ backgroundColor: persona.accent_color + "30" }}
        >
          <PersonaSprite slug={persona.slug} size={spriteSize} />
        </div>
      </div>

      {/* Name + role */}
      <div className="min-w-0">
        <p className={`font-display font-bold text-charcoal leading-tight drop-shadow-sm ${isSmall ? "text-sm" : "text-base"}`}>
          {persona.name}
        </p>
        <p
          className={`font-mono font-semibold leading-tight ${isSmall ? "text-[10px]" : "text-xs"}`}
          style={{ color: persona.accent_color }}
        >
          {persona.role_tag}
        </p>
      </div>
    </div>
  );

  if (!onClick) return inner;

  return (
    <motion.div whileTap={{ scale: 0.94 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
      {inner}
    </motion.div>
  );
}
