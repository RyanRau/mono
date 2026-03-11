/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        stone: "#C9B99A",
        forest: "#2C3B2D",
        "forest-light": "#3d5240",
        parchment: "#F0E8D8",
        rust: "#A85C38",
        "rust-light": "#c47a55",
        ink: "#1A1A18",
        "ink-light": "#2a2a28",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        mono: ['"DM Mono"', "monospace"],
      },
      fontSize: {
        "display-hero": ["clamp(4rem, 12vw, 10rem)", { lineHeight: "0.9", letterSpacing: "-0.02em" }],
        "display-section": ["clamp(2rem, 5vw, 3.5rem)", { lineHeight: "1.1" }],
      },
    },
  },
  plugins: [],
};
