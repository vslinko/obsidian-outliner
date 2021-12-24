# should fold

- applyState:

```md
- one|
  - two
```

- execute: `obsidian-outliner:fold`
- assertState:

```md
- one| #folded
  - two
```

# should keep foldind on change

- applyState:

```md
- one #folded
  - two
- three|
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- three|
- one #folded
  - two
```
