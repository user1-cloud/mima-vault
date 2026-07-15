import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "oklch(var(--color-surface) / <alpha-value>)",
          elevated: "oklch(var(--color-surface-elevated) / <alpha-value>)",
          overlay: "oklch(var(--color-surface-overlay) / <alpha-value>)",
        },
        border: "oklch(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--color-primary) / <alpha-value>)",
          foreground: "oklch(var(--color-primary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--color-muted) / <alpha-value>)",
          foreground: "oklch(var(--color-muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--color-accent) / <alpha-value>)",
          foreground: "oklch(var(--color-accent-foreground) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "oklch(var(--color-danger) / <alpha-value>)",
          foreground: "oklch(var(--color-danger-foreground) / <alpha-value>)",
        },
        foreground: "oklch(var(--color-foreground) / <alpha-value>)",
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
