# Working on Obsidian Outliner

Obsidian Outliner is an Obsidian plugin for list editing, keyboard behaviour overrides, and drag-and-drop. Keep changes focused on the requested behaviour and follow nearby code and tests.

## Commands

Run commands from the repository root. Use `npm ci` to install locked dependencies; use the Node version in `.github/workflows/build.yml` when reproducing CI.

```bash
# Build (all variants overwrite dist/main.js)
npm run build              # Production plugin
npm run build-with-tests   # Plugin with the integration-test WebSocket client
npm run dev                # Watch mode using the same test-enabled entry point

# Check source formatting and lint
npm run lint               # Prettier check + ESLint on src/

# Apply fixes only to the files you intend to change; there is no lint:fix script
npx prettier --write src/path/to/file.ts
npx eslint src/path/to/file.ts --fix

# Tests (read the environment requirements below before running Jest)
npm run test:unit          # Unit tests under src/, with SKIP_OBSIDIAN=1
npm run test:release       # Release-script tests in temporary Git repositories
npm test                   # Full Jest suite, including real Obsidian integration tests
```

Rollup produces a CJS `dist/main.js`, injects `PLUGIN_VERSION` and `CHANGELOG_MD`, and externalizes Obsidian and CodeMirror. Use `npm run build` for release artifacts; do not distribute the test-enabled bundle.

## Where to Make Changes

- `src/ObsidianOutlinerPlugin.ts`: production entry point and service/feature wiring.
- `src/features/` and `src/editor/`: user-facing behaviour, lifecycle handlers, and CodeMirror extensions. Features implement `load()`/`unload()`; keep registrations and cleanup consistent with existing features.
- `src/operations/`: operations that mutate the list model and report whether to update the editor or stop propagation.
- `src/root/`: `Root`/`List` tree model.
- `src/services/Parser.ts`, `OperationPerformer.ts`, and `ChangesApplicator.ts`: parse editor text → clone the original model → perform an operation → apply the diff. Reuse this path for list edits rather than duplicating parsing or editor updates.
- `src/services/Settings.ts` and `ObsidianSettings.ts`: plugin settings and Obsidian-level configuration respectively.
- `src/__mocks__.ts`: unit-test helpers such as `makeEditor`, `makeRoot`, and `makeSettings`.
- `src/ObsidianOutlinerPluginWithTests.ts` and `jest/`: test entry point and integration harness.

## Choosing Checks

- For list-model, parser, or operation changes, add a regression test beside the relevant `src/**/__tests__/*.test.ts` tests and run `npm run test:unit`.
- For keyboard, selection, folding, drag-and-drop, or other editor-facing changes, cover the user interaction in `specs/features/` as well as any useful unit tests. Verify the visible result in real Obsidian; mocks alone do not establish editor behaviour.
- For changes to `release.mjs`, run `npm run test:release`. These tests do not require Obsidian; running the release script itself is not a substitute, as it changes version files and creates a commit.
- For source changes, also run `npm run lint` and `npm run build`. Check `.github/workflows/build.yml` for the current CI sequence.
- Report the commands and source revision/snapshot actually checked, failures, and skipped or unavailable checks. A successful build or an old test image is not evidence that the current integration scenarios pass.

### Jest Environment and Safety

Integration tests require a graphical Obsidian installation: the harness supports the macOS app path and Linux Flatpak (`md.obsidian.Obsidian`); see `jest/global-setup.js` for paths and commands. Linux CI supplies Xvfb and D-Bus.

Build with `npm run build-with-tests` first. Jest setup prepares a `vault/` in the working directory, copies the bundle, starts a WebSocket server on port 8080, and launches Obsidian. The plugin and Jest environment connect to `ws://127.0.0.1:8080`. Merely opening a normal plugin instance is not sufficient.

**Use an isolated test profile/container, not a personal Obsidian session, for integration tests.** Integration setup stops Obsidian and rewrites its profile/vault configuration. Do not run harness instances concurrently against the same profile or port.

`SKIP_OBSIDIAN=1` bypasses both Obsidian setup and teardown for unit tests; it does not make integration tests standalone. To run one unit file:

```bash
SKIP_OBSIDIAN=1 npx jest src/operations/__tests__/IndentList.test.ts --forceExit
```

To run one integration file in the prepared isolated environment:

```bash
npm run build-with-tests
npx jest specs/features/EnterBehaviourOverride.spec.md --forceExit
```

For harness diagnostics, set `DEBUG=jest-obsidian`. See `jest/global-setup.js`, `jest/obsidian-environment.js`, and `jest/global-teardown.js` for the actual lifecycle.

### Writing Integration Tests

Markdown suites in `specs/features/*.spec.md` are parsed by `jest/md-spec-transformer.js`. Each `# heading` starts a test. Actions must start with `- `; key names and inline arguments use backticks. In editor states, `|` marks the cursor. Follow nearby specs for selection markers and more involved interactions.

````markdown
# Enter creates a sibling item

- applyState:

```md
- Item 1|
```

- keydown: `Enter`
- assertState:

```md
- Item 1
- |
```
````

Supported actions are defined in `jest/md-spec-transformer.js`: `applyState`, `keydown`, `insertText`, `execute`, `setting`, `assertState`, `platform`, `drag`, `move`, and `drop`. Do not invent actions such as `assertSelection`; use the state assertions and syntax supported by the harness.
