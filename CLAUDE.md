# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian Outliner is an Obsidian plugin that provides outliner functionality (like Workflowy or RoamResearch) with bullet/list operations, drag-and-drop, and more.

## Commands

```bash
# Build
npm run build              # Production build to dist/main.js
npm run build-with-tests   # Build including test server entry point
npm run dev                # Watch mode build

# Lint & Format
npm run lint               # Run prettier check + eslint on src/
npm run lint:fix           # Run prettier --write + eslint --fix on src/ (not defined but use: prettier --write src && eslint src --fix)

# Test
npm test                   # Run all tests (requires a running Obsidian instance for integration tests)
npm run test:unit          # Run only unit tests, skipping Obsidian integration tests
```

To run a single test file:
```bash
npx jest path/to/test.ts --forceExit
npx jest specs/features/EnterBehaviourOverride.spec.md --forceExit
```

Integration tests (`.spec.md` files) require a running Obsidian instance with the plugin loaded via `npm run build-with-tests`. The test environment connects via WebSocket on `ws://127.0.0.1:8080`.

Unit tests (`__tests__/*.test.ts`) can run standalone with `SKIP_OBSIDIAN=1`.

## Directory Structure

```
src/
├── editor/               # CodeMirror editor utilities
│   ├── index.ts          # Editor extension registration
│   ├── checkboxRe.ts     # Checkbox regex patterns
│   ├── createEditorCallback.ts
│   ├── createKeymapRunCallback.ts
│   └── isEmptyLineOrEmptyCheckbox.ts
├── features/             # Feature implementations (keyboard handlers, UI)
├── operations/           # List operations (indent, move, outdent, etc.)
├── root/                 # Core data model (Root, List classes)
├── services/             # Core services (Parser, ChangesApplicator, etc.)
├── utils/                # Utility functions
├── __mocks__.ts          # Test mock helpers
├── ObsidianOutlinerPlugin.ts           # Main plugin entry
└── ObsidianOutlinerPluginWithTests.ts  # Test variant with WebSocket server
```

## Architecture

The plugin follows a layered architecture:

### Core Data Model (`src/root/`)
`Root` and `List` classes represent the parsed list structure. `Root` holds the entire list block (start/end positions, selections). `List` is a tree node with parent/children, bullet, indent, optional checkbox, and multi-line content (notes). The `Parser` service builds this tree from editor text; `ChangesApplicator` diffs old vs new `Root` and writes minimal editor changes.

### Operations (`src/operations/`)
Each operation (e.g. `IndentList`, `MoveListUp`, `OutdentListIfItsEmpty`) implements the `Operation` interface with three methods: `perform()`, `shouldUpdate()`, `shouldStopPropagation()`. Operations mutate a `Root` in place. `OperationPerformer` orchestrates: parse → clone root → run operation → apply diff.

### Features (`src/features/`)
Each feature implements the `Feature` interface (`load()`/`unload()`). Features are behaviour overrides (key handlers, editor extensions) or UI features (settings tab, vertical lines, drag-and-drop). They receive services via constructor injection and register Obsidian event handlers/commands in `load()`.

### Services (`src/services/`)
- `Parser` — converts raw editor text into `Root`/`List` trees
- `ChangesApplicator` — applies Root diffs back to the editor
- `OperationPerformer` — ties Parser + ChangesApplicator together for feature use
- `Settings` — persists plugin settings via Obsidian's data API
- `ObsidianSettings` — reads Obsidian-level configuration (indent chars, vim mode, etc.)
- `IMEDetector` — detects active IME composition to skip key overrides
- `Logger` — debug logging gated by the debug setting

### Editor (`src/editor/`)
CodeMirror extensions and editor utilities. Registers keymaps, handles checkbox rendering, and provides editor callbacks for operations.

### Entry Point
`ObsidianOutlinerPlugin.ts` instantiates all services and features, then calls `load()` on each. The test variant `ObsidianOutlinerPluginWithTests.ts` adds a WebSocket server for the integration test harness.

## Tests

- **Unit tests** (`src/operations/__tests__/*.test.ts`, `src/services/__tests__/`) — use mock helpers from `src/__mocks__.ts` (`makeEditor`, `makeRoot`, `makeSettings`).
- **Integration tests** (`specs/features/*.spec.md`, `jest/DefaultObsidianBehaviour.spec.md`) — Markdown files parsed by `jest/md-spec-transformer.js`. Each `# heading` is a test case; actions (`applyState`, `keydown`, `assertState`, etc.) drive a real Obsidian instance via WebSocket.

### Writing Integration Tests

Test files are markdown (`.spec.md`) with test cases as `# headings`. Available actions:

- `applyState` - Set editor content and cursor position
- `keydown` - Simulate key press
- `assertState` - Assert editor content and cursor position
- `assertSelection` - Assert selection range


      # Test case name
      
      applyState:
      ```
      - Item 1|
      - Item 2
      ```
      
      keydown: Enter
      
      assertState:
      ```
      - Item 1
      - |
      - Item 2
      ```


### Debugging Tests

To debug integration tests, add `console.log` statements in the code. For unit tests:
```bash
SKIP_OBSIDIAN=1 npx jest path/to/test.ts --forceExit --verbose
```

## Build

Rollup bundles to a single CJS `dist/main.js`. `PLUGIN_VERSION` and `CHANGELOG_MD` globals are injected at build time. Obsidian, CodeMirror packages are externalized.
