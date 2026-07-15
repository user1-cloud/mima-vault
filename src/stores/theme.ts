import { updateAccentForTheme } from "./theme-color";

const THEME_KEY = "mima-theme";
export type Theme = "system" | "dark" | "light";

export function getStoredTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || "dark";
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  updateAccentForTheme(resolved);
}

export function initTheme() {
  applyTheme(getStoredTheme());

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getStoredTheme() === "system") {
      applyTheme("system");
    }
  });
}
