# obsidian-outliner:outdent-list should outdent line

```md
- qwe
  - qwe|
```

- execute: `obsidian-outliner:outdent-list`

```md
- qwe
- qwe|
```

# obsidian-outliner:outdent-list should outdent children

```md
- qwe
  - qwe|
    - qwe
```

- execute: `obsidian-outliner:outdent-list`

```md
- qwe
- qwe|
  - qwe
```

# obsidian-outliner:outdent-list should outdent in case #144

```md
- qwe
  - qwe
    - qwe
  - qwe
  - qwe|
```

- execute: `obsidian-outliner:outdent-list`

```md
- qwe
  - qwe
    - qwe
  - qwe
- qwe|
```
