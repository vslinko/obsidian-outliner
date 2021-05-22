# cursor should be moved to list content

```md
|- one
```

```md
- |one
```

# cursor should be moved to list content after arrowup

```md
- one
|
```

- keydown: `ArrowUp`

```md
- |one

```

# cursor should be moved to list content after arrowright

```md
- one|
- two
```

- keydown: `ArrowRight`

```md
- one
- |two
```

# cursor should be moved to previous line

```md
- one
- |two
```

- keydown: `ArrowLeft`

```md
- one|
- two
```

# cursor should be moved to previous line when previous item have notes

```md
- one
  note
  - |two
```

- keydown: `ArrowLeft`

```md
- one
  note|
  - two
```

# cursor should be moved to previous note line

```md
- one
  |note
```

- keydown: `ArrowLeft`

```md
- one|
  note
```

# cursor should be moved to next note line

```md
- one|
  note
```

- keydown: `ArrowRight`

```md
- one
  |note
```
