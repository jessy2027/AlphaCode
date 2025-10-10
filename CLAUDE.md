# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AlphaCodeIDE is a fork of Visual Studio Code with integrated AI capabilities. It extends VS Code's architecture with AI-powered features including chat, code editing proposals, and multi-provider AI integration (Anthropic, OpenAI, Azure, local models).

## Development Commands

### Building & Running

```bash
# Install dependencies
npm install

# Compile TypeScript (takes 40-60 minutes first time)
npm run compile

# Watch mode for development (recommended)
npm run watch
# Or use the "VS Code - Build" task in VS Code

# Run the IDE in development mode
npm run alphacode
# Or: ./scripts/alphacode.js
# Or: Use the "Run Dev" task

# Run web version
npm run alphacode-web
```

### Testing

```bash
# Run all unit tests
./scripts/test.sh  # Linux/macOS
.\scripts\test.bat # Windows

# Filter specific tests
./scripts/test.sh --grep "pattern"

# Run integration tests
./scripts/test-integration.sh  # Linux/macOS
.\scripts\test-integration.bat # Windows

# Run browser tests
npm run test-browser

# Run node tests
npm run test-node
```

### Code Quality

```bash
# Check TypeScript compilation (layer validation)
npm run valid-layers-check

# Run ESLint
npm run eslint

# Run hygiene checks (formatting, copyright headers)
npm run hygiene
```

### Important: Always Monitor Compilation

**Before running ANY script or declaring work complete:**
1. Check the "VS Code - Build" task output for compilation errors
2. **NEVER** run tests if there are compilation errors
3. Fix all compilation errors before proceeding

The "VS Code - Build" task runs both "Core - Build" and "Ext - Build" to incrementally compile sources and extensions.

## Architecture

### Core VS Code Layers (src/vs/)

AlphaCodeIDE follows VS Code's layered architecture:

- **`base/`** - Foundation utilities, event system, lifecycle management, cross-platform abstractions
- **`platform/`** - Service infrastructure with dependency injection, file system, configuration, telemetry
- **`editor/`** - Monaco editor implementation, language services, syntax highlighting
- **`workbench/`** - Main application UI and feature integration
  - `workbench/browser/` - Core workbench UI (parts, layout, actions)
  - `workbench/services/` - Service implementations
  - `workbench/contrib/` - Feature contributions (git, debug, search, terminal, **alphacode**)
  - `workbench/api/` - Extension host and VS Code API
- **`code/`** - Electron main process
- **`server/`** - Remote server implementation

### AlphaCode-Specific Architecture (src/vs/workbench/contrib/alphacode/)

The AlphaCode contribution is located at `src/vs/workbench/contrib/alphacode/` and follows VS Code's contribution model:

**Service Layer** (`common/`):
- `aiService.ts` - AI provider abstraction (interfaces for multi-provider support)
- `chatService.ts` - Chat session management, message handling, tool execution
- `contextService.ts` - Workspace context gathering for AI prompts
- `agentService.ts` - AI agent orchestration
- `pairProgramming.ts` - Collaborative coding features
- `securityService.ts` - Security and sandboxing for AI operations
- `configuration.ts` - AlphaCode settings schema

**Implementation Layer** (`browser/`):
- `aiServiceImpl.ts` - AI service implementation with provider routing
- `chatServiceImpl.ts` - Chat service with streaming, tool calls, proposal management
- `alphacodeViewlet.ts` - Main viewlet/sidebar container
- `vibeCodingView.ts` - Chat UI view component
- `proposalManager.ts` - Edit proposal lifecycle (create, accept, reject, diff)
- `transactionManager.ts` - Undo/redo support for proposals using VS Code's transaction system
- `streamHandler.ts` - Handles streaming responses from AI providers
- `chatTools.ts` - Tool registry (read_file, write_file, edit_file, list_directory, search_files, etc.)

**AI Provider Implementations** (`browser/providers/`):
- `anthropicProvider.ts` - Anthropic/Claude integration
- `openaiProvider.ts` - OpenAI/GPT integration
- `azureProvider.ts` - Azure OpenAI integration
- `localProvider.ts` - Local model support

**UI Components** (`browser/components/`):
- `chatHeader.ts` - Chat header with controls
- `chatMessageList.ts` - Message rendering
- `chatInputArea.ts` - User input component

**Key Concepts:**

1. **Dependency Injection**: Services are registered in `alphacode.contribution.ts` and injected via constructors using the `@IServiceName` decorator pattern.

2. **Proposal System**: When AI tools like `write_file` or `edit_file` are called, they create proposals (not immediate edits). Users review and accept/reject proposals through the UI or programmatically. The ProposalManager handles this workflow.

3. **Transaction System**: Accepted proposals use VS Code's undo/redo infrastructure via TransactionManager to allow users to undo AI changes.

4. **Tool Execution Flow**:
   - AI sends tool_use block
   - `chatServiceImpl.ts` detects tool calls via `toolCallParser.ts`
   - Tools execute via `chatTools.ts` registry
   - File editing tools create proposals instead of direct edits
   - Tool results are sent back to AI as tool_result messages

5. **Streaming**: AI responses stream through `streamHandler.ts`, which parses chunks and emits events for UI updates.

## File Editing Workflow

When working with the AlphaCode file editing system:

1. **Reading files**: Use `read_file` tool - returns content directly
2. **Writing files**: Use `write_file` or `edit_file` tools - creates a proposal
3. **Proposals**:
   - Created in `proposalManager.ts` via `addProposal()`
   - Validated (file path must exist and be a file, not directory)
   - Stored with status: 'pending' | 'accepted' | 'rejected' | 'partially-accepted'
   - Emit events: `onDidCreateProposal`, `onDidChangeProposalStatus`
4. **Acceptance**:
   - Calls `transactionManager.applyProposal()` to apply changes with undo support
   - Updates proposal status to 'accepted'
   - Removes from pending proposals map

## Coding Guidelines

### Naming & Style

- Use **tabs** (not spaces) for indentation
- PascalCase for types, enums, classes
- camelCase for functions, methods, properties, variables
- Use arrow functions `=>` over anonymous functions
- Always use curly braces for loops and conditionals
- Prefer `export function` over `export const` for better stack traces

### Strings & Localization

- Use **double quotes** for user-facing strings (need localization via `nls.localize()`)
- Use **single quotes** for internal strings
- All user-visible strings MUST be localized using `vs/nls` module
- No string concatenation for localized strings - use placeholders `{0}`, `{1}`, etc.

### UI Labels

- Use title-style capitalization for commands, buttons, menu items
- Don't capitalize prepositions ≤4 letters unless first/last word (e.g., "Save File in Workspace")

### TypeScript

- Don't export types/functions unless needed across components
- Don't add to global namespace
- Use JSDoc comments for public APIs
- Prefer `async`/`await` over `.then()`

### Code Quality

- All files must include Microsoft copyright header
- Don't add tests to wrong test suite - look for existing patterns
- Use `describe` and `test` consistently
- Clean up any temporary helper files created during development

## Testing Guidelines

- Unit tests: Located in `src/vs/*/test/` folders alongside source files
- Integration tests: In `test/` folder or named `*.integrationTest.ts`
- Extension tests: In `extensions/` folder
- AlphaCode tests: `src/vs/workbench/contrib/alphacode/test/`

When adding tests for AlphaCode:
- Use existing test patterns (see `proposalWorkflow.test.ts`, `transactionManager.test.ts`)
- Mock services using VS Code's test utilities
- Test proposal lifecycle, tool execution, streaming behavior

## Common Workflows

### Adding a New AI Tool

1. Register tool in `chatTools.ts` via `registerDefaultTools()`
2. Define tool schema (name, description, parameters)
3. Implement `execute` function
4. For file editing tools, use `proposeEdit()` to create proposals
5. Return string result to be sent back to AI

### Adding a New AI Provider

1. Create provider file in `browser/providers/`
2. Implement `IAIProvider` interface from `aiProvider.ts`
3. Handle both `sendMessage()` and `sendMessageStream()`
4. Register provider in `aiServiceImpl.ts`
5. Add configuration schema in `configuration.ts`

### Modifying Proposal System

- Edit logic: `proposalManager.ts`
- Transaction/undo logic: `transactionManager.ts`
- Undo element implementation: `proposalUndoElement.ts`
- UI decorations: `proposalDecorationProvider.ts`
- CodeLens for proposals: `proposalCodeLensProvider.ts`

### Debugging

Use VS Code's built-in debugging:
1. Start "VS Code - Build" task (or `npm run watch`)
2. Press F5 to launch Extension Development Host
3. Set breakpoints in TypeScript source files
4. Logs appear in Debug Console

For AlphaCode-specific debugging:
- Chat service logs to console
- Proposal events can be monitored via event emitters
- Stream chunks logged in `streamHandler.ts`

## Important Notes

- **Compilation is slow**: First compile takes ~60 minutes. Use watch mode during development.
- **Layer validation**: Run `npm run valid-layers-check` to ensure proper architectural boundaries (base < platform < editor < workbench)
- **Don't break VS Code**: AlphaCode is a contribution to VS Code, not a replacement. Avoid modifying core VS Code files unless absolutely necessary.
- **Service registration**: All AlphaCode services are registered in `alphacode.contribution.ts` as singletons with `InstantiationType.Delayed`

## Project Structure

```
AlphaCode/
├── src/vs/                          # Core VS Code source
│   ├── base/                        # Foundation layer
│   ├── platform/                    # Platform services layer
│   ├── editor/                      # Monaco editor layer
│   ├── workbench/                   # Workbench layer
│   │   └── contrib/
│   │       └── alphacode/           # AlphaCode contribution ⭐
│   │           ├── common/          # Service interfaces
│   │           ├── browser/         # Implementations & UI
│   │           │   ├── components/  # UI components
│   │           │   └── providers/   # AI provider implementations
│   │           └── test/            # Tests
│   ├── code/                        # Electron main process
│   └── server/                      # Server implementation
├── extensions/                      # Built-in extensions
├── build/                           # Build scripts and tools
├── scripts/                         # Development scripts
│   ├── alphacode.js                 # Launch AlphaCodeIDE
│   ├── test.sh/.bat                 # Run tests
│   ├── build-*.sh/.ps1              # Platform-specific builds
│   └── BUILD.md                     # Build documentation
├── test/                            # Integration tests
├── out/                             # Compiled output (generated)
└── .vscode/tasks.json               # VS Code tasks
```

## Resources

- Repository: https://github.com/jessy2027/AlphaCodeIDE
- Issues: https://github.com/jessy2027/AlphaCodeIDE/issues
- VS Code Contributing Guide: https://github.com/microsoft/vscode/wiki/How-to-Contribute
- VS Code Architecture: https://github.com/microsoft/vscode/wiki/Source-Code-Organization
