# obsidian-outliner:move-list-item-down should move line down

```md
- one|
- two
```

- execute: `obsidian-outliner:move-list-item-down`

```md
- two
- one|
```

# obsidian-outliner:move-list-item-down should move children down

```md
- one|
  - one one
- two
```

- execute: `obsidian-outliner:move-list-item-down`

```md
- two
- one|
  - one one
```

# obsidian-outliner:move-list-item-up should move line up

```md
- one
- two|
```

- execute: `obsidian-outliner:move-list-item-up`

```md
- two|
- one
```

# obsidian-outliner:move-list-item-up should move children up

```md
- two
- one|
  - one one
```

- execute: `obsidian-outliner:move-list-item-up`

```md
- one|
  - one one
- two
```
