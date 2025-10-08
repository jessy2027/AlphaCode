#!/usr/bin/env bash
#
# AlphaCodeIDE Linux Build Script
# Compiles and creates Linux distribution packages
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
ARCH="x64"  # x64, arm64, or armhf
SKIP_COMPILE=false
CREATE_DEB=true
CREATE_RPM=true
CREATE_SNAP=false
CREATE_ARCHIVE=false

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
        --no-deb)
            CREATE_DEB=false
            shift
            ;;
        --no-rpm)
            CREATE_RPM=false
            shift
            ;;
        --snap)
            CREATE_SNAP=true
            shift
            ;;
        --archive)
            CREATE_ARCHIVE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--arch x64|arm64|armhf] [--skip-compile] [--no-deb] [--no-rpm] [--snap] [--archive]"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}========================================"
echo -e "  AlphaCodeIDE Linux Build Script"
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

# Step 2: Build Linux package
echo -e "${YELLOW}[2/4] Building Linux package...${NC}"

BUILD_START=$(date +%s)
npm run gulp "vscode-linux-${ARCH}"

BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))
BUILD_MIN=$((BUILD_DURATION / 60))
BUILD_SEC=$((BUILD_DURATION % 60))

echo -e "${GREEN}[OK] Package built in ${BUILD_MIN}m ${BUILD_SEC}s${NC}"
echo ""

# Step 3: Create distribution packages
echo -e "${YELLOW}[3/4] Creating distribution packages...${NC}"

PACKAGE_COUNT=0

# DEB package
if [ "$CREATE_DEB" = true ]; then
    echo -e "${GRAY}Creating DEB package...${NC}"
    npm run gulp "vscode-linux-${ARCH}-build-deb"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] DEB package created${NC}"
        PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
    else
        echo -e "${RED}[FAIL] DEB package creation failed${NC}"
    fi
fi

# RPM package
if [ "$CREATE_RPM" = true ]; then
    echo -e "${GRAY}Creating RPM package...${NC}"
    npm run gulp "vscode-linux-${ARCH}-build-rpm"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] RPM package created${NC}"
        PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
    else
        echo -e "${RED}[FAIL] RPM package creation failed${NC}"
    fi
fi

# Snap package (optional)
if [ "$CREATE_SNAP" = true ]; then
    echo -e "${GRAY}Creating Snap package...${NC}"
    npm run gulp "vscode-linux-${ARCH}-build-snap"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Snap package created${NC}"
        PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
    else
        echo -e "${RED}[FAIL] Snap package creation failed${NC}"
    fi
fi

echo ""

# Step 4: Create archive (optional)
if [ "$CREATE_ARCHIVE" = true ]; then
    echo -e "${YELLOW}[4/4] Creating TAR.GZ archive...${NC}"
    npm run gulp "vscode-linux-${ARCH}-archive"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Archive created${NC}"
    else
        echo -e "${RED}[FAIL] Archive creation failed${NC}"
    fi
else
    echo -e "${GRAY}[4/4] Skipping archive creation...${NC}"
fi

# Summary
echo ""
echo -e "${CYAN}========================================"
echo -e "  Build completed successfully!"
echo -e "========================================${NC}"
echo ""
echo -e "${YELLOW}Output location:${NC}"
echo -e "${NC}  .build/linux/${NC}"
echo ""
echo -e "${YELLOW}Packages created: ${PACKAGE_COUNT}${NC}"
echo ""

# Examples of usage
echo -e "${CYAN}Usage examples:${NC}"
echo -e "${GRAY}  ./scripts/build-linux.sh                     # Build x64 with DEB and RPM"
echo -e "  ./scripts/build-linux.sh --arch arm64        # Build ARM64"
echo -e "  ./scripts/build-linux.sh --skip-compile      # Skip compilation step"
echo -e "  ./scripts/build-linux.sh --no-rpm            # Skip RPM package"
echo -e "  ./scripts/build-linux.sh --snap              # Also create Snap package"
echo -e "  ./scripts/build-linux.sh --archive           # Also create TAR.GZ archive${NC}"
echo ""
