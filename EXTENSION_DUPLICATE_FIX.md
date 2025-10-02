# Extension Duplicate Registration Fix

## Problem
When starting AlphaCode, numerous error messages appeared in the console indicating that built-in extensions were being registered multiple times:

```
[Extension Host] Extension `vscode.bat` is already registered
[Extension Host] Extension `vscode.clojure` is already registered
[Extension Host] Extension `vscode.coffeescript` is already registered
... (and many more)
```

## Root Cause
The issue was in the `ExtensionDescriptionRegistry.deltaExtensions()` method located at:
`src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts`

When adding new extensions via `deltaExtensions()`, the method would simply concatenate the new extensions to the existing list without first removing any existing extensions with the same identifier:

```typescript
// Old code (line 109)
this._extensionDescriptions = this._extensionDescriptions.concat(toAdd);
```

This caused duplicate extensions to be added to the registry. When `_initialize()` was called, it would detect these duplicates and log error messages, but the duplicates would still be present in the internal array.

## Solution
Modified the `deltaExtensions()` method to remove any existing extensions with the same identifier before adding the new ones:

```typescript
// New code (lines 109-112)
// First, remove any existing extensions with the same identifier to prevent duplicates
const toAddIdentifiers = toAdd.map(ext => ext.identifier);
this._extensionDescriptions = removeExtensions(this._extensionDescriptions, toAddIdentifiers);
this._extensionDescriptions = this._extensionDescriptions.concat(toAdd);
```

This ensures that when an extension is being added (or re-added with a different version), any existing instance is removed first, preventing duplicates.

## Files Modified
- `src/vs/workbench/services/extensions/common/extensionDescriptionRegistry.ts`

## Testing
To verify the fix:
1. Run `.\scripts\code.bat` from the AlphaCode directory
2. Check the console output - the "Extension `X` is already registered" errors should no longer appear
3. Verify that all extensions load correctly and the extension host starts without issues

## Impact
- **Low Risk**: The change is minimal and follows the existing pattern used for removing extensions
- **High Benefit**: Eliminates console spam and ensures clean extension registration
- **No Breaking Changes**: The behavior is now more correct - extensions are properly replaced rather than duplicated
