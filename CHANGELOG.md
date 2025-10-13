# Changelog

All notable changes to AlphaCodeIDE will be

---

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

### Removed
-

---

documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.96.11] - 2025-10-13

### Fixed
- **AlphaCode media assets not loading in production builds**
  - Added AlphaCode setup media files to build process (`gulpfile.vscode.js` and `gulpfile.vscode.web.js`)
  - Fixed `alphacode-logo.png` failing to load after GitHub compilation (ERR_FILE_NOT_FOUND)
  - Setup wizard logo now displays correctly in compiled releases

---

## [1.96.10] - 2025-10-13

### Added
- **First-time setup wizard** with modern UI for initial configuration
  - Welcome screen with AlphaCode branding
  - Keybindings selection (VS Code or Vim)
  - Optional `surf` terminal command installation
  - Editor theme selection with live preview
  - Multi-step wizard with progress indicators
- Setup wizard service for managing first-run experience
- Setup preferences storage and persistence

### Changed
- Enhanced first-run experience with guided setup flow

### Fixed

### Removed

---

## [1.96.9] - 2025-10-12

### Added
- AlphaCode AI integration with multi-provider support (Anthropic, OpenAI, Azure, Local models)
- Chat interface with streaming responses
- AI-powered code editing with proposal system
- File editing tools with diff preview
- Transaction-based undo/redo for AI changes
- Context-aware code assistance
- Pair programming features
- Security service for AI operations

### Changed
- Forked from Visual Studio Code
- Rebranded to AlphaCodeIDE
- Updated application name and icons
- Modified build system for AlphaCodeIDE distribution

### Technical
- Implemented layered architecture in `src/vs/workbench/contrib/alphacode/`
- Added service layer for AI, chat, context, and agent management
- Created proposal manager for AI-driven code changes
- Integrated stream handler for real-time AI responses
- Built tool registry system for AI capabilities

---

## Release History

For detailed release information and downloads, visit:
[https://github.com/jessy2027/AlphaCode/releases](https://github.com/jessy2027/AlphaCode/releases)

## Migration from VS Code

This project is a fork of Visual Studio Code. Previous VS Code release notes have been removed as AlphaCodeIDE maintains its own changelog starting from version 1.96.9.

For VS Code release history, please refer to the [official VS Code repository](https://github.com/microsoft/vscode/releases).
