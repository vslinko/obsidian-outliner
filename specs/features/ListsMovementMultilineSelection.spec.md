# move-list-item-up should move a multiline selection with the block

- applyState:

```md
- item 1
- |item 2
- ite|m 3
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- |item 1
- ite|m 3
- item 2
```
