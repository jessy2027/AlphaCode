#!/usr/bin/env pwsh
#
# AlphaCodeIDE Windows Build Script
# Compiles and creates Windows installer packages
#

param(
    [string]$Arch = "x64",  # x64 or arm64
    [switch]$SkipCompile = $false,
    [switch]$InnoSetup = $true,
    [switch]$Archive = $false,
    [switch]$System = $false  # System install vs User install
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AlphaCodeIDE Windows Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set memory limit for Node.js
$env:NODE_OPTIONS = "--max-old-space-size=16384"

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host "Architecture: $Arch" -ForegroundColor Gray
Write-Host ""

# Step 1: Compile (if not skipped)
if (-not $SkipCompile) {
    Write-Host "[1/4] Compiling TypeScript..." -ForegroundColor Yellow
    Write-Host "This may take up to 60 minutes..." -ForegroundColor Gray
    
    $compileStart = Get-Date
    npm run compile-build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Compilation failed!" -ForegroundColor Red
        exit 1
    }
    
    $compileEnd = Get-Date
    $compileDuration = $compileEnd - $compileStart
    Write-Host "[OK] Compilation completed in $($compileDuration.ToString('mm\:ss'))" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[1/4] Skipping compilation..." -ForegroundColor Gray
    Write-Host ""
}

# Step 2: Build Windows package
Write-Host "[2/4] Building Windows package..." -ForegroundColor Yellow

$buildStart = Get-Date
npm run gulp "vscode-win32-$Arch"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Package build failed!" -ForegroundColor Red
    exit 1
}

$buildEnd = Get-Date
$buildDuration = $buildEnd - $buildStart
Write-Host "[OK] Package built in $($buildDuration.ToString('mm\:ss'))" -ForegroundColor Green
Write-Host ""

# Step 3: Create installer
if ($InnoSetup) {
    Write-Host "[3/4] Preparing Inno Setup updater..." -ForegroundColor Yellow
    npm run gulp "vscode-win32-$Arch-inno-updater"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Inno updater preparation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Inno updater prepared" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[4/4] Creating Inno Setup installer..." -ForegroundColor Yellow
    
    if ($System) {
        $installerTarget = "vscode-win32-$Arch-system-setup"
        Write-Host "Creating system installer..." -ForegroundColor Gray
    } else {
        $installerTarget = "vscode-win32-$Arch-user-setup"
        Write-Host "Creating user installer..." -ForegroundColor Gray
    }
    
    $installerStart = Get-Date
    npm run gulp $installerTarget
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Installer creation failed!" -ForegroundColor Red
        exit 1
    }
    
    $installerEnd = Get-Date
    $installerDuration = $installerEnd - $installerStart
    Write-Host "[OK] Installer created in $($installerDuration.ToString('mm\:ss'))" -ForegroundColor Green
} else {
    Write-Host "[3/4] Skipping installer creation..." -ForegroundColor Gray
}
Write-Host ""

# Step 4: Create archive (optional)
if ($Archive) {
    Write-Host ""
    Write-Host "[Extra] Creating ZIP archive..." -ForegroundColor Yellow
    
    $archiveTarget = "vscode-win32-$Arch-archive"
    npm run gulp $archiveTarget
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Archive creation failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "[OK] Archive created" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Output location:" -ForegroundColor Yellow
Write-Host "  .build\win32-$Arch\" -ForegroundColor White
Write-Host ""
Write-Host "Installer location:" -ForegroundColor Yellow
Write-Host "  Check .build\ for setup files" -ForegroundColor White
Write-Host ""

# Examples of usage
Write-Host "Usage examples:" -ForegroundColor Cyan
Write-Host "  .\scripts\build-windows.ps1                    # Build x64 with Inno Setup" -ForegroundColor Gray
Write-Host "  .\scripts\build-windows.ps1 -Arch arm64        # Build ARM64" -ForegroundColor Gray
Write-Host "  .\scripts\build-windows.ps1 -SkipCompile       # Skip compilation step" -ForegroundColor Gray
Write-Host "  .\scripts\build-windows.ps1 -Archive           # Also create ZIP archive" -ForegroundColor Gray
Write-Host "  .\scripts\build-windows.ps1 -System            # Build system installer" -ForegroundColor Gray
