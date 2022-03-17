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
