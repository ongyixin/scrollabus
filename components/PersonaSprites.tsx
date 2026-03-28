// Illustrated sprite components for the three AI study personas.
// Each reflects the persona's visual identity: color, shape, and expression.
// SVG filter def for per-sprite ambient glow — referenced by id in each sprite.
const GlowFilter = ({ id, color }: { id: string; color: string }) => (
  <defs>
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feFlood floodColor={color} floodOpacity="0.35" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

export function LectureBestieSprite({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 6px rgba(201,184,232,0.5))" }}
    >
      <GlowFilter id="glow-bestie" color="#C9B8E8" />
      {/* Head */}
      <circle cx="22" cy="22" r="18" fill="#C9B8E8" />

      {/* Hair bow — drawn after head so it sits on top */}
      <path d="M22 8 Q12 0 5 5 Q9 15 22 8 Z"  fill="#9D82C8" />
      <path d="M22 8 Q32 0 39 5 Q35 15 22 8 Z" fill="#9D82C8" />
      <circle cx="22" cy="8" r="4" fill="#7B5EA7" />

      {/* Eyebrows — gently arched */}
      <path d="M11 15 Q15 12.5 19 14.5" stroke="#3A255E" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M25 14.5 Q29 12.5 33 15"  stroke="#3A255E" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Lashes — three per eye */}
      <line x1="13"   y1="17.5" x2="11.5" y2="15.5" stroke="#3A255E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="15"   y1="16.5" x2="14.5" y2="14"   stroke="#3A255E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="17"   y1="17"   x2="17.5" y2="15"   stroke="#3A255E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="27"   y1="17"   x2="26.5" y2="15"   stroke="#3A255E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="29"   y1="16.5" x2="29.5" y2="14"   stroke="#3A255E" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="31"   y1="17.5" x2="32.5" y2="15.5" stroke="#3A255E" strokeWidth="1.1" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="15" cy="20" r="4.5" fill="#3A255E" />
      <circle cx="29" cy="20" r="4.5" fill="#3A255E" />
      {/* Eye sparkles */}
      <circle cx="16.5" cy="18.5" r="1.6" fill="white" />
      <circle cx="30.5" cy="18.5" r="1.6" fill="white" />

      {/* Blush cheeks */}
      <ellipse cx="10"  cy="26" rx="4" ry="2.8" fill="#F0B8D8" opacity="0.55" />
      <ellipse cx="34"  cy="26" rx="4" ry="2.8" fill="#F0B8D8" opacity="0.55" />

      {/* Smile */}
      <path d="M13 29 Q22 37 31 29" stroke="#3A255E" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* 4-pointed star accent — bottom right */}
      <path d="M38 35 L39 38 L42 39 L39 40 L38 43 L37 40 L34 39 L37 38 Z" fill="#9D82C8" />
    </svg>
  );
}

export function ExamGremlinSprite({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 6px rgba(212,84,74,0.45))" }}
    >
      <GlowFilter id="glow-gremlin" color="#D4544A" />
      {/* Devil horns — drawn first so starburst overlaps their base */}
      <polygon points="14,9 8,0 21,5"  fill="#A83028" />
      <polygon points="30,9 23,5 36,0" fill="#A83028" />

      {/* Head — 8-spike starburst centered at (22,22), outer r=20, inner r=13 */}
      <path
        d="M22,2 L27,10 L36.1,7.9 L34,17 L42,22 L34,27 L36.1,36.1 L27,34 L22,42 L17,34 L7.9,36.1 L10,27 L2,22 L10,17 L7.9,7.9 L17,10 Z"
        fill="#D4544A"
      />

      {/* Angry eyebrows — long sharp diagonals angled inward */}
      <line x1="10" y1="16" x2="18" y2="19.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="34" y1="16" x2="26" y2="19.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />

      {/* Eyes — "><" chevrons, spread wide */}
      <polyline points="11,19 19,23 11,27" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="33,19 25,23 33,27" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Grin — wide */}
      <path d="M13 30 Q22 36 31 30" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* Fangs */}
      <line x1="17"   y1="30.5" x2="16.5" y2="33.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22"   y1="31.5" x2="22"   y2="35"   stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="27"   y1="30.5" x2="27.5" y2="33.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ProblemGrinderSprite({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 2px 6px rgba(157,190,138,0.5))" }}
    >
      <GlowFilter id="glow-grinder" color="#9DBE8A" />
      {/* Shirt — drawn first, head sits on top */}
      <path d="M5 27 L5 39 Q5 42 8 42 L36 42 Q39 42 39 39 L39 27 Z" fill="#7BA068" />
      {/* Collar V */}
      <path d="M13 29 L22 25 L31 29" stroke="#5A7A48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tie body */}
      <path d="M20.5 26 L19.5 37 L22 40.5 L24.5 37 L23.5 26 Z" fill="#2B4023" />
      {/* Tie knot */}
      <rect x="20" y="24" width="4" height="3.5" rx="0.8" fill="#1C2E18" />

      {/* Head — rounded square, proportional to other sprites */}
      <rect x="5" y="3" width="34" height="27" rx="9" fill="#9DBE8A" />

      {/* Eyebrows — furrowed inward for concentration */}
      <path d="M8  11 Q14 8.5 19 10.5" stroke="#2B4023" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M25 10.5 Q30 8.5 36 11"  stroke="#2B4023" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      {/* Glasses — left lens with tint */}
      <circle cx="14.5" cy="17" r="5.5" fill="white" fillOpacity="0.25" stroke="#2B4023" strokeWidth="2" />
      {/* Glasses — right lens */}
      <circle cx="29.5" cy="17" r="5.5" fill="white" fillOpacity="0.25" stroke="#2B4023" strokeWidth="2" />
      {/* Bridge */}
      <line x1="20" y1="17" x2="24"  y2="17" stroke="#2B4023" strokeWidth="1.8" />
      {/* Arms */}
      <line x1="5"  y1="17" x2="9"   y2="17" stroke="#2B4023" strokeWidth="1.8" />
      <line x1="35" y1="17" x2="39"  y2="17" stroke="#2B4023" strokeWidth="1.8" />
      {/* Pupils — looking slightly up */}
      <circle cx="14.5" cy="16.5" r="2.2" fill="#2B4023" />
      <circle cx="29.5" cy="16.5" r="2.2" fill="#2B4023" />

      {/* Focused mouth */}
      <path d="M14 25 Q22 28 30 25" stroke="#2B4023" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Hash mark accent — top-right */}
      <line x1="32" y1="6"  x2="32" y2="12" stroke="#2B4023" strokeWidth="1.3" opacity="0.35" />
      <line x1="35" y1="6"  x2="35" y2="12" stroke="#2B4023" strokeWidth="1.3" opacity="0.35" />
      <line x1="30.5" y1="8.5" x2="36.5" y2="8.5" stroke="#2B4023" strokeWidth="1.3" opacity="0.35" />
      <line x1="30.5" y1="11"  x2="36.5" y2="11"  stroke="#2B4023" strokeWidth="1.3" opacity="0.35" />
    </svg>
  );
}

export function DoodleProfSprite({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="22" cy="22" r="18" fill="#F5C842" />

      {/* Messy wavy hair */}
      <path d="M6 17 Q8 7 14 6 Q17 2 22 5 Q27 2 30 6 Q36 7 38 17" stroke="#8B6A00" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Square glasses — left lens */}
      <rect x="7" y="18" width="12" height="9" rx="3.5" stroke="#5A3E00" strokeWidth="1.8" fill="white" fillOpacity="0.4" />
      {/* Square glasses — right lens */}
      <rect x="25" y="18" width="12" height="9" rx="3.5" stroke="#5A3E00" strokeWidth="1.8" fill="white" fillOpacity="0.4" />
      {/* Bridge */}
      <line x1="19" y1="22.5" x2="25" y2="22.5" stroke="#5A3E00" strokeWidth="1.8" />
      {/* Arms */}
      <line x1="4" y1="22.5" x2="7" y2="22.5" stroke="#5A3E00" strokeWidth="1.8" />
      <line x1="37" y1="22.5" x2="40" y2="22.5" stroke="#5A3E00" strokeWidth="1.8" />

      {/* Pupils */}
      <circle cx="13" cy="22.5" r="2.4" fill="#5A3E00" />
      <circle cx="31" cy="22.5" r="2.4" fill="#5A3E00" />

      {/* Smile */}
      <path d="M14 30 Q22 37 30 30" stroke="#5A3E00" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* 4-pointed star accent — bottom right */}
      <path d="M38 36 L39 39 L42 40 L39 41 L38 44 L37 41 L34 40 L37 39 Z" fill="#D48A00" />
    </svg>
  );
}

export function MemeLordSprite({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="22" cy="22" r="18" fill="#B8E86B" />

      {/* High-arched eyebrows — skeptical/knowing */}
      <path d="M9 15 Q15 10 20 13" stroke="#3A5A00" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M24 13 Q29 10 35 15" stroke="#3A5A00" strokeWidth="2.4" fill="none" strokeLinecap="round" />

      {/* Sunglasses — left lens */}
      <rect x="7" y="18" width="13" height="7.5" rx="2" fill="#1A2800" fillOpacity="0.9" />
      {/* Sunglasses — right lens */}
      <rect x="24" y="18" width="13" height="7.5" rx="2" fill="#1A2800" fillOpacity="0.9" />
      {/* Bridge */}
      <line x1="20" y1="21.5" x2="24" y2="21.5" stroke="#3A5A00" strokeWidth="2" />
      {/* Arms */}
      <line x1="4" y1="21.5" x2="7" y2="21.5" stroke="#3A5A00" strokeWidth="2" />
      <line x1="37" y1="21.5" x2="40" y2="21.5" stroke="#3A5A00" strokeWidth="2" />

      {/* Huge trollish grin */}
      <path d="M10 30 Q22 42 34 30" stroke="#3A5A00" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* Teeth */}
      <line x1="14" y1="31.5" x2="14" y2="35.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="19" y1="33"   x2="19" y2="37.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="22" y1="33.5" x2="22" y2="38"   stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="25" y1="33"   x2="25" y2="37.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30" y1="31.5" x2="30" y2="35.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />

      {/* Chaos starburst accent — top right */}
      <path d="M37 4 L38.5 7.5 L42 6 L40 9 L43 11 L39.5 11 L40 15 L37.5 12.5 L35 15 L35.5 11 L32 11 L35 9 L33 6 L36.5 7.5 Z" fill="#3A5A00" />
    </svg>
  );
}

export function StudyBardSprite({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Headphone band arching over top of head */}
      <path d="M6 23 Q6 4 22 4 Q38 4 38 23" stroke="#1A6A8A" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Headphone cups */}
      <rect x="2" y="20" width="8" height="11" rx="4" fill="#1A6A8A" />
      <rect x="34" y="20" width="8" height="11" rx="4" fill="#1A6A8A" />

      {/* Head */}
      <circle cx="22" cy="25" r="16" fill="#7EC8E3" />

      {/* Happy closed eyes — curved lines (like singing) */}
      <path d="M13 22 Q16 19 19 22" stroke="#1A4A5A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M25 22 Q28 19 31 22" stroke="#1A4A5A" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Rosy cheeks */}
      <ellipse cx="11"  cy="27" rx="3.5" ry="2.5" fill="#F0C8D0" opacity="0.6" />
      <ellipse cx="33"  cy="27" rx="3.5" ry="2.5" fill="#F0C8D0" opacity="0.6" />

      {/* Open singing mouth */}
      <ellipse cx="22" cy="32" rx="5"   ry="4"   fill="#1A4A5A" />
      <ellipse cx="22" cy="32" rx="3.5" ry="2.5" fill="#C8304A" />

      {/* Eighth-note accent — bottom right */}
      <line x1="38" y1="35" x2="38" y2="43" stroke="#1A6A8A" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="36" cy="43" rx="2.8" ry="2" fill="#1A6A8A" transform="rotate(-15 36 43)" />
      <path d="M38 35 L43 33 L43 37 L38 38 Z" fill="#1A6A8A" />
    </svg>
  );
}

/** Renders the correct persona sprite by slug, falls back to a plain circle. */
export function PersonaSprite({ slug, size = 44 }: { slug: string; size?: number }) {
  if (slug === "lecture-bestie")  return <LectureBestieSprite  size={size} />;
  if (slug === "exam-gremlin")    return <ExamGremlinSprite    size={size} />;
  if (slug === "problem-grinder") return <ProblemGrinderSprite size={size} />;
  if (slug === "doodle-prof")     return <DoodleProfSprite     size={size} />;
  if (slug === "meme-lord")       return <MemeLordSprite       size={size} />;
  if (slug === "study-bard")      return <StudyBardSprite      size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="22" r="20" fill="#C9B8E8" />
    </svg>
  );
}
