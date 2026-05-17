# Fixed Issues

- #337: ArrowUp now recovers correctly from checkbox lines when the cursor gets stuck in the hidden bullet/checkbox prefix instead of moving to the previous item.
- #506: Drag and drop now keeps working when CodeMirror cannot provide coordinates for off-screen lines and when the editor has extra left padding from document properties/frontmatter.
- #509: Move lists and sublists up/down now works with a single text selection, including multiline selections.
- #552: Move lists and sublists up/down now works again on newer Obsidian versions such as 1.8.4.
- #555: Ordered lists now defer to Obsidian when Smart lists is disabled, so pressing Enter no longer renumbers items unexpectedly.
- #556: Vim `o/O` no longer recurses on non-list lines and now inserts a plain line instead of overflowing the call stack.
- #577: Vim `O` now inserts a sibling above the current parent item instead of creating a nested child when the item already has sub-items.
- #569: BetterEnter now keeps the cursor after the space in ordered list item `10. ` and higher instead of leaving the caret inside the bullet prefix.
- #585: Tab indentation now uses the current Obsidian indent setting for legacy list items, so changing the editor indent width no longer leaves old space-indented lists stuck on the previous width.
- #590: ArrowUp recovery now also covers root-level list items when visual cursor movement lands in CSS-added top padding before the list content.
- #591: Parser-based commands now keep working when root list items share leading whitespace and when sibling items mix spaces and tabs for indentation instead of failing the entire list parse.
- #592: Move list up/down hotkeys are registered in the editor scope so Cmd/Ctrl+Shift+ArrowUp/Down works reliably again.
