interface InterestsPillsProps {
  interests: string[];
  removable?: boolean;
  onRemove?: (interest: string) => void;
  size?: "sm" | "md";
  highlightInterests?: string[];
}

export function InterestsPills({
  interests,
  removable = false,
  onRemove,
  size = "md",
  highlightInterests = [],
}: InterestsPillsProps) {
  if (interests.length === 0) return null;

  const textSize = size === "sm" ? "text-[11px]" : "text-xs";
  const padding = size === "sm" ? "px-2.5 py-0.5" : "px-3 py-1";

  return (
    <div className="flex flex-wrap gap-1.5">
      {interests.map((interest) => {
        const isHighlighted = highlightInterests.includes(interest);
        return (
          <span
            key={interest}
            className={`inline-flex items-center gap-1 rounded-full font-sans font-medium transition-colors ${textSize} ${padding} ${
              isHighlighted
                ? "bg-lavender text-charcoal"
                : "bg-lavender/20 text-lavender-deep"
            }`}
          >
            {interest}
            {removable && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(interest)}
                className="ml-0.5 rounded-full hover:bg-lavender/40 transition-colors p-0.5 leading-none"
                aria-label={`Remove ${interest}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
