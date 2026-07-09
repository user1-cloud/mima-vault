import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CJK_MS = 50;
const LATIN_MS = 30;
const OTHER_MS = 40;

function isCJK(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x3000 && code <= 0x303f) || // CJK Symbols
    (code >= 0xff00 && code <= 0xffef) || // Fullwidth Forms
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff)    // Katakana
  );
}

function isLatin(code: number): boolean {
  return (
    (code >= 0x0041 && code <= 0x005a) || // A-Z
    (code >= 0x0061 && code <= 0x007a)    // a-z
  );
}

export function charRevealDelay(text: string, maxTotalMs = 2000): number {
  let totalDelay = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i) ?? 0;
    if (isCJK(code)) totalDelay += CJK_MS;
    else if (isLatin(code)) totalDelay += LATIN_MS;
    else totalDelay += OTHER_MS;
    // skip low surrogate so surrogate pairs count as one
    if (code > 0xffff) i++;
  }
  const n = text.length || 1;
  return Math.min(totalDelay / n, maxTotalMs / n);
}
