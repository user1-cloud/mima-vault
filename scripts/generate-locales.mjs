import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOCALES_DIR = join(ROOT, "src", "locales");

const KNOWN_META = {
  zh: "中文(简体)",
  en: "English",
  "zh-hk": "中文(香港)",
  "zh-tw": "中文(臺灣)",
  ja: "日本語",
  ko: "한국어",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  ru: "Русский",
  "pt-br": "Português (BR)",
  it: "Italiano",
};

function toVarName(code) {
  return code.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseCSV(text) {
  text = text.replace(/^﻿/, ""); // strip BOM
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        quoted = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        field = "";
        if (row.length > 0) {
          rows.push(row);
          row = [];
        }
      } else {
        field += ch;
      }
    }
  }

  // last field + row
  row.push(field);
  if (row.length > 0 && row.some((f) => f !== "")) {
    rows.push(row);
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

// ─── Read CSV ───
const csvPath = join(ROOT, "locales.csv");
const csv = readFileSync(csvPath, "utf-8").replace(/^﻿/, ""); // strip BOM
const { headers, rows } = parseCSV(csv);

// Normalize unicode dashes in language codes to regular hyphens
function normalizeCode(code) {
  return code.replace(/[‐-―]/g, "-");
}

// Normalize unicode dashes in the header row
for (let i = 0; i < headers.length; i++) {
  headers[i] = normalizeCode(headers[i]);
}
// headers[0] = "key", the rest are language codes
const langs = headers.slice(1);

// Build { lang: { key: value } }
const data = {};
for (const lang of langs) data[lang] = {};

for (const row of rows) {
  const key = row[0];
  for (let j = 1; j < headers.length; j++) {
    const val = (row[j] || "").trim();
    if (val) data[headers[j]][key] = val;
  }
}

// Ensure output directory exists
mkdirSync(LOCALES_DIR, { recursive: true });

// ─── zh.ts (complete, canonical keys, exports Translations type) ───
const zhKeys = Object.keys(data.zh);
let zhFile = `const zh = {\n`;
for (const key of zhKeys) {
  zhFile += `  ${key}: ${JSON.stringify(data.zh[key])},\n`;
}
zhFile += `};\n\nexport type Translations = typeof zh;\nexport default zh;\n`;
writeFileSync(join(LOCALES_DIR, "zh.ts"), zhFile);

// ─── en.ts (complete, uses zh keys as canonical set) ───
let enFile = `import type { Translations } from "./zh";\n\nconst en: Translations = {\n`;
for (const key of zhKeys) {
  enFile += `  ${key}: ${JSON.stringify(data.en[key] || "")},\n`;
}
enFile += `};\n\nexport default en;\n`;
writeFileSync(join(LOCALES_DIR, "en.ts"), enFile);

// ─── Other languages (Partial<Translations>) ───
for (const lang of langs) {
  if (lang === "zh" || lang === "en") continue;
  const entries = data[lang];
  const keys = Object.keys(entries);

  const vn = toVarName(lang);
  let file = `import type { Translations } from "./zh";\n\nconst ${vn}: Partial<Translations> = {\n`;
  for (const key of keys) {
    file += `  ${key}: ${JSON.stringify(entries[key])},\n`;
  }
  file += `};\n\nexport default ${vn};\n`;
  writeFileSync(join(LOCALES_DIR, `${lang}.ts`), file);
}

// ─── index.ts ───
let indexFile = `import { registerLocale } from "@/lib/i18n";\n`;
for (const lang of langs) {
  indexFile += `import ${toVarName(lang)} from "./${lang}";\n`;
}
indexFile += `\n`;
for (const lang of langs) {
  const meta = KNOWN_META[lang] || lang;
  indexFile += `registerLocale("${lang}", ${JSON.stringify(meta)}, ${toVarName(lang)});\n`;
}
writeFileSync(join(LOCALES_DIR, "index.ts"), indexFile);

console.log(`Generated ${langs.length} locale files from locales.csv (${rows.length} keys)`);
