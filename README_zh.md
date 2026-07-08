# Mima (密码)

基于 Tauri v2 构建的现代、轻量、本地优先的密码管理器。一套代码同时支持桌面端（Windows/macOS/Linux）和 Android。

## 功能

- AES-256-GCM 加密 + Argon2id 密钥派生
- 纯本地存储，无云同步，无账号体系
- 多密码库支持
- 加密备份导出/导入
- 随机密码生成器
- 深色主题

## 技术栈

- **桌面壳:** Tauri v2 (Rust + 系统 WebView)
- **前端:** React 19 + TypeScript + Vite
- **样式:** Tailwind CSS 3 + shadcn/ui
- **状态管理:** Zustand
- **图标:** lucide-react

## 环境要求

- [Rust](https://rustup.rs/)（最新稳定版）
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+

## 快速开始

```bash
pnpm install
pnpm tauri dev
```

## 构建

```bash
pnpm tauri build
```

## 项目结构

```
src/                  # React 前端
  components/
    app/              # 业务页面
    ui/               # shadcn/ui 组件
  stores/             # Zustand 状态
  lib/                # 工具函数（国际化等）
src-tauri/            # Rust 后端
  src/
    main.rs           # 入口
    lib.rs            # Tauri Builder、插件注册
    crypto.rs         # AES-256-GCM + Argon2id
    db.rs             # SQLite 增删改查
    commands.rs       # IPC 命令处理
```
