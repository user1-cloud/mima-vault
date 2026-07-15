#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Mima 一键构建脚本
# 构建 Windows / Linux / Android 所有平台和架构
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RELEASE_DIR="$PROJECT_DIR/release"

echo "=== Project: $PROJECT_DIR ==="
echo "=== Release: $RELEASE_DIR ==="

rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"


# 检查 Rust target 是否已安装
has_target() {
    rustup target list --installed | grep -q "^$1$"
}

# 带错误处理的构建
build_with_target() {
    local target="$1"
    shift
    if has_target "$target"; then
        echo "Building target $target..."
        pnpm tauri build "$@" --target "$target"
    else
        echo "SKIP: Rust target $target not installed. Run: rustup target add $target"
        return 1
    fi
}

# 先构建前端
echo "=== Building frontend ==="
cd "$PROJECT_DIR" && pnpm build

# ============================================================
# Windows (桌面端)
# ============================================================
build_windows() {
    echo ""
    echo "=== Building Windows ==="

    # x64
    echo "--- Windows x64 ---"
    local bundle_dir="$PROJECT_DIR/src-tauri/target/x86_64-pc-windows-msvc/release/bundle"
    rm -rf "$bundle_dir"
    if ! build_with_target x86_64-pc-windows-msvc --bundles msi,nsis; then
        echo "  -> Windows x64 target not available, skipping"
        return
    fi
    if [ -d "$bundle_dir/msi" ]; then
        cp "$bundle_dir/msi"/*.msi "$RELEASE_DIR/"
        echo "  -> msi copied"
    fi
    if [ -d "$bundle_dir/nsis" ]; then
        cp "$bundle_dir/nsis"/*.exe "$RELEASE_DIR/"
        echo "  -> nsis exe copied"
    fi
    echo "Windows x64 OK"

    # ARM64 (Snapdragon X 等设备)
    echo "--- Windows ARM64 ---"
    local arm64_dir="$PROJECT_DIR/src-tauri/target/aarch64-pc-windows-msvc/release/bundle"
    rm -rf "$arm64_dir"
    if ! build_with_target aarch64-pc-windows-msvc --bundles msi,nsis; then
        echo "  -> Windows ARM64 target not available, skipping"
        return
    fi
    if [ -d "$arm64_dir/msi" ]; then
        cp "$arm64_dir/msi"/*.msi "$RELEASE_DIR/"
        echo "  -> arm64 msi copied"
    fi
    if [ -d "$arm64_dir/nsis" ]; then
        cp "$arm64_dir/nsis"/*.exe "$RELEASE_DIR/"
        echo "  -> arm64 nsis exe copied"
    fi
    echo "Windows ARM64 OK"
}

# ============================================================
# Linux (桌面端) — 需要 WSL 或 Linux 环境
# ============================================================
build_linux() {
    echo ""
    echo "=== Building Linux ==="
    if ! grep -qi microsoft /proc/version 2>/dev/null && [ "$(uname -s)" != "Linux" ]; then
        echo "SKIP: Linux build requires WSL or native Linux."
        return
    fi

    # x64
    echo "--- Linux x64 ---"
    local bundle_dir="$PROJECT_DIR/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle"
    rm -rf "$bundle_dir"
    if ! build_with_target x86_64-unknown-linux-gnu --bundles deb,appimage; then
        echo "  -> Linux x64 target not available, skipping"
        return
    fi
    if [ -d "$bundle_dir/deb" ]; then
        cp "$bundle_dir/deb"/*.deb "$RELEASE_DIR/"
        echo "  -> deb copied"
    fi
    if [ -d "$bundle_dir/appimage" ]; then
        cp "$bundle_dir/appimage"/*.AppImage "$RELEASE_DIR/"
        echo "  -> AppImage copied"
    fi
    echo "Linux x64 OK"

    # ARM64
    echo "--- Linux ARM64 ---"
    local arm64_dir="$PROJECT_DIR/src-tauri/target/aarch64-unknown-linux-gnu/release/bundle"
    rm -rf "$arm64_dir"
    if ! build_with_target aarch64-unknown-linux-gnu --bundles deb,appimage; then
        echo "  -> Linux ARM64 target not available, skipping"
        return
    fi
    if [ -d "$arm64_dir/deb" ]; then
        cp "$arm64_dir/deb"/*.deb "$RELEASE_DIR/"
        echo "  -> arm64 deb copied"
    fi
    if [ -d "$arm64_dir/appimage" ]; then
        cp "$arm64_dir/appimage"/*.AppImage "$RELEASE_DIR/"
        echo "  -> arm64 AppImage copied"
    fi
    echo "Linux ARM64 OK"
}

# ============================================================
# Android — 先打 universal，再逐个架构
# ============================================================
build_android() {
    echo ""
    echo "=== Building Android ==="

    local ANDROID_DIR="$PROJECT_DIR/src-tauri/gen/android"

    # 从 Cargo.toml 同步版本号到 tauri.properties
    local APP_VERSION
    APP_VERSION=$(grep -m1 '^version' "$PROJECT_DIR/src-tauri/Cargo.toml" | sed 's/.*"\(.*\)"/\1/')
    local VERSION_CODE
    VERSION_CODE=$(echo "$APP_VERSION" | awk -F. '{ printf "%d%02d00", $1, $2 }')
    sed -i "s/tauri\.android\.versionName=.*/tauri.android.versionName=$APP_VERSION/" "$ANDROID_DIR/app/tauri.properties"
    sed -i "s/tauri\.android\.versionCode=.*/tauri.android.versionCode=$VERSION_CODE/" "$ANDROID_DIR/app/tauri.properties"
    echo "  version synced: $APP_VERSION (code $VERSION_CODE)"

    # Universal (所有架构合一) — 失败则退出
    echo "--- Android universal ---"
    cd "$PROJECT_DIR" && pnpm tauri android build
    local universal_dir="$ANDROID_DIR/app/build/outputs/apk/universal/release"
    if ls "$universal_dir"/*.apk >/dev/null 2>&1; then
        cp "$universal_dir"/*.apk "$RELEASE_DIR/"
        echo "  -> universal APK copied"
    else
        echo "  ERROR: universal APK not found at $universal_dir"
        exit 1
    fi

    # 逐个架构 (跳过 rustBuild 因为 .so 已在上一步编译好了)
    local flavors=("arm64" "arm" "x86" "x86_64")
    local android_failures=()
    for arch in "${flavors[@]}"; do
        echo "--- Android $arch ---"
        if (
            cd "$ANDROID_DIR"
            ./gradlew "assemble${arch^}Release" "-xrustBuild${arch^}Release"
        ); then
            local src_dir="$ANDROID_DIR/app/build/outputs/apk/$arch/release"
            if ls "$src_dir"/*.apk >/dev/null 2>&1; then
                cp "$src_dir"/*.apk "$RELEASE_DIR/"
                echo "  -> $arch APK copied"
            else
                echo "  ERROR: APK not found in $src_dir"
                android_failures+=("$arch (APK missing)")
            fi
        else
            echo "  ERROR: Android $arch build failed"
            android_failures+=("$arch (build failed)")
        fi
    done

    if [ ${#android_failures[@]} -gt 0 ]; then
        echo ""
        echo "  ========================================"
        echo "  WARNING: Some Android arch builds FAILED:"
        for f in "${android_failures[@]}"; do
            echo "    - $f"
        done
        echo "  Universal APK is still available."
        echo "  ========================================"
    fi

    echo "Android APKs -> release/"
}

# ============================================================
# 主流程
# ============================================================
build_windows
build_linux
build_android

# 汇总
echo ""
echo "============================================"
echo " Build complete — release/ 目录内容:"
echo "============================================"
ls -lh "$RELEASE_DIR/"
echo ""
echo "共 $(ls -1 "$RELEASE_DIR" | wc -l) 个文件"
