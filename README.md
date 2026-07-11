# Mima (密码)

A modern, lightweight, local-first password manager built with Tauri v2. Supports desktop (Windows, macOS, Linux) and Android from a single codebase.

<details>
<summary>中文（简体）</summary>

# Mima (密码管理器)
一款基于 Tauri v2 构建的现代轻量级本地优先密码管理器，一套代码即可编译为桌面端（Windows、macOS、Linux）以及 Android 应用。

## 功能特性
- **AES‑256‑GCM 加密**：每一项内容都使用独立随机 nonce 进行加密
- **Argon2id 密钥派生算法**：通过内存硬化型密钥派生算法保护主密码，抵御暴力破解
- **多密码库支持**：创建并管理多个互相独立的密码库，每个密码库配备专属主密码
- **生物识别解锁**：在受支持设备（桌面端 + Android）通过指纹或面容快速解锁
- **加密备份**：可以导出受密码保护的加密备份文件，或是明文 JSON 文件
- **导入导出**：借助 JSON 文件在不同密码库或第三方应用之间迁移账号数据
- **密码生成器**：内置可自定义的高强度密码生成器，字符长度支持 8‑64 位
- **拖拽排序**：依托 dnd‑kit 实现条目拖拽重排
- **即时搜索**：对全部账号条目进行秒级检索
- **国际化支持**：多语言适配（简体中文 / 英文 / 繁体香港 / 繁体台湾 / 日语），运行时切换语言；翻译文本由 CSV 文件统一管理
- **深色模式**：全局深色主题，基于 Tailwind 自定义设计令牌系统
- **完全离线运行**：无需注册账号、无云端同步、无数据采集；你的数据仅存于本机设备。

## 安全设计
Mima 采用零信任、本地优先安全模型：
1. **创建密码库**：程序随机生成 32 字节的密码库密钥；再通过 Argon2id 算法从你的主密码派生密钥，对密码库密钥加密；最终将 `{盐值、加密后的密码库密钥、随机数}` 存入 SQLite；主密码本身不会被保存。
2. **解锁逻辑**：将输入的密码配合存储的盐值派生密钥，尝试解密密码库密钥；当 GCM 校验标签匹配失败时即判定密码错误，项目不会单独存储密码哈希值。
3. **条目加密**：账号的每一个字段（名称、用户名、密码、网址、备注）都会使用密码库密钥配合 AES‑256‑GCM 加密，每个字段拥有独立随机 nonce。
4. **内存安全**：密码库密钥存放于 Rust 的 `Mutex<Option<[u8; 32]>>`；关闭密码库时借助 `zeroize` 库清空内存里的密钥；密钥全程仅存在 Rust 后端进程内，前端拿到的只有解密后的条目结构体。
5. **禁止自动解锁**：关闭程序时密码库立刻上锁；开启生物解锁时，密码库密钥会借助 `keyring` 库存入系统密钥环，并被系统绑定生物识别密钥再次加密。

## 技术栈
| 层级 | 选用技术 |
| ---- | ---- |
| 桌面端外壳 | Tauri v2（Rust后端 + 系统WebView） |
| 前端框架 | React 19 + TypeScript + Vite |
| 样式方案 | Tailwind CSS 3 + tailwindcss‑animate |
| UI组件 | shadcn/ui（按钮、输入框、弹窗、标签、悬浮卡片） |
| 动画库 | Motion（Framer‑Motion） |
| 3D效果 | Three.js + React Three Fiber |
| 状态管理 | Zustand |
| 表单处理 | react‑hook‑form + zod |
| 拖拽组件 | @dnd‑kit/core + @dnd‑kit/sortable |
| 图标库 | lucide‑react |
| 路由管理 | react‑router‑dom v7 |
| 国际化 | 自研轻量化模块（CSV 文件编译为 TS），配置持久化在 localStorage |
| 包管理器 | pnpm |

### Rust 依赖库
| Crate库 | 作用 |
| ---- | ---- |
| `aes‑gcm` | 实现 AES‑256‑GCM 字段加密 |
| `argon2` | 基于主密码完成 Argon2id 密钥派生 |
| `rusqlite`（内置编译） | SQLite 数据库驱动 |
| `rand` | 密码学安全随机数生成 |
| `zeroize` | 安全擦除内存中的密码库密钥 |
| `keyring` | 对接系统密钥环，用于生物识别解锁 |
| `tauri‑plugin‑biometry` | 生物认证插件 |
| `tauri‑plugin‑clipboard‑manager` | 系统剪贴板访问 |
| `tauri‑plugin‑dialog` | 原生文件弹窗 |
| `tauri‑plugin‑shell` | 系统Shell调用 |

## 环境准备
- [Rust](https://rustup.rs/)（最新稳定版）
- [Node.js](https://nodejs.org/) 18 及以上版本
- [pnpm](https://pnpm.io/) 9 及以上版本

编译 Android 版本额外需要：
- [Android Studio](https://developer.android.com/studio)，安装 NDK 以及 SDK 工具
- 执行命令添加安卓编译目标：
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

编译 Linux 桌面端额外依赖：
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## 快速启动
```bash
# 安装前端依赖
pnpm install

# 启动开发模式（同时运行 Vite 和 Tauri）
pnpm tauri dev

# 仅启动前端开发服务器，更快调试页面
pnpm dev

# 从CSV翻译文件重新生成TS国际化文件
pnpm gen-locales

# 将简体中文与英文翻译的改动同步回CSV源文件
pnpm sync-csv
```

## 项目构建
```bash
# 编译生产版桌面端程序
pnpm tauri build

# 仅对Rust代码做类型检查（速度更快）
cargo check
```
编译后的程序产物存放路径：`src‑tauri/target/release/`。

## 项目目录结构
```
mima/
├── src/                          # React前端代码，全平台共用
│   ├── components/
│   │   ├── app/                  # 业务页面组件
│   │   │   ├── unlock.tsx        # 创建密码库和解锁页面
│   │   │   ├── vault-list.tsx    # 多密码库管理页面
│   │   │   ├── vault.tsx         # 密码库主页（条目列表、搜索、上锁）
│   │   │   ├── entry-dialog.tsx  # 新增/编辑账号弹窗
│   │   │   └── lang-switcher.tsx # 语言选择弹窗
│   │   └── ui/                   # 二次封装后的shadcn/ui基础组件
│   ├── stores/                   # Zustand全局状态
│   │   ├── app.ts                # 登录状态、密钥状态、数据库操作方法
│   │   └── locale.ts             # 国际化状态与订阅逻辑
│   ├── locales/                  # 由locales.csv自动生成的语言文件
│   │   ├── zh.ts                  # 简体中文（翻译键值与类型定义）
│   │   ├── en.ts                  # 英文（翻译完整）
│   │   ├── zh-hk.ts, zh-tw.ts, ja.ts  # 其余语言（内容待完善）
│   │   └── index.ts               # 语言注册入口
│   ├── lib/
│   │   ├── i18n.ts               # 国际化注册与翻译函数 t()
│   │   └── utils.ts              # 通用工具函数
│   ├── index.css                 # Tailwind指令与自定义主题变量
│   ├── main.tsx                  # React入口文件 + 路由挂载
│   └── App.tsx                   # 根组件
├── src-tauri/                    # Rust后端代码，桌面端与安卓共用
│   ├── src/
│   │   ├── main.rs               # 程序入口（区分移动端和桌面端调度逻辑）
│   │   ├── lib.rs                # Tauri实例配置、插件注册、IPC命令定义
│   │   ├── crypto.rs             # AES‑256‑GCM、Argon2id、备份加密实现
│   │   ├── db.rs                 # SQLite数据表定义、账号CRUD、密码库配置
│   │   ├── meta_db.rs            # 管理全部密码库元数据的数据库
│   │   └── commands.rs           # 暴露给前端的20余个IPC指令
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Tauri v2配置文件
│   ├── capabilities/             # Tauri v2权限配置文件
│   └── icons/                    # App图标资源
├── locales.csv                   # 所有翻译文本的唯一数据源
├── scripts/
│   └── generate-locales.mjs      # 将CSV文件转换为TS代码的脚本
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

## IPC通信指令
所有指令返回 `Result<T, String>`；前端调用出错时会抛出异常。密码库密钥全程保存在Rust后端，加密和解密逻辑全部运行在后端。

### 密码库管理指令
| 指令名称 | 功能说明 |
| ---- | ---- |
| `list_vaults` | 获取全部已创建的密码库列表 |
| `create_vault` | 通过主密码新建一个密码库 |
| `open_vault` | 解锁指定密码库 |
| `verify_password` | 校验主密码正确性，不重复解锁 |
| `close_vault` | 锁定当前密码库，并清空内存中的密钥 |
| `rename_vault` | 修改密码库名称 |
| `delete_vault` | 删除密码库以及对应的数据库文件 |

### 账号条目增删改查
| 指令名称 | 功能说明 |
| ---- | ---- |
| `list_entries` | 获取当前已解锁密码库下全部解密后的账号条目 |
| `get_entry` | 根据ID查询单条账号信息 |
| `create_entry` | 创建账号并对字段加密存入数据库 |
| `update_entry` | 修改现有账号信息 |
| `delete_entry` | 删除指定账号条目 |
| `reorder_entries` | 更新条目排序，适配拖拽排序 |

### 工具类指令
| 指令名称 | 功能说明 |
| ---- | ---- |
| `generate_password` | 随机生成密码，默认长度20位，范围8‑64位 |
| `copy_to_clipboard` | 将文本写入系统剪贴板 |

### 导入导出相关指令
| 指令名称 | 功能说明 |
| ---- | ---- |
| `export_plaintext` | 将密码库导出为明文JSON文件 |
| `export_encrypted` | 导出受密码保护的加密备份文件 |
| `preview_import` | 预览明文备份文件里的账号数据 |
| `confirm_import` | 将明文JSON文件中的账号导入密码库 |
| `preview_encrypted_import` | 预览加密备份里的账号数据 |
| `confirm_encrypted_import` | 从加密备份文件导入账号条目 |

## 开源协议
MIT
</details>

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

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri v2 (Rust backend, system WebView) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS 3 + tailwindcss-animate |
| UI components | shadcn/ui (Button, Input, Dialog, Label, HoverCard) |
| Animation | Motion (Framer Motion) |
| 3D effects | Three.js + React Three Fiber |
| State management | Zustand |
| Forms | react-hook-form + zod |
| Drag and drop | @dnd-kit/core + @dnd-kit/sortable |
| Icons | lucide-react |
| Routing | react-router-dom v7 |
| i18n | Custom lightweight module (CSV → TS), persisted in localStorage |
| Package manager | pnpm |

### Rust Dependencies

| Crate | Purpose |
| --- | --- |
| `aes-gcm` | AES-256-GCM field encryption |
| `argon2` | Argon2id key derivation from master password |
| `rusqlite` (bundled) | SQLite database driver |
| `rand` | Cryptographic random number generation |
| `zeroize` | Secure memory zeroing for vault key |
| `keyring` | OS keychain integration for biometric unlock |
| `tauri-plugin-biometry` | Biometric authentication |
| `tauri-plugin-clipboard-manager` | Clipboard access |
| `tauri-plugin-dialog` | Native file dialogs |
| `tauri-plugin-shell` | Shell integration |

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

| Command | Description |
| --- | --- |
| `list_vaults` | List all available vaults |
| `create_vault` | Create a new vault with master password |
| `open_vault` | Unlock an existing vault |
| `verify_password` | Verify master password without re-unlocking |
| `close_vault` | Lock the current vault (zeroizes key in memory) |
| `rename_vault` | Rename a vault |
| `delete_vault` | Delete a vault and its database file |

### Entry CRUD

| Command | Description |
| --- | --- |
| `list_entries` | List all entries in the open vault (decrypted) |
| `get_entry` | Get a single entry by ID |
| `create_entry` | Create a new entry with encrypted fields |
| `update_entry` | Update an existing entry |
| `delete_entry` | Delete an entry |
| `reorder_entries` | Update sort order for drag-and-drop reordering |

### Utilities

| Command | Description |
| --- | --- |
| `generate_password` | Generate a random password (default 20 chars, range 8–64) |
| `copy_to_clipboard` | Copy text to system clipboard |

### Import / Export

| Command | Description |
| --- | --- |
| `export_plaintext` | Export vault entries as plaintext JSON |
| `export_encrypted` | Export vault entries as password-encrypted backup |
| `preview_import` | Preview entries from a plaintext JSON file |
| `confirm_import` | Import entries from a plaintext JSON file |
| `preview_encrypted_import` | Preview entries from an encrypted backup file |
| `confirm_encrypted_import` | Import entries from an encrypted backup file |

## License
MIT
