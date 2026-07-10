# Mima (密码)

A modern, lightweight, local-first password manager built with Tauri v2. Supports desktop (Windows, macOS, Linux) and Android from a single codebase.

## Features

- **AES-256-GCM encryption** — Every field is encrypted with a unique random nonce
- **Argon2id key derivation** — Master password is hardened against brute-force via memory-hard key derivation
- **Multi-vault support** — Create and manage multiple independent vaults, each with its own master password
- **Biometric unlock** — Quick unlock via fingerprint or face recognition on supported devices (desktop + Android)
- **Encrypted backup** — Export vaults as password-protected encrypted backups, or as plaintext JSON
- **Import / Export** — Migrate entries between vaults or apps with JSON import/export
- **Password generator** — Built-in configurable strong password generator (8–64 characters)
- **Drag-and-drop reorder** — Reorder entries via dnd-kit
- **Search** — Instant search across all entries
- **i18n** — Multi-language support (zh/en/zh-hk/zh-tw/ja) with runtime switching, CSV-driven translations
- **Dark theme** — Always dark, with a custom Tailwind design token system
- **Fully offline** — No accounts, no cloud sync, no telemetry. Your data stays on your device.

## Security Design

Mima follows a zero-trust local-first security model:

1. **Vault creation:** A random 32-byte vault key is generated and encrypted with an Argon2id-derived key from your master password. The result `{salt, encrypted_vault_key, nonce}` is stored in SQLite. Your master password is never stored.
2. **Unlock:** Derive a key from the entered password + stored salt, then attempt AES-256-GCM decryption of the vault key. A GCM authentication tag mismatch means the password is wrong — there is no password hash to compare against.
3. **Entry encryption:** Each field (name, username, password, URL, notes) is individually encrypted with the vault key using AES-256-GCM with a unique random nonce per field.
4. **Memory safety:** The vault key is held in a Rust `Mutex<Option<[u8; 32]>>` and zeroized on lock via the `zeroize` crate. The key never leaves the Rust process — the frontend only ever sees decrypted `DecryptedEntry` structs.
5. **No auto-unlock:** The vault locks immediately on close. Biometric unlock stores the vault key in the OS keychain (via `keyring` crate) encrypted with a biometric-bound key.

## Tech Stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Desktop shell    | Tauri v2 (Rust backend, system WebView)                      |
| Frontend         | React 19 + TypeScript + Vite                                 |
| Styling          | Tailwind CSS 3 + tailwindcss-animate                         |
| UI components    | shadcn/ui (Button, Input, Dialog, Label, HoverCard)          |
| Animation        | Motion (Framer Motion)                                       |
| 3D effects       | Three.js + React Three Fiber                                 |
| State management | Zustand                                                      |
| Forms            | react-hook-form + zod                                        |
| Drag and drop    | @dnd-kit/core + @dnd-kit/sortable                            |
| Icons            | lucide-react                                                 |
| Routing          | react-router-dom v7                                          |
| i18n             | Custom lightweight module (CSV → TS), persisted in localStorage |
| Package manager  | pnpm                                                         |

### Rust Dependencies

| Crate                            | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `aes-gcm`                        | AES-256-GCM field encryption                 |
| `argon2`                         | Argon2id key derivation from master password |
| `rusqlite` (bundled)             | SQLite database driver                       |
| `rand`                           | Cryptographic random number generation       |
| `zeroize`                        | Secure memory zeroing for vault key          |
| `keyring`                        | OS keychain integration for biometric unlock |
| `tauri-plugin-biometry`          | Biometric authentication                     |
| `tauri-plugin-clipboard-manager` | Clipboard access                             |
| `tauri-plugin-dialog`            | Native file dialogs                          |
| `tauri-plugin-shell`             | Shell integration                            |

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+

For Android builds:

- [Android Studio](https://developer.android.com/studio) with NDK and SDK tools
- `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

For Linux desktop builds:

- `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

## Getting Started

```bash
# Install frontend dependencies
pnpm install

# Run in development mode (launches Vite + Tauri together)
pnpm tauri dev

# Or run just the Vite dev server for faster frontend iteration
pnpm dev

# Regenerate locale TS files from CSV
pnpm gen-locales

# Sync zh.ts + en.ts changes back to CSV
pnpm sync-csv
```

## Building

```bash
# Production build for desktop
pnpm tauri build

# Rust-only type checking (fast)
cargo check
```

The built binary will be in `src-tauri/target/release/`.

## Project Structure

```
mima/
├── src/                          # React frontend (shared across platforms)
│   ├── components/
│   │   ├── app/                  # Business pages
│   │   │   ├── unlock.tsx        # Vault creation & unlock screen
│   │   │   ├── vault-list.tsx    # Multi-vault management screen
│   │   │   ├── vault.tsx         # Main vault view (entry list, search, lock)
│   │   │   ├── entry-dialog.tsx  # Create/edit entry dialog
│   │   │   └── lang-switcher.tsx # Language selector dialog
│   │   └── ui/                   # shadcn/ui base components (customized)
│   ├── stores/                   # Zustand stores
│   │   ├── app.ts                # Auth state, vault key status, CRUD actions
│   │   └── locale.ts             # i18n state and subscription
│   ├── locales/                  # Generated locale files (from locales.csv)
│   │   ├── zh.ts                  # Canonical keys + Translations type
│   │   ├── en.ts                  # English (complete)
│   │   ├── zh-hk.ts, zh-tw.ts, ja.ts  # Other languages (partial)
│   │   └── index.ts               # Locale registration
│   ├── lib/
│   │   ├── i18n.ts               # i18n registry + t() helper
│   │   └── utils.ts              # Common utilities
│   ├── index.css                 # Tailwind directives + theme tokens
│   ├── main.tsx                  # React entry point + router
│   └── App.tsx                   # Root component
├── src-tauri/                    # Rust backend (shared across platforms)
│   ├── src/
│   │   ├── main.rs               # Entry point (mobile/desktop dispatcher)
│   │   ├── lib.rs                # Tauri Builder, plugin registration, command handlers
│   │   ├── crypto.rs             # AES-256-GCM + Argon2id, backup encryption
│   │   ├── db.rs                 # SQLite schema, entry CRUD, vault config
│   │   ├── meta_db.rs            # Cross-vault metadata database
│   │   └── commands.rs           # 20+ IPC commands exposed to frontend
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri v2 configuration
│   ├── capabilities/             # Tauri v2 permission files
│   └── icons/                    # App icons
├── locales.csv                   # Source of truth for all translations
├── scripts/
│   └── generate-locales.mjs      # CSV → TS code generator
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

## IPC Commands

All commands return `Result<T, String>` — the frontend receives errors as thrown exceptions. The vault key never leaves the Rust process; all encryption/decryption happens server-side.

### Vault Management

| Command           | Description                                     |
| ----------------- | ----------------------------------------------- |
| `list_vaults`     | List all available vaults                       |
| `create_vault`    | Create a new vault with master password         |
| `open_vault`      | Unlock an existing vault                        |
| `verify_password` | Verify master password without re-unlocking     |
| `close_vault`     | Lock the current vault (zeroizes key in memory) |
| `rename_vault`    | Rename a vault                                  |
| `delete_vault`    | Delete a vault and its database file            |

### Entry CRUD

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `list_entries`    | List all entries in the open vault (decrypted) |
| `get_entry`       | Get a single entry by ID                       |
| `create_entry`    | Create a new entry with encrypted fields       |
| `update_entry`    | Update an existing entry                       |
| `delete_entry`    | Delete an entry                                |
| `reorder_entries` | Update sort order for drag-and-drop reordering |

### Utilities

| Command             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `generate_password` | Generate a random password (default 20 chars, range 8–64) |
| `copy_to_clipboard` | Copy text to system clipboard                             |

### Import / Export

| Command                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `export_plaintext`         | Export vault entries as plaintext JSON            |
| `export_encrypted`         | Export vault entries as password-encrypted backup |
| `preview_import`           | Preview entries from a plaintext JSON file        |
| `confirm_import`           | Import entries from a plaintext JSON file         |
| `preview_encrypted_import` | Preview entries from an encrypted backup file     |
| `confirm_encrypted_import` | Import entries from an encrypted backup file      |

## License

MIT
