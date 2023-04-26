# cursor should be moved to list content

- applyState:

```md
|- one
```

- assertState:

```md
- |one
```

# cursor should be moved to list content with an unchecked checkbox

- applyState:

```md
|- [ ] one
```

- assertState:

```md
- [ ] |one
```

# cursor should be moved to list content with a checked checkbox

- applyState:

```md
|- [x] one
```

- assertState:

```md
- [x] |one
```

# cursor should be moved to list content with a custom checkbox

- applyState:

```md
|- [!] one
```

- assertState:

```md
- [!] |one
```

# cursor should not be moved to list content with a custom checkbox if stickCursor="bullet-only"

- applyState:

```md
|
```

- setting: `stickCursor="bullet-only"`
- applyState:

```md
|- [!] one
```

- assertState:

```md
- |[!] one
```

# cursor should not be moved to list content if stickCursor="never"

- applyState:

```md
|
```

- setting: `stickCursor="never"`
- applyState:

```md
|- one
```

- assertState:

```md
|- one
```

# cursor should be moved to list content after arrowup

- applyState:

```md
- one
|
```

- keydown: `ArrowUp`
- assertState:

```md
- |one

```

# cursor should be moved to list content after arrowright

- applyState:

```md
- one|
- two
```

- keydown: `ArrowRight`
- assertState:

```md
- one
- |two
```

# cursor should be moved to next note line

- applyState:

```md
- one|
  note
```

- keydown: `ArrowRight`
- assertState:

```md
- one
  |note
```

# cursor should not be moved when printing wikilink

- applyState:

```md
- |
```

- insertText: `[`
- insertText: `[`
- assertState:

```md
- [[|]]
```
