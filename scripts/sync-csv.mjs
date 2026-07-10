import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_PATH = join(ROOT, "locales.csv");
const LOCALES_DIR = join(ROOT, "src", "locales");

// ─── Parse a generated TS locale file into { key: value } ───
function parseLocaleFile(path) {
  const text = readFileSync(path, "utf-8");

  // Locate the object literal after "= {"
  const assignMatch = text.match(/=\s*\{/);
  if (!assignMatch) return {};
  const objStart = assignMatch.index + assignMatch[0].length - 1;

  let depth = 0;
  let inString = false;
  let escape = false;
  let objEnd = -1;

  for (let i = objStart; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) { objEnd = i + 1; break; } }
  }

  if (objEnd < 0) return {};

  const objStr = text.slice(objStart, objEnd);
  try {
    const fn = new Function(`return ${objStr}`);
    return fn();
  } catch {
    return {};
  }
}

// ─── Parse CSV ───
function parseCSV(text) {
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { quoted = true; }
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); field = ""; if (row.some(f => f !== "")) { rows.push(row); row = []; } }
      else { field += ch; }
    }
  }
  row.push(field);
  if (row.some(f => f !== "")) rows.push(row);
  return rows;
}

function csvEscape(val) {
  if (val == null || val === "") return "";
  const s = String(val);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeRead(path) {
  try { return readFileSync(path, "utf-8").replace(/^﻿/, ""); }
  catch { return ""; }
}

// ─── Read existing CSV ───
const csvText = safeRead(CSV_PATH);
const csvRows = csvText ? parseCSV(csvText) : [];

function normalizeCode(code) {
  return code.replace(/[‐-―]/g, "-");
}

const rawHeaders = csvRows.length > 0 ? csvRows[0] : ["key", "zh", "en"];
const headers = rawHeaders.map(normalizeCode);
const existing = {}; // key → { col: value }
if (csvRows.length > 1) {
  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    existing[row[0]] = {};
    for (let j = 0; j < headers.length; j++) {
      existing[row[0]][headers[j]] = row[j] || "";
    }
  }
}

// ─── Read zh.ts and en.ts ───
const zh = parseLocaleFile(join(LOCALES_DIR, "zh.ts"));
const en = parseLocaleFile(join(LOCALES_DIR, "en.ts"));

// ─── Merge: zh/en from TS, other cols from existing CSV ───
const allKeys = [...new Set([...Object.keys(zh), ...Object.keys(existing)])];

const outRows = [];
for (const key of allKeys) {
  const row = [key];
  for (let j = 1; j < headers.length; j++) {
    const col = headers[j];
    if (col === "zh") {
      row.push(zh[key] ?? existing[key]?.[col] ?? "");
    } else if (col === "en") {
      row.push(en[key] ?? existing[key]?.[col] ?? "");
    } else {
      row.push(existing[key]?.[col] ?? "");
    }
  }
  outRows.push(row);
}

// ─── Write CSV ───
let csv = headers.map(c => csvEscape(c)).join(",") + "\n";
for (const row of outRows) {
  csv += row.map(c => csvEscape(c)).join(",") + "\n";
}
writeFileSync(CSV_PATH, csv);

console.log(`Synced ${outRows.length} keys from zh.ts + en.ts → locales.csv (${headers.length - 1} languages)`);
