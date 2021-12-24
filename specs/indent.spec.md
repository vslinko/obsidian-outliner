# obsidian-outliner:indent-list should indent line

- applyState:

```md
- qwe
- qwe|
```

- execute: `obsidian-outliner:indent-list`
- assertState:

```md
- qwe
  - qwe|
```

# obsidian-outliner:indent-list should indent children

- applyState:

```md
- qwe
- qwe|
  - qwe
```

- execute: `obsidian-outliner:indent-list`
- assertState:

```md
- qwe
  - qwe|
    - qwe
```

# obsidian-outliner:indent-list should not indent line if it's no parent

- applyState:

```md
- qwe
  - qwe|
```

- execute: `obsidian-outliner:indent-list`
- assertState:

```md
- qwe
  - qwe|
```

# obsidian-outliner:indent-list should keep cursor at the same text position

- applyState:

```md
- qwe
  - qwe
  - q|we
```

- execute: `obsidian-outliner:indent-list`
- assertState:

```md
- qwe
  - qwe
    - q|we
```

# obsidian-outliner:indent-list should keep numeration

- applyState:

```md
1. one
  1. two
  2. three|
  3. four
```

- execute: `obsidian-outliner:indent-list`
- assertState:

```md
1. one
  1. two
    1. three|
  2. four
```
