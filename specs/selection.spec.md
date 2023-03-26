# cmd-a should select list item content

- platform: `darwin`
- applyState:

```md
- one
  - two|
```

- keydown: `Cmd-KeyA`
- assertState:

```md
- one
  - |two|
```

# ctrl-a should select list item content

- platform: `linux`
- applyState:

```md
- one
  - two|
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
  - |two|
```

# cmd-a should select list item content excluding checkbox

- platform: `darwin`
- applyState:

```md
- one
  - [ ] two|
```

- keydown: `Cmd-KeyA`
- assertState:

```md
- one
  - [ ] |two|
```

# ctrl-a should select list item content excluding checkbox

- platform: `linux`
- applyState:

```md
- one
  - [ ] two|
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
  - [ ] |two|
```

# cmd-a should select list item content excluding custom checkbox

- platform: `darwin`
- applyState:

```md
- one
    - [!] two|
```

- keydown: `Cmd-KeyA`
- assertState:

```md
- one
    - [!] |two|
```

# ctrl-a should select list item content excluding custom checkbox

- platform: `linux`
- applyState:

```md
- one
    - [!] two|
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
    - [!] |two|
```

# cmd-a should select list item content with notes

- platform: `darwin`
- applyState:

```md
- one
  - two|
    notes
```

- keydown: `Cmd-KeyA`
- assertState:

```md
- one
  - |two
    notes|
```

# ctrl-a should select list item content with notes

- platform: `linux`
- applyState:

```md
- one
  - two|
    notes
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
  - |two
    notes|
```

# cmd-a should select list whole list after second invoke

- platform: `darwin`
- applyState:

```md
a
- one
  - two|
b
```

- keydown: `Cmd-KeyA`
- keydown: `Cmd-KeyA`
- assertState:

```md
a
|- one
  - two|
b
```

# ctrl-a should select list whole list after second invoke

- platform: `linux`
- applyState:

```md
a
- one
  - two|
b
```

- keydown: `Ctrl-KeyA`
- keydown: `Ctrl-KeyA`
- assertState:

```md
a
|- one
  - two|
b
```

# Cmd-Shift-Left should select content only

- platform: `darwin`
- applyState:

```md
- one|
```

- keydown: `Cmd-Shift-ArrowLeft`
- assertState:

```md
- |one|
```

# Shift-Home should select content only

- platform: `linux`
- applyState:

```md
- one|
```

- keydown: `Shift-Home`
- assertState:

```md
- |one|
```

# Cmd-Shift-Left should select content only excluding checkbox

- platform: `darwin`
- applyState:

```md
- [ ] one|
```

- keydown: `Cmd-Shift-ArrowLeft`
- assertState:

```md
- [ ] |one|
```

# Shift-Home should select content only excluding checkbox

- platform: `linux`
- applyState:

```md
- [ ] one|
```

- keydown: `Shift-Home`
- assertState:

```md
- [ ] |one|
```

# Cmd-Shift-Left should select content not including custom checkboxes

- platform: `darwin`
- setting: `stickCursor="bullet-and-checkbox"`
- applyState:

```md
- [!] one|
```

- keydown: `Cmd-Shift-ArrowLeft`
- assertState:

```md
- [!] |one|
```

# Shift-Home should select content not including custom checkboxes

- platform: `linux`
- setting: `stickCursor="bullet-and-checkbox"`
- applyState:

```md
- [!] one|
```

- keydown: `Shift-Home`
- assertState:

```md
- [!] |one|
```

# Cmd-Shift-Left should select one note line only

- platform: `darwin`
- applyState:

```md
- one
  note|
```

- keydown: `Cmd-Shift-ArrowLeft`
- assertState:

```md
- one
  |note|
```

# Shift-Home should select one note line only

- platform: `linux`
- applyState:

```md
- one
  note|
```

- keydown: `Shift-Home`
- assertState:

```md
- one
  |note|
```
