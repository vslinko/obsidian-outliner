


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

- keydown: `Up`

```md
- |one

```

# cursor should be moved to list content after arrowright

```md
- one|
- two
```

- keydown: `Right`

```md
- one
- |two
```

# cursor should be moved to previous line

```md
- one
- |two
```

- keydown: `Left`

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

- keydown: `Left`

```md
- one
  note|
  - two
```
