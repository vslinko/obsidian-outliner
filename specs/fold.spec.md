# should fold

```md
- one|
  - two
```

- execute: `obsidian-outliner:fold`

```md
- one| #folded
  - two
```

# should keep foldind on change

```md
- one #folded
  - two
- three
- |
```

- keydown: `Backspace`

```md
- one #folded
  - two
- three|
```
