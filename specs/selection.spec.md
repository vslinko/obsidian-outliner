# cmd-a should select list item content

```md
- one
  - two|
```

- keydown: `Cmd-KeyA`

```md
- one
  - |two|
```

# cmd-a should select list whole list after second invoke

```md
a
- one
  - two|
b
```

- keydown: `Cmd-KeyA`
- keydown: `Cmd-KeyA`


```md
a
|- one
  - two|
b
```

# Cmd-Shift-Left should select content only

```md
- one|
```

- keydown: `Cmd-Shift-ArrowLeft`

```md
- |one|
```
