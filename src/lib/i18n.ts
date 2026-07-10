type TranslationDict = Record<string, string>;

export interface LocaleMeta {
  code: string;
  nativeName: string;
}

const translations: Record<string, TranslationDict> = {};
const localeMeta: LocaleMeta[] = [];

export function registerLocale(code: string, nativeName: string, dict: TranslationDict) {
  translations[code] = dict;
  if (!localeMeta.find((m) => m.code === code)) {
    localeMeta.push({ code, nativeName });
  }
}

export function getLocales(): LocaleMeta[] {
  return [...localeMeta];
}

export type Locale = string;

let current: Locale = localStorage.getItem("mima-lang") ?? "";

export function setLocale(locale: Locale) {
  if (!translations[locale]) return;
  current = locale;
  localStorage.setItem("mima-lang", locale);
}

export function getLocale(): Locale {
  return current;
}

export function firstAvailableLocale(): Locale {
  if (current && translations[current]) return current;
  if (translations["zh"]) return "zh";
  if (translations["en"]) return "en";
  return getLocales()[0]?.code ?? "";
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let text: string = translations[current]?.[key] ?? translations["en"]?.[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
