# Plan: Fix Vim `o`/`O` recursion on non-list lines

## Context
- GitHub issue #556 reports `RangeError: Maximum call stack size exceeded` when **Vim-mode o/O inserts bullets** is enabled, the cursor is on a non-list text line, and the user presses `o`.
- The likely source is `src/features/VimOBehaviourOverride.ts`: when no list root is parsed, the mapped Vim action falls back to `vim.handleEx(cm, "normal! o")` / `"normal! O"`. Because `o`/`O` are mapped to the same action, that fallback can re-enter itself and recurse.
- Issue comments also mention Vimrc Support `unmap` commands as triggers, which supports avoiding `normal! o/O` from inside this mapping entirely.

## Approach
- Before any production change, add a reproducible red regression test for issue #556 that invokes the registered Vim action on a non-list line and demonstrates the current fallback delegates to `handleEx("normal! o/O")` instead of safely opening a plain line.
- Keep enhanced list behavior for parsed list items.
- Replace recursive fallback calls with direct editor operations that mimic default Vim `o`/`O`: create a plain indented line below/above the current line, move the cursor there, then call `vim.enterInsertMode(cm)`.
- Replace the preliminary `normal! A` call with direct cursor movement to the current line end before parsing/running `CreateNewItem`.
- Guard missing `MarkdownView`/editor access.
- Make Vim mapping setup idempotent so settings changes do not stack duplicate mappings.

## Files to modify
- `src/features/VimOBehaviourOverride.ts`
- `src/features/__tests__/VimOBehaviourOverride.test.ts` (new, if feasible)

## Reuse
- Reuse `Parser.parse(...)` to decide whether the cursor is inside a list.
- Reuse `CreateNewItem` and `OperationPerformer.eval(...)` for list-item behavior.
- Reuse existing `MyEditor` wrapper for Obsidian editor access.
- Reuse Jest mocking patterns from `src/__mocks__.ts` and existing operation tests.

## Steps
- [ ] Add the failing Jest regression test first: mock `window.CodeMirrorAdapter.Vim`, capture the `insertLineAfterBullet` action, mock a minimal active `MarkdownView` editor on plain text, and assert pressing `o`/`O` should not call `handleEx("normal! o/O")`.
- [ ] Run the targeted test and confirm it fails against the current implementation.
- [ ] Add helpers in `VimOBehaviourOverride` for moving to line end and opening a plain line above/below using editor APIs.
- [ ] Change non-list and disabled-setting fallback paths to use the helper instead of `vim.handleEx(cm, "normal! o/O")`.
- [ ] Change the list-item path to use direct cursor movement instead of `vim.handleEx(cm, "normal! A")`, preserving existing `CreateNewItem` behavior.
- [ ] Add active-view/editor guards.
- [ ] Make `defineAction`/`mapCommand` idempotent using `inited` or equivalent state.
- [ ] Rerun the targeted test and relevant broader checks.

## Verification
- Red test first: run the new targeted Jest regression test before implementation and confirm it fails for the existing recursive fallback.
- After fix: rerun the targeted test, plus `npm run build` or `npm run lint` as appropriate.
- Manual: in Obsidian with Vim mode and **Vim-mode o/O inserts bullets** enabled, press `o` and `O` on plain text lines and confirm plain lines open without stack overflow; press them on list items and confirm enhanced bullet insertion still works.
- Manual regression: with Vimrc Support enabled and a reproduction line such as `nunmap s` or `unmap <Space>`, confirm plain-line `o` no longer overflows the stack.
