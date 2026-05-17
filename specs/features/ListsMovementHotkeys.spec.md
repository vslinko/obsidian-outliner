# move-list-item-up hotkey should move line up

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

# move-list-item-down hotkey should move line down

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
