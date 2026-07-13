import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "oklch(0.23 0.01 250)",
          elevated: "oklch(0.27 0.01 250)",
          overlay: "oklch(0.31 0.01 250)",
        },
        border: "oklch(0.35 0.01 250)",
        primary: {
          DEFAULT: "oklch(0.55 0.22 250)",
          foreground: "#fff",
        },
        muted: {
          DEFAULT: "oklch(0.38 0.01 250)",
          foreground: "oklch(0.60 0.01 250)",
        },
        accent: {
          DEFAULT: "oklch(0.35 0.01 250)",
          foreground: "oklch(0.95 0.01 250)",
        },
        danger: {
          DEFAULT: "oklch(0.52 0.20 15)",
          foreground: "#fff",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-20px) scale(1.05)" },
        },
        shimmer: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        shimmer: "shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
