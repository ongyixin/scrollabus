import { POST_TYPE_CONFIG } from "@/lib/constants";
import type { PostType } from "@/lib/types";

interface PostTypeTagProps {
  type: PostType;
  glass?: boolean;
}

export function PostTypeTag({ type, glass = false }: PostTypeTagProps) {
  const config = POST_TYPE_CONFIG[type];
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold
        transition-transform active:scale-95
        ${glass
          ? "bg-white/70 backdrop-blur-sm border border-white/60 shadow-soft text-charcoal"
          : `border ${config.bgClass} ${config.borderClass} ${config.textClass}`
        }
      `}
      style={glass ? undefined : {
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 4px rgba(26,22,18,0.08)",
      }}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
