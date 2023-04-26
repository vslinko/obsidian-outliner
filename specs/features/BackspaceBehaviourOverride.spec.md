# backspace should work as regular if it's last empty line

- applyState:

```md
- |
```

- keydown: `Backspace`
- assertState:

```md
-|
```

# backspace should work as regular if it's first line without children

- applyState:

```md
- |one
- two
```

- keydown: `Backspace`
- assertState:

```md
-|one
- two
```

# backspace should do nothing if it's first line with children

- applyState:

```md
- |one
  - two
```

- keydown: `Backspace`
- assertState:

```md
- |one
  - two
```

# backspace should remove symbol if it isn't empty line

- applyState:

```md
- qwe|
```

- keydown: `Backspace`
- assertState:

```md
- qw|
```

# backspace should remove list item if it's empty

- applyState:

```md
- one
- |
```

- keydown: `Backspace`
- assertState:

```md
- one|
```

# backspace should remove note line if it's empty

- applyState:

```md
- one
  |
```

- keydown: `Backspace`
- assertState:

```md
- one|
```

# backspace should remove note line if it isn't empty and cursor on the line start

- applyState:

```md
- one
  |two
```

- keydown: `Backspace`
- assertState:

```md
- one|two
```
