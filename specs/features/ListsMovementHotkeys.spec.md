# move-list-item-up hotkey should move line up

- platform: `darwin`
- applyState:

```md
- one
- two|
```

- keydown: `Cmd-Shift-ArrowUp`
- assertState:

```md
- two|
- one
```

# move-list-item-up hotkey should move line up

- platform: `linux`
- applyState:

```md
- one
- two|
```

- keydown: `Ctrl-Shift-ArrowUp`
- assertState:

```md
- two|
- one
```

# move-list-item-down hotkey should move line down

- platform: `darwin`
- applyState:

```md
- one|
- two
```

- keydown: `Cmd-Shift-ArrowDown`
- assertState:

```md
- two
- one|
```

# move-list-item-down hotkey should move line down

- platform: `linux`
- applyState:

```md
- one|
- two
```

- keydown: `Ctrl-Shift-ArrowDown`
- assertState:

```md
- two
- one|
```
