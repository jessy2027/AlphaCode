# AlphaCodeIDE Documentation

Welcome to the AlphaCodeIDE documentation! This directory contains comprehensive guides for developers and contributors.

## Documentation Index

### For Contributors

- **[RELEASE_PROCESS.md](RELEASE_PROCESS.md)** - Complete guide for creating and managing releases
  - Version bumping procedures
  - Changelog management
  - Release workflow documentation
  - Best practices

### Project Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Development guide for working with the codebase
  - Project architecture
  - Development commands
  - Coding guidelines
  - Testing procedures

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute to AlphaCodeIDE
  - Contribution guidelines
  - Code of conduct
  - Pull request process

- **[README.md](../README.md)** - Project overview and getting started
  - Features
  - Installation
  - Quick start

### Build & Development

- **[BUILD.md](../scripts/BUILD.md)** - Detailed build instructions
  - Platform-specific builds
  - Dependencies
  - Build scripts

### Release Management

- **[RELEASE_TEMPLATE.md](../.github/RELEASE_TEMPLATE.md)** - Template for releases
  - Pre-release checklist
  - Release steps
  - Post-release tasks

- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and changes
  - Release notes
  - Feature additions
  - Bug fixes

## Additional Resources

### AlphaCode Features

For information about AlphaCode-specific features (AI integration, chat interface, etc.), see:
- [src/vs/workbench/contrib/alphacode/README.md](../src/vs/workbench/contrib/alphacode/README.md)

### External Links

- [GitHub Repository](https://github.com/jessy2027/AlphaCode)
- [Issue Tracker](https://github.com/jessy2027/AlphaCode/issues)
- [Releases](https://github.com/jessy2027/AlphaCode/releases)

## Quick Links

### Development Workflow

1. **Clone & Setup**
   ```bash
   git clone https://github.com/jessy2027/AlphaCode.git
   cd AlphaCodeIDE
   npm install
   ```

2. **Build & Run**
   ```bash
   npm run watch        # Watch mode for development
   npm run alphacode    # Run the IDE
   ```

3. **Test**
   ```bash
   ./scripts/test.sh    # Run unit tests
   ```

### Release Workflow

1. **Update CHANGELOG.md** with your changes
2. **Bump version** via GitHub Actions or npm scripts
3. **Push tag** to trigger release workflow
4. **Monitor build** in GitHub Actions

See [RELEASE_PROCESS.md](RELEASE_PROCESS.md) for detailed instructions.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

Before contributing:
1. Read the [CLAUDE.md](../CLAUDE.md) development guide
2. Check open issues and discussions
3. Follow the coding guidelines
4. Write tests for new features
5. Update documentation as needed

## Need Help?

- Check existing documentation in this directory
- Search [open issues](https://github.com/jessy2027/AlphaCode/issues)
- Read the [VS Code Contributing Guide](https://github.com/microsoft/vscode/wiki/How-to-Contribute) for VS Code-specific questions

---

**Note**: AlphaCodeIDE is a fork of Visual Studio Code with integrated AI capabilities. Documentation specific to VS Code's core functionality can be found in the [official VS Code repository](https://github.com/microsoft/vscode).
