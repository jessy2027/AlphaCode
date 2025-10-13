# Release Template

Use this template when preparing a new release of AlphaCodeIDE.

## Pre-Release Checklist

- [ ] Update version number in `package.json`
- [ ] Update CHANGELOG.md with new version section
- [ ] Review and test all changes
- [ ] Ensure all CI tests pass
- [ ] Build and test locally for all platforms
- [ ] Update documentation if needed

## CHANGELOG.md Entry Template

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature 1
- New feature 2

### Changed
- Change 1
- Change 2

### Fixed
- Bug fix 1
- Bug fix 2

### Removed
- Removal 1
- Removal 2

### Security
- Security fix 1 (if applicable)

### Performance
- Performance improvement 1 (if applicable)

### Documentation
- Documentation update 1 (if applicable)

### Technical
- Technical change 1 (internal changes, refactoring, etc.)
```

## Release Process

### 1. Prepare the Release

```bash
# Update version (choose one)
npm run version:patch  # For bug fixes (1.96.9 -> 1.96.10)
npm run version:minor  # For new features (1.96.9 -> 1.97.0)
npm run version:major  # For breaking changes (1.96.9 -> 2.0.0)
```

### 2. Update CHANGELOG.md

1. Move items from `[Unreleased]` to a new version section
2. Use today's date in ISO format (YYYY-MM-DD)
3. Add a descriptive summary of the release
4. Organize changes by category (Added, Changed, Fixed, etc.)

### 3. Commit and Tag

```bash
# Commit the changelog and version bump
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: bump version to X.Y.Z"

# Create a git tag
git tag -a vX.Y.Z -m "Release vX.Y.Z"

# Push changes and tags
git push origin main
git push origin vX.Y.Z
```

### 4. GitHub Release

The release workflow will automatically:
- Build packages for Windows, Linux, and macOS
- Extract release notes from CHANGELOG.md
- Create a GitHub release with the built artifacts
- Generate additional release notes from commits

### 5. Post-Release

- [ ] Verify the release on GitHub
- [ ] Test download links
- [ ] Update any external documentation
- [ ] Announce the release (if applicable)

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes, major rewrites
- **MINOR** (1.X.0): New features, enhancements (backward compatible)
- **PATCH** (1.96.X): Bug fixes, minor improvements (backward compatible)

## Example Release

```bash
# Example: Releasing version 1.97.0

# 1. Update version
npm run version:minor

# 2. Edit CHANGELOG.md
# Add new section:
# ## [1.97.0] - 2025-10-15
# ### Added
# - New AI provider support for Google Gemini
# - Code completion suggestions in chat
# etc...

# 3. Commit and tag
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: bump version to 1.97.0"
git tag -a v1.97.0 -m "Release v1.97.0"

# 4. Push
git push origin main
git push origin v1.97.0

# 5. Monitor GitHub Actions for build completion
```

## Notes

- The workflow extracts release notes from CHANGELOG.md automatically
- If no changelog section is found for the version, GitHub will generate notes from commits
- Always keep the `[Unreleased]` section at the top of CHANGELOG.md for work in progress
- Use clear, user-focused language in changelog entries
- Link to issues/PRs when relevant using `#issue-number` or full URLs
