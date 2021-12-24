# obsidian-outliner:outdent-list should outdent line

- applyState:

```md
- qwe
  - qwe|
```

- execute: `obsidian-outliner:outdent-list`
- assertState:

```md
- qwe
- qwe|
```

# obsidian-outliner:outdent-list should outdent children

- applyState:

```md
- qwe
  - qwe|
    - qwe
```

- execute: `obsidian-outliner:outdent-list`
- assertState:

```md
- qwe
- qwe|
  - qwe
```

# obsidian-outliner:outdent-list should outdent in case #144

- applyState:

```md
- qwe
  - qwe
    - qwe
  - qwe
  - qwe|
```

- execute: `obsidian-outliner:outdent-list`
- assertState:

```md
- qwe
  - qwe
    - qwe
  - qwe
- qwe|
```
