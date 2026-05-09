import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#030712",
          surface: "#0D1117",
          border: "#1C2333",
          muted: "#8B9DB5",
          accent: "#00E5CC",
        },
        axiom: { DEFAULT: "#7C3AED", light: "#A78BFA" },
        kraken: { DEFAULT: "#DC2626", light: "#F87171" },
        probe: { DEFAULT: "#16A34A", light: "#4ADE80" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "mesh-gradient": "radial-gradient(ellipse at 50% 0%, rgba(0,229,204,0.08) 0%, transparent 60%)",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [typography],
};
