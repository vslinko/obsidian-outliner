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
