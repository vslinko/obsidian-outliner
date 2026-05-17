# Fixed Issues

- #337: ArrowUp now recovers correctly from checkbox lines when the cursor gets stuck in the hidden bullet/checkbox prefix instead of moving to the previous item.
- #506: Drag and drop now keeps working when CodeMirror cannot provide coordinates for off-screen lines and when the editor has extra left padding from document properties/frontmatter.
- #509: Move lists and sublists up/down now works with a single text selection, including multiline selections.
- #552: Move lists and sublists up/down now works again on newer Obsidian versions such as 1.8.4.
- #555: Ordered lists now defer to Obsidian when Smart lists is disabled, so pressing Enter no longer renumbers items unexpectedly.
- #556: Vim `o/O` no longer recurses on non-list lines and now inserts a plain line instead of overflowing the call stack.
- #592: Move list up/down hotkeys are registered in the editor scope so Cmd/Ctrl+Shift+ArrowUp/Down works reliably again.
