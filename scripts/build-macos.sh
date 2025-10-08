#!/usr/bin/env bash
#
# AlphaCodeIDE macOS Build Script
# Compiles and creates macOS distribution packages
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Default parameters
ARCH="x64"  # x64, arm64, or universal
SKIP_COMPILE=false
CREATE_DMG=true
CREATE_ARCHIVE=false
SIGN_APP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --arch)
            ARCH="$2"
            shift 2
            ;;
        --skip-compile)
            SKIP_COMPILE=true
            shift
            ;;
        --no-dmg)
            CREATE_DMG=false
            shift
            ;;
        --archive)
            CREATE_ARCHIVE=true
            shift
            ;;
        --sign)
            SIGN_APP=true
            shift
            ;;
        --universal)
            ARCH="universal"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--arch x64|arm64] [--universal] [--skip-compile] [--no-dmg] [--archive] [--sign]"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}========================================"
echo -e "  AlphaCodeIDE macOS Build Script"
echo -e "========================================${NC}"
echo ""

# Set memory limit for Node.js
export NODE_OPTIONS="--max-old-space-size=16384"

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${GRAY}Project root: $PROJECT_ROOT"
echo -e "Architecture: $ARCH${NC}"
echo ""

# Step 1: Compile (if not skipped)
if [ "$SKIP_COMPILE" = false ]; then
    echo -e "${YELLOW}[1/4] Compiling TypeScript...${NC}"
    echo -e "${GRAY}This may take up to 60 minutes...${NC}"
    
    COMPILE_START=$(date +%s)
    npm run compile-build
    COMPILE_END=$(date +%s)
    
    COMPILE_DURATION=$((COMPILE_END - COMPILE_START))
    COMPILE_MIN=$((COMPILE_DURATION / 60))
    COMPILE_SEC=$((COMPILE_DURATION % 60))
    
    echo -e "${GREEN}[OK] Compilation completed in ${COMPILE_MIN}m ${COMPILE_SEC}s${NC}"
    echo ""
else
    echo -e "${GRAY}[1/4] Skipping compilation...${NC}"
    echo ""
fi

# Step 2: Build macOS package
echo -e "${YELLOW}[2/4] Building macOS package...${NC}"

BUILD_START=$(date +%s)

if [ "$ARCH" = "universal" ]; then
    # Build universal binary (x64 + arm64)
    echo -e "${GRAY}Building universal binary (Intel + Apple Silicon)...${NC}"
    npm run gulp "vscode-darwin-universal"
else
    npm run gulp "vscode-darwin-${ARCH}"
fi

BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))
BUILD_MIN=$((BUILD_DURATION / 60))
BUILD_SEC=$((BUILD_DURATION % 60))

echo -e "${GREEN}[OK] Package built in ${BUILD_MIN}m ${BUILD_SEC}s${NC}"
echo ""

# Step 3: Code signing (optional)
if [ "$SIGN_APP" = true ]; then
    echo -e "${YELLOW}[3/4] Code signing application...${NC}"
    
    if [ -z "$CODESIGN_IDENTITY" ]; then
        echo -e "${RED}[FAIL] CODESIGN_IDENTITY environment variable not set${NC}"
        echo -e "${GRAY}Skipping code signing...${NC}"
    else
        echo -e "${GRAY}Signing with identity: $CODESIGN_IDENTITY${NC}"
        npm run gulp "vscode-darwin-${ARCH}-sign"
        echo -e "${GREEN}[OK] Application signed${NC}"
    fi
    echo ""
else
    echo -e "${GRAY}[3/4] Skipping code signing...${NC}"
    echo ""
fi

# Step 4: Create distribution packages
echo -e "${YELLOW}[4/4] Creating distribution packages...${NC}"

PACKAGE_COUNT=0

# DMG package
if [ "$CREATE_DMG" = true ]; then
    echo -e "${GRAY}Creating DMG installer...${NC}"
    
    if [ "$ARCH" = "universal" ]; then
        npm run gulp "vscode-darwin-universal-dmg"
    else
        npm run gulp "vscode-darwin-${ARCH}-dmg"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] DMG installer created${NC}"
        PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
    else
        echo -e "${RED}[FAIL] DMG creation failed${NC}"
    fi
fi

# Archive (optional)
if [ "$CREATE_ARCHIVE" = true ]; then
    echo -e "${GRAY}Creating ZIP archive...${NC}"
    
    if [ "$ARCH" = "universal" ]; then
        npm run gulp "vscode-darwin-universal-archive"
    else
        npm run gulp "vscode-darwin-${ARCH}-archive"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Archive created${NC}"
        PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
    else
        echo -e "${RED}[FAIL] Archive creation failed${NC}"
    fi
fi

# Summary
echo ""
echo -e "${CYAN}========================================"
echo -e "  Build completed successfully!"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}Output location:${NC}"
if [ "$ARCH" = "universal" ]; then
    echo -e "${NC}  .build/darwin-universal/${NC}"
else
    echo -e "${NC}  .build/darwin-${ARCH}/${NC}"
fi
echo ""
echo -e "${YELLOW}Packages created: ${PACKAGE_COUNT}${NC}"
echo ""

# Platform-specific notes
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}[WARNING] Note: You are not running on macOS${NC}"
    echo -e "${GRAY}   Building macOS packages on non-macOS systems may have limitations.${NC}"
    echo ""
fi

# Examples of usage
echo -e "${CYAN}Usage examples:${NC}"
echo -e "${GRAY}  ./scripts/build-macos.sh                     # Build x64 with DMG"
echo -e "  ./scripts/build-macos.sh --arch arm64        # Build Apple Silicon"
echo -e "  ./scripts/build-macos.sh --universal         # Build universal binary"
echo -e "  ./scripts/build-macos.sh --skip-compile      # Skip compilation step"
echo -e "  ./scripts/build-macos.sh --sign              # Code sign the app"
echo -e "  ./scripts/build-macos.sh --archive           # Also create ZIP archive${NC}"
echo ""
