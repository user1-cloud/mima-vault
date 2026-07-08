import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "oklch(0.13 0.02 260)",
          elevated: "oklch(0.17 0.02 260)",
          overlay: "oklch(0.21 0.02 260)",
        },
        border: "oklch(0.25 0.02 260)",
        primary: {
          DEFAULT: "oklch(0.65 0.2 250)",
          foreground: "#fff",
        },
        muted: {
          DEFAULT: "oklch(0.30 0.02 260)",
          foreground: "oklch(0.55 0.02 260)",
        },
        accent: {
          DEFAULT: "oklch(0.25 0.02 260)",
          foreground: "oklch(0.90 0.02 260)",
        },
        danger: {
          DEFAULT: "oklch(0.55 0.2 20)",
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
