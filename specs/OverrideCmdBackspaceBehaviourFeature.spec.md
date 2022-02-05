# cmd+backspace should remove content only

- applyState:

```md
- one
- two|
```

- keydown: `Cmd-Backspace`
- keydown: `Cmd-Backspace`
- assertState:

```md
- one
- |
```

# cmd+backspace should remove content only in notes

- applyState:

```md
- one
  two|
```

- keydown: `Cmd-Backspace`
- keydown: `Cmd-Backspace`
- assertState:

```md
- one
  |
```
