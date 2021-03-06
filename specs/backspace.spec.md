# backspace should work as regular if it's last empty line

```md
- |
```

- keydown: `Backspace`

```md
-|
```

# backspace should work as regular if it's first line without children

```md
- |one
- two
```

- keydown: `Backspace`

```md
-|one
- two
```

# backspace should do nothing if it's first line with children

```md
- |one
  - two
```

- keydown: `Backspace`

```md
- |one
  - two
```

# backspace should remove symbol if it isn't empty line

```md
- qwe|
```

- keydown: `Backspace`

```md
- qw|
```

# backspace should remove list item if it's empty

```md
- one
- |
```

- keydown: `Backspace`

```md
- one|
```

# backspace should remove note line if it's empty

```md
- one
  |
```

- keydown: `Backspace`

```md
- one|
```

# backspace should remove note line if it isn't empty and cursor on the line start

```md
- one
  |two
```

- keydown: `Backspace`

```md
- one|two
```

# cmd+backspace should remove content only

```md
- one
- two|
```

- keydown: `Cmd-Backspace`
- keydown: `Cmd-Backspace`

```md
- one
- |
```

# cmd+backspace should remove content only in notes

```md
- one
  two|
```

- keydown: `Cmd-Backspace`
- keydown: `Cmd-Backspace`

```md
- one
  |
```

# delete should remove next item if cursor is on the end

```md
- qwe|
  - ee
```

- keydown: `Delete`

```md
- qwe|ee
```

# delete should remove next item if cursor is on the end and have notes

```md
- qwe
  notes|
  - ee
```

- keydown: `Delete`

```md
- qwe
  notes|ee
```

# delete should remove next line if cursor is on the end and have notes

```md
- qwe|
  notes
  - ee
```

- keydown: `Delete`

```md
- qwe|notes
  - ee
```
