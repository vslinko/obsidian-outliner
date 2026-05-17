# Fixed Issues

- #509: Move lists and sublists up/down now works with a single text selection, including multiline selections.
- #556: Vim `o/O` no longer recurses on non-list lines and now inserts a plain line instead of overflowing the call stack.
- #592: Move list up/down hotkeys are registered in the editor scope so Cmd/Ctrl+Shift+ArrowUp/Down works reliably again.
