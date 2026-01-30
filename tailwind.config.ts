import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-heading)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          blue: "var(--brand-blue)",
          "blue-hover": "var(--brand-blue-hover)",
          cyan: "var(--brand-cyan)",
          black: "var(--brand-black)",
        },
      },
      boxShadow: {
        glow: "0 0 40px -8px var(--brand-blue)",
        "glow-lg": "0 0 60px -12px var(--brand-blue)",
        soft: "0 4px 24px -4px rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.04)",
        "soft-lg": "0 12px 40px -8px rgba(0,0,0,0.12), 0 4px 12px -4px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "confetti-fall": "confetti-fall 5s ease-in forwards",
        "confetti-spin": "confetti-spin 2s linear infinite",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "tile-enter": "fade-in-up 0.45s ease-out forwards",
        "soft-pulse": "soft-pulse 2.5s ease-in-out infinite",
        "shine": "shine 1.5s ease-in-out",
        "typing": "typing 2.8s steps(58) 0.5s forwards",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "confetti-fall": {
          "0%": { opacity: "1", transform: "translateY(-10%) rotate(0deg) scale(1)" },
          "100%": { opacity: "0.85", transform: "translateY(110vh) rotate(540deg) scale(1)" },
        },
        "confetti-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.9)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(245, 158, 11, 0.3)" },
          "50%": { opacity: "0.95", boxShadow: "0 0 20px 4px rgba(245, 158, 11, 0.25)" },
        },
        "shine": {
          "0%": { transform: "translateX(-100%) skewX(-12deg)" },
          "100%": { transform: "translateX(200%) skewX(-12deg)" },
        },
        "typing": {
          "0%": { maxWidth: "0" },
          "100%": { maxWidth: "60ch" },
        },
      },
      backgroundImage: {
        "gradient-hero": "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #f0f9ff 100%)",
        "gradient-cta": "linear-gradient(135deg, var(--brand-blue) 0%, var(--brand-cyan) 100%)",
        "gradient-section": "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        "gradient-section-alt": "linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 40%, #f8fafc 100%)",
        "gradient-footer": "linear-gradient(180deg, #0f172a 0%, #0a0a0a 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
