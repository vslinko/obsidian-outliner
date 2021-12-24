# cmd-a should select list item content

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

# cmd-a should select list item content with notes

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

# cmd-a should select list whole list after second invoke

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

# Cmd-Shift-Left should select content only

- applyState:

```md
- one|
```

- keydown: `Cmd-Shift-ArrowLeft`
- assertState:

```md
- |one|
```

# Cmd-Shift-Left should select one note line only

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
