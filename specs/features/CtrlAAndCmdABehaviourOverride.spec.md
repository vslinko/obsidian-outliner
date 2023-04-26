# cmd-a should select list item content

- platform: `darwin`
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

# ctrl-a should select list item content

- platform: `linux`
- applyState:

```md
- one
  - two|
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
  - |two|
```

# cmd-a should select list item content excluding checkbox

- platform: `darwin`
- applyState:

```md
- one
  - [ ] two|
```

- keydown: `Cmd-KeyA`
- assertState:

```md
- one
  - [ ] |two|
```

# ctrl-a should select list item content excluding checkbox

- platform: `linux`
- applyState:

```md
- one
  - [ ] two|
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
  - [ ] |two|
```

# cmd-a should select list item content excluding custom checkbox

- platform: `darwin`
- applyState:

```md
- one
    - [!] two|
```

- keydown: `Cmd-KeyA`
- assertState:

```md
- one
    - [!] |two|
```

# ctrl-a should select list item content excluding custom checkbox

- platform: `linux`
- applyState:

```md
- one
    - [!] two|
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
    - [!] |two|
```

# cmd-a should select list item content with notes

- platform: `darwin`
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

# ctrl-a should select list item content with notes

- platform: `linux`
- applyState:

```md
- one
  - two|
    notes
```

- keydown: `Ctrl-KeyA`
- assertState:

```md
- one
  - |two
    notes|
```

# cmd-a should select list whole list after second invoke

- platform: `darwin`
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

# ctrl-a should select list whole list after second invoke

- platform: `linux`
- applyState:

```md
a
- one
  - two|
b
```

- keydown: `Ctrl-KeyA`
- keydown: `Ctrl-KeyA`
- assertState:

```md
a
|- one
  - two|
b
```
