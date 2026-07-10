import { create } from "zustand";
import type { Locale, LocaleMeta } from "@/lib/i18n";
import { setLocale, getLocale, getLocales, firstAvailableLocale } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  locales: LocaleMeta[];
  setLocale: (locale: Locale) => void;
}

export const useLocale = create<LocaleState>((set) => ({
  locale: firstAvailableLocale(),
  locales: getLocales(),
  setLocale: (locale) => {
    setLocale(locale);
    set({ locale });
  },
}));
