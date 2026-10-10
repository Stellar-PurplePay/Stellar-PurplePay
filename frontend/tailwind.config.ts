import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PurplePay signature brand purples
        market: {
          50:  "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
        },
        // Midnight obsidian-purple surfaces
        ink: {
          950: "#06030c",
          900: "#090414",
          800: "#120824",
          700: "#1a0d33",
          600: "#251347",
          500: "#381d68",
        },
        // Map amber tokens to vibrant lavender/purple so all UI classes shine in PurplePay purple
        amber: {
          50:  "#faf5ff",
          100: "#f5f0ff",
          200: "#ede4fe",
          300: "#ddd0fe",
          400: "#c4b5fd",
          500: "#a78bfa",
          600: "#8b5cf6",
          700: "#c084fc",
          800: "#d8b4fe",
          900: "#e9d5ff",
          950: "#1a0d33",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        "fade-in":   "fadeIn 0.5s ease-out",
        "slide-up":  "slideUp 0.4s ease-out",
        "slide-in":  "slideIn 0.3s ease-out",
        "shimmer":   "shimmer 1.5s infinite",
        "scale-in":  "scaleIn 0.25s ease-out both",
        "pulse-soft":"pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideIn:   { "0%": { opacity: "0", transform: "translateX(-10px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        shimmer:   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        scaleIn:   { "0%": { opacity: "0", transform: "scale(0.6)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.55" } },
        "progress-indeterminate": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
