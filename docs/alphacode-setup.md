# AlphaCodeIDE Developer Setup

## Prerequisites
- **Node.js**: Install the version specified in `.nvmrc` (`22.18.0`). With `nvm`, run:
  ```bash
  nvm install
  nvm use
  ```
- **npm**: Bundled with Node.js 22.
- **Python 3**, **C/C++ build tools**, and platform-specific dependencies required by the VS Code build (see `build/azure-pipelines/linux/web/README.md` for reference).
- **Git LFS** (recommended) for large assets.

## Install Dependencies
```bash
npm install
```
This runs the upstream `preinstall`/`postinstall` scripts that download Electron, compile native modules, and hydrate built-in extensions.

## Launch AlphaCodeIDE (Desktop)
```bash
npm run alphacode
```
The script wraps `scripts/code.sh|bat` while exporting `ALPHACODE_IDE=1`, ensuring the rebranded `product.json` metadata is used.

### Useful Flags
- `--inspect` – attach DevTools to the Electron main process.
- `--disable-extensions` – run without extensions.
- `--builtin` – open the built-in extensions development workspace.

Example:
```bash
npm run alphacode -- --disable-extensions
```

## Launch AlphaCodeIDE (Web playground)
For browser-based testing leverage the web launcher:
```bash
npm run alphacode-web -- --playground
```
This proxies to `@vscode/test-web`, hosts the static build, and opens the provided demo workspace.

## Rebuilding After Changes
Most source edits require recompiling TypeScript:
```bash
npm run watch
```
This starts both `watch-client` and `watch-extensions`, rebuilding `out/` incrementally.

## Packaging Notes
The new branding strings live in `product.json`. When producing distributables (`npm run compile-build` and platform packaging scripts), the AlphaCode naming/identifiers propagate automatically.

## Troubleshooting
- Delete `.build/` and `out/` if Electron or native modules fall out of sync, then rerun `npm install`.
- Verify `ALPHACODE_IDE` is present in the environment when debugging launcher behaviour.
- Consult upstream VS Code [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute) for deeper build troubleshooting—process remains compatible.
