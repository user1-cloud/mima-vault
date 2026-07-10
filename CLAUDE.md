# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Mima (密码) — a modern, lightweight, local-first password manager built with Tauri v2. Supports desktop (Windows/macOS/Linux) and Android from a single codebase.

## Tech Stack

- **Desktop shell:** Tauri v2 (Rust backend, system WebView)
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 3 + tailwindcss-animate
- **UI components:** shadcn/ui (Button, Input, Dialog, Label)
- **Animation:** Motion (Framer Motion)
- **State management:** Zustand
- **Forms:** react-hook-form + zod
- **Icons:** lucide-react
- **i18n:** Custom lightweight module (zh/en), stored in localStorage under `mima-lang`
- **Package manager:** pnpm

## Architecture

```
src/                  # React frontend (shared across platforms)
  components/
    app/              # Business pages (unlock, vault, entry-dialog, lang-switcher)
    ui/               # shadcn/ui base components (button, input, dialog, label)
  stores/             # Zustand stores (app.ts, locale.ts)
  lib/                # Utilities (i18n.ts, utils.ts)
src-tauri/            # Rust backend (shared across platforms)
  src/
    main.rs           # Entry point
    lib.rs            # Tauri Builder setup, plugin registration, command handlers
    crypto.rs         # AES-256-GCM encryption + Argon2id key derivation
    db.rs             # SQLite schema, CRUD operations (vault_config + entries tables)
    commands.rs       # 12 IPC commands exposed to frontend
  Cargo.toml
  tauri.conf.json
  capabilities/       # Tauri v2 permission files
```

## Security Design

- **Vault creation:** Random 32-byte vault key generated → encrypted with Argon2id-derived key from master password → stored as `{salt, encrypted_vault_key, nonce}` in SQLite
- **Unlock:** Derive key from entered password + stored salt → try AES-256-GCM decrypt of vault key. GCM authentication tag mismatch = wrong password. No password hash is ever stored.
- **Entry encryption:** Each field encrypted with vault key using AES-256-GCM with a unique random nonce per field
- **Memory:** Vault key zeroized on lock via `zeroize` crate. Key never leaves Rust process.
- **Scope:** Local-only, no sync, no autofill. Keep it simple, keep it safe.

## Commands

```bash
pnpm dev             # Vite dev server only
pnpm build           # TypeScript check + Vite production build
pnpm tauri dev       # Full Tauri dev mode (Vite + Rust)
pnpm tauri build     # Production Tauri build
pnpm gen-locales     # Regenerate locale TS files from locales.csv
cargo check          # Type-check Rust only (from src-tauri/)
cargo build          # Build Rust binary (from src-tauri/)
```

## Key Conventions

- All IPC commands return `Result<T, String>` — frontend receives errors as thrown exceptions
- Vault key is never sent to frontend; all encryption/decryption happens on the Rust side
- Frontend only ever sees `DecryptedEntry` structs, never raw encrypted data
- `VaultKey(pub Mutex<Option<[u8; 32]>>)` is Tauri managed state — `None` means locked, `Some` means unlocked
- shadcn/ui components were rewritten to use our custom Tailwind theme tokens (`surface`, `border`, `primary`, `muted`) instead of oklch() light-mode defaults, since the app is always dark-themed
- i18n: **Never read `locales.csv`** — it has many language columns and wastes tokens. Instead, add new keys directly to `src/locales/zh.ts` and `src/locales/en.ts`, then run `pnpm sync-csv` to update the CSV from those two files. The user will fill in other language translations in the CSV themselves, then run `pnpm gen-locales` to regenerate all locale TS files. Components call `useLocale()` to subscribe, then use `t("key")` for strings. `t()` falls back to English for missing keys.
- Use kebab-case for file names, PascalCase for component names
- No emojis in the UI
- Avoid comments — code should be self-documenting
