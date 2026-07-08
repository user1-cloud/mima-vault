# Mima (密码)

A modern, lightweight, local-first password manager built with Tauri v2. Supports desktop (Windows/macOS/Linux) and Android from a single codebase.

[中文版](README_zh.md)

## Features

- AES-256-GCM encryption with Argon2id key derivation
- Local-only storage — no cloud sync, no accounts
- Multi-vault support
- Encrypted backup export/import
- Password generator
- Dark theme

## Tech Stack

- **Desktop shell:** Tauri v2 (Rust + system WebView)
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 3 + shadcn/ui
- **State:** Zustand
- **Icons:** lucide-react

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+

## Getting Started

```bash
pnpm install
pnpm tauri dev
```

## Building

```bash
pnpm tauri build
```

## Project Structure

```
src/                  # React frontend
  components/
    app/              # Business pages
    ui/               # shadcn/ui components
  stores/             # Zustand stores
  lib/                # Utilities (i18n, etc.)
src-tauri/            # Rust backend
  src/
    main.rs           # Entry point
    lib.rs            # Tauri Builder, plugin setup, commands
    crypto.rs         # AES-256-GCM + Argon2id
    db.rs             # SQLite CRUD
    commands.rs       # IPC commands
```
