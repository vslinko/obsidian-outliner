# cmd+backspace should remove content only

- platform: `darwin`
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

- platform: `darwin`
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
