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

# shift-enter should create note

- applyState:

```md
- one|
  - two
```

- keydown: `Shift-Enter`
- assertState:

```md
- one
  |
  - two
```

# shift-enter should continue note

- applyState:

```md
- one
  note|
```

- keydown: `Shift-Enter`
- assertState:

```md
- one
  note
  |
```

# shift-enter should split note

- applyState:

```md
- one
  no|te
```

- keydown: `Shift-Enter`
- assertState:

```md
- one
  no
  |te
```
