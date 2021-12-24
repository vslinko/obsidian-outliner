# cursor should be moved to list content

- applyState:

```md
|- one
```

- assertState:

```md
- |one
```

# cursor should not be moved to list content if stickCursor=false

- setting: `stickCursor=false`
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

# cursor should be moved to previous line

- applyState:

```md
- one
- |two
```

- keydown: `ArrowLeft`
- assertState:

```md
- one|
- two
```

# cursor should be moved to previous line when previous item have notes

- applyState:

```md
- one
  note
  - |two
```

- keydown: `ArrowLeft`
- assertState:

```md
- one
  note|
  - two
```

# cursor should be moved to previous note line

- applyState:

```md
- one
  |note
```

- keydown: `ArrowLeft`
- assertState:

```md
- one|
  note
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
