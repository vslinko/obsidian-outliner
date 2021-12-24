# obsidian-outliner:move-list-item-down should move line down

- applyState:

```md
- one|
- two
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- two
- one|
```

# obsidian-outliner:move-list-item-down should move children down

- applyState:

```md
- one|
  - one one
- two
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- two
- one|
  - one one
```

# obsidian-outliner:move-list-item-up should move line up

- applyState:

```md
- one
- two|
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- two|
- one
```

# obsidian-outliner:move-list-item-up should move children up

- applyState:

```md
- two
- one|
  - one one
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- one|
  - one one
- two
```
