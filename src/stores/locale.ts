import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { setLocale, getLocale } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  toggle: () => void;
}

export const useLocale = create<LocaleState>((set) => ({
  locale: getLocale(),
  toggle: () =>
    set((s) => {
      const next: Locale = s.locale === "zh" ? "en" : "zh";
      setLocale(next);
      return { locale: next };
    }),
}));
