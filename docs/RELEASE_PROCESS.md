# AlphaCodeIDE Release Process

This document describes the release process for AlphaCodeIDE.

## Overview

AlphaCodeIDE uses a structured release process based on:
- **Semantic Versioning** (MAJOR.MINOR.PATCH)
- **Automated GitHub Workflows** for version bumping and releases
- **CHANGELOG.md** for tracking all changes
- **Release Notes** extracted automatically from CHANGELOG.md

## Quick Start

### Creating a New Release

1. **Update CHANGELOG.md** with your changes
2. **Bump the version** using GitHub Actions or npm scripts
3. **Push and tag** to trigger the release workflow
4. **Monitor the build** in GitHub Actions

## Detailed Process

### 1. Preparing Changes

Before releasing, ensure all your changes are documented in `CHANGELOG.md` under the `[Unreleased]` section:

```markdown
## [Unreleased]

### Added
- New AI provider integration for Gemini
- Code completion in chat interface

### Changed
- Improved diff visualization performance

### Fixed
- Fixed memory leak in streaming handler
```

You can use the changelog helper script:

```bash
# Add a new version section to CHANGELOG.md
npm run changelog:add

# Validate CHANGELOG.md format
npm run changelog:validate

# Extract release notes for the current version
npm run changelog:extract
```

### 2. Versioning

#### Using GitHub Actions (Recommended)

Go to **Actions** → **Version Bump** → **Run workflow**

Choose the bump type:
- **patch**: Bug fixes (1.96.9 → 1.96.10)
- **minor**: New features (1.96.9 → 1.97.0)
- **major**: Breaking changes (1.96.9 → 2.0.0)

The workflow will:
1. Bump the version in `package.json`
2. Create a git tag
3. Push the changes
4. Optionally trigger the release workflow

#### Using npm Scripts Manually

```bash
# Bump version locally
npm run version:patch  # or version:minor, version:major

# Update CHANGELOG.md manually
npm run changelog:add

# Commit and push
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: bump version to X.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

### 3. Release Workflow

When you push a tag (e.g., `v1.96.10`), the release workflow automatically:

1. **Builds** packages for:
   - Windows (x64) - `.exe` installer
   - Linux (x64) - `.deb` and `.rpm` packages
   - macOS (x64) - `.zip` archive

2. **Extracts** release notes from `CHANGELOG.md` for the version

3. **Creates** a GitHub release with:
   - Release notes from CHANGELOG.md
   - Auto-generated commit history
   - All build artifacts

4. **Generates** a `release.json` file for update checking

### 4. Post-Release

After the release is published:

1. **Verify** the release on [GitHub Releases](https://github.com/jessy2027/AlphaCode/releases)
2. **Test** the installers/packages
3. **Move** the released changes from `[Unreleased]` to the version section in CHANGELOG.md
4. **Announce** the release (if applicable)

## CHANGELOG.md Format

Follow the [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased]

### Added
- Features added but not yet released

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Removed
- Features removed

## [1.96.10] - 2025-10-15

### Added
- Feature 1
- Feature 2

### Fixed
- Bug fix 1
```

### Categories

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes
- **Performance**: Performance improvements
- **Documentation**: Documentation changes
- **Technical**: Internal/technical changes

## Workflows

### Version Bump Workflow

**File**: `.github/workflows/version-bump.yml`

**Triggers**:
- Manual workflow dispatch

**Actions**:
- Bumps version in `package.json`
- Creates and pushes a git tag
- Optionally triggers the release workflow

### Release Workflow

**File**: `.github/workflows/release.yml`

**Triggers**:
- Push of a tag matching `v*`
- Manual workflow dispatch

**Actions**:
- Builds for Windows, Linux, macOS
- Extracts changelog section for the version
- Creates GitHub release with artifacts

## Helpful Scripts

### Changelog Helper

```bash
# Add a section for the current version
node scripts/changelog-helper.js add

# Add a section for a specific version
node scripts/changelog-helper.js add 1.97.0

# Validate CHANGELOG.md format
node scripts/changelog-helper.js validate

# Extract release notes for current version
node scripts/changelog-helper.js extract

# Extract release notes for a specific version
node scripts/changelog-helper.js extract 1.96.9

# Show current version
node scripts/changelog-helper.js current
```

### Version Scripts

```bash
# Bump version
npm run version:patch  # 1.96.9 → 1.96.10
npm run version:minor  # 1.96.9 → 1.97.0
npm run version:major  # 1.96.9 → 2.0.0

# Changelog management
npm run changelog:add       # Add new version section
npm run changelog:validate  # Validate format
npm run changelog:extract   # Extract release notes
```

## Best Practices

1. **Always update CHANGELOG.md** before releasing
2. **Use semantic versioning** correctly:
   - PATCH for bug fixes
   - MINOR for new features (backward compatible)
   - MAJOR for breaking changes
3. **Write clear, user-focused** release notes
4. **Test locally** before pushing tags
5. **Monitor GitHub Actions** for build failures
6. **Keep [Unreleased] section** active for ongoing work

## Troubleshooting

### Build Fails

- Check GitHub Actions logs
- Verify all dependencies are available
- Ensure compilation succeeds locally with `npm run compile-build`

### Missing Release Notes

If the changelog section is missing for a version, the workflow will use auto-generated notes from Git commits.

To add missing notes:
1. Edit CHANGELOG.md
2. Add the version section manually
3. Re-run the release workflow

### Tag Already Exists

If a tag already exists and you need to re-release:

```bash
# Delete local tag
git tag -d vX.Y.Z

# Delete remote tag
git push origin :refs/tags/vX.Y.Z

# Create new tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Templates

### Release Template

See [`.github/RELEASE_TEMPLATE.md`](.github/RELEASE_TEMPLATE.md) for a complete release checklist and template.

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AlphaCodeIDE Repository](https://github.com/jessy2027/AlphaCode)
