import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft Y2K Editorial palette
        cream: "#FFF8F0",
        parchment: "#F5ECD7",
        "warm-black": "#1A1612",
        charcoal: "#2D2926",
        // Persona accent colours
        lavender: "#C9B8E8",
        "lavender-deep": "#9B85CE",
        butter: "#F5D97A",
        "butter-deep": "#E8C43A",
        sage: "#9DBE8A",
        "sage-deep": "#6A9E58",
        cherry: "#D4544A",
        "cherry-light": "#F0A09A",
        cobalt: "#7890C8",
        "cobalt-light": "#B0C0E8",
        // Neutral warm tones
        "warm-50": "#FDFAF5",
        "warm-100": "#F8F2E8",
        "warm-200": "#EDE0CC",
        "warm-300": "#DECCAA",
        "warm-400": "#C8B088",
        "warm-500": "#A88B60",
        // Soft Y2K iridescent accent
        iris: "#E8D5F5",
        "iris-deep": "#C4A8E8",
        "iris-glow": "#F0E8FF",
        // Peach for warmth
        peach: "#FFD4B8",
        "peach-deep": "#FFAF80",
      },
      fontFamily: {
        // Display / editorial serif
        display: ["'Playfair Display'", "Georgia", "serif"],
        // UI sans-serif
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        // Mono accent
        mono: ["'DM Mono'", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card: "0 2px 20px rgba(26,22,18,0.08)",
        "card-hover": "0 8px 40px rgba(26,22,18,0.14)",
        soft: "0 1px 8px rgba(26,22,18,0.06)",
        // Persona-colored glow shadows
        "glow-lavender": "0 4px 24px rgba(201,184,232,0.5)",
        "glow-cherry": "0 4px 24px rgba(212,84,74,0.35)",
        "glow-sage": "0 4px 24px rgba(157,190,138,0.45)",
        "glow-butter": "0 4px 24px rgba(245,217,122,0.45)",
        "glow-cobalt": "0 4px 24px rgba(120,144,200,0.4)",
        "glow-iris": "0 4px 32px rgba(196,168,232,0.5)",
        "glow-cream": "0 4px 24px rgba(255,248,240,0.8)",
        // Gel button shadow
        gel: "0 4px 12px rgba(26,22,18,0.12), inset 0 1px 0 rgba(255,255,255,0.35)",
        "gel-pressed": "0 1px 4px rgba(26,22,18,0.12), inset 0 2px 4px rgba(0,0,0,0.08)",
      },
      backgroundImage: {
        // Persona gradient utilities
        "gradient-lavender": "linear-gradient(135deg, #F5F0FF 0%, #E8D5F5 50%, #C9B8E8 100%)",
        "gradient-cherry": "linear-gradient(135deg, #FFF0EE 0%, #FFD4D0 50%, #F0A09A 100%)",
        "gradient-sage": "linear-gradient(135deg, #F0F7EE 0%, #D4EBC8 50%, #9DBE8A 100%)",
        "gradient-butter": "linear-gradient(135deg, #FFFBE8 0%, #FFF0A0 50%, #F5D97A 100%)",
        "gradient-cobalt": "linear-gradient(135deg, #EEF2FF 0%, #C8D4F5 50%, #7890C8 100%)",
        "gradient-iris": "linear-gradient(135deg, #F8F0FF 0%, #EDD5FF 50%, #C4A8E8 100%)",
        "gradient-warm": "linear-gradient(160deg, #FFF8F0 0%, #F5ECD7 100%)",
        "gradient-dreamy": "linear-gradient(135deg, #FFF0F8 0%, #F5EEFF 50%, #EEF5FF 100%)",
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "float-slow": "float 5s ease-in-out infinite",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "blob-drift": "blobDrift 8s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
          "50%": { opacity: "0.6", transform: "scale(0.8) rotate(20deg)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        blobDrift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(20px, -20px) scale(1.05)" },
          "66%": { transform: "translate(-15px, 10px) scale(0.95)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
