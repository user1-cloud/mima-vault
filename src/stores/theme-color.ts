const ACCENT_KEY = "mima-accent";

export interface AccentPreset {
  id: string;
  labelKey: string;
  light: string;
  dark: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "blue", labelKey: "colorBlue", light: "0.45 0.20 250", dark: "0.55 0.22 250" },
  { id: "purple", labelKey: "colorPurple", light: "0.45 0.20 280", dark: "0.55 0.22 280" },
  { id: "green", labelKey: "colorGreen", light: "0.48 0.18 155", dark: "0.55 0.20 155" },


  { id: "teal", labelKey: "colorTeal", light: "0.48 0.17 185", dark: "0.55 0.19 185" },
];

export function getStoredAccent(): string {
  return localStorage.getItem(ACCENT_KEY) || "blue";
}

export function setStoredAccent(id: string) {
  localStorage.setItem(ACCENT_KEY, id);
  const preset = ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
  applyAccent(preset);
}

export function getAccentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0];
}

function resolveAccent(): { light: string; dark: string } {
  const id = getStoredAccent();
  const preset = getAccentPreset(id);
  return { light: preset.light, dark: preset.dark };
}

export function applyAccent(preset: AccentPreset) {
  const isDark = document.documentElement.classList.contains("dark");
  const root = document.documentElement;
  root.style.setProperty("--color-primary", isDark ? preset.dark : preset.light);
}

export function updateAccentForTheme(resolved: "dark" | "light") {
  const preset = getAccentPreset(getStoredAccent());
  document.documentElement.style.setProperty(
    "--color-primary",
    resolved === "dark" ? preset.dark : preset.light,
  );
}

export function initAccentColor() {
  updateAccentForTheme(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
}
