import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy `brand-*` utilities (345 uses) now follow the shared theme
        // tokens, so the entire existing markup becomes light/dark aware with no
        // per-component edits. Alpha modifiers (bg-brand-surface/80, …) resolve
        // via Tailwind v4 color-mix, which accepts these var() values.
        brand: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          border: "var(--border)",
          muted: "var(--muted)",
          accent: "var(--accent)",
        },
        // axiom/kraken/probe product hues live in shared/laplace-theme.css
        // (@theme) so every surface shares them.
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
