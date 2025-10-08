#!/usr/bin/env bash
#
# AlphaCodeIDE Universal Build Script (Bash version)
#

set -e

PLATFORM="${1:-}"
ARCH="${2:-x64}"

if [ -z "$PLATFORM" ] || [ "$PLATFORM" = "--help" ] || [ "$PLATFORM" = "-h" ]; then
    cat << EOF
AlphaCodeIDE Build System
=========================

Usage:
  ./scripts/build.sh <platform> [arch]

Platforms:
  windows    Build for Windows
  linux      Build for Linux
  macos      Build for macOS

Architecture: x64, arm64, armhf (default: x64)

Examples:
  ./scripts/build.sh linux
  ./scripts/build.sh linux arm64
  ./scripts/build.sh macos x64

EOF
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$PLATFORM" in
    windows)
        echo "Building for Windows ($ARCH)..."
        pwsh "$SCRIPT_DIR/build-windows.ps1" -Arch "$ARCH"
        ;;
    linux)
        echo "Building for Linux ($ARCH)..."
        bash "$SCRIPT_DIR/build-linux.sh" --arch "$ARCH"
        ;;
    macos)
        echo "Building for macOS ($ARCH)..."
        bash "$SCRIPT_DIR/build-macos.sh" --arch "$ARCH"
        ;;
    *)
        echo "Unknown platform: $PLATFORM"
        echo "Use: windows, linux, or macos"
        exit 1
        ;;
esac

echo ""
echo "Build completed!"
