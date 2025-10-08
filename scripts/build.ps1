#!/usr/bin/env pwsh
#
# AlphaCodeIDE Universal Build Script
# Cross-platform build launcher
#

param(
    [Parameter(Position=0)]
    [ValidateSet("windows", "linux", "macos", "all")]
    [string]$Platform = "windows",
    
    [string]$Arch = "x64",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Show help
if ($Help) {
    Write-Host @"
AlphaCodeIDE Build System
=========================

Usage:
  .\scripts\build.ps1 <platform> [options]

Platforms:
  windows    Build for Windows (x64, arm64)
  linux      Build for Linux (x64, arm64, armhf)
  macos      Build for macOS (x64, arm64, universal)
  all        Build for all platforms

Options:
  -Arch <arch>    Target architecture (x64, arm64, armhf, universal)
  -Help           Show this help message

Examples:
  .\scripts\build.ps1 windows
  .\scripts\build.ps1 windows -Arch arm64
  .\scripts\build.ps1 linux -Arch x64
  .\scripts\build.ps1 macos -Arch arm64
  .\scripts\build.ps1 all

Platform-specific scripts:
  .\scripts\build-windows.ps1    - Detailed Windows build options
  .\scripts\build-linux.sh       - Detailed Linux build options
  .\scripts\build-macos.sh       - Detailed macOS build options

"@
    exit 0
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AlphaCodeIDE Build System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

switch ($Platform.ToLower()) {
    "windows" {
        Write-Host "Building for Windows ($Arch)..." -ForegroundColor Yellow
        Write-Host ""
        & "$scriptPath\build-windows.ps1" -Arch $Arch
    }
    "linux" {
        Write-Host "Building for Linux ($Arch)..." -ForegroundColor Yellow
        Write-Host ""
        if ($IsWindows) {
            Write-Host "Note: Building Linux from Windows (using WSL recommended)" -ForegroundColor Gray
        }
        bash "$scriptPath/build-linux.sh" --arch $Arch
    }
    "macos" {
        Write-Host "Building for macOS ($Arch)..." -ForegroundColor Yellow
        Write-Host ""
        if ($IsWindows) {
            Write-Host "Warning: Building macOS from Windows may have limitations" -ForegroundColor Yellow
        }
        bash "$scriptPath/build-macos.sh" --arch $Arch
    }
    "all" {
        Write-Host "Building for all platforms..." -ForegroundColor Yellow
        Write-Host ""
        
        # Windows
        Write-Host "→ Building Windows..." -ForegroundColor Cyan
        & "$scriptPath\build-windows.ps1" -Arch x64
        
        # Linux
        Write-Host ""
        Write-Host "→ Building Linux..." -ForegroundColor Cyan
        bash "$scriptPath/build-linux.sh" --arch x64
        
        # macOS
        Write-Host ""
        Write-Host "→ Building macOS..." -ForegroundColor Cyan
        bash "$scriptPath/build-macos.sh" --arch x64
        
        Write-Host ""
        Write-Host "All platforms built successfully!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Build process completed!" -ForegroundColor Green
