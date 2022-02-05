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

# Shift-Up should select whole list item

- applyState:

```md
- one
  - two
    note
    - three
  - fou|r
```

- keydown: `Shift-ArrowUp`
- assertState:

```md
- one
  - two
    note
|    - three
  - four|
```

- keydown: `Shift-ArrowUp`
- assertState:

```md
- one
|  - two
    note
    - three
  - four|
```

- keydown: `Shift-ArrowUp`
- assertState:

```md
|- one
  - two
    note
    - three
  - four|
```

# Shift-Up should select whole list item with children

- applyState:

```md
- one
  - two
  - three
    - four
    - fiv|e
    - six
```

- keydown: `Shift-ArrowUp`
- assertState:

```md
- one
  - two
  - three
|    - four
    - five|
    - six
```

- keydown: `Shift-ArrowUp`
- assertState:

```md
- one
  - two
|  - three
    - four
    - five
    - six|
```
