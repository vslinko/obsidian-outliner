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
