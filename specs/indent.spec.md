# obsidian-outliner:indent-list should indent line

```md
- qwe
- qwe|
```

- execute: `obsidian-outliner:indent-list`

```md
- qwe
  - qwe|
```

# obsidian-outliner:indent-list should indent children

```md
- qwe
- qwe|
  - qwe
```

- execute: `obsidian-outliner:indent-list`

```md
- qwe
  - qwe|
    - qwe
```

# obsidian-outliner:indent-list should not indent line if it's no parent

```md
- qwe
  - qwe|
```

- execute: `obsidian-outliner:indent-list`

```md
- qwe
  - qwe|
```

# obsidian-outliner:indent-list should keep cursor at the same text position

```md
- qwe
  - qwe
  - q|we
```

- execute: `obsidian-outliner:indent-list`

```md
- qwe
  - qwe
    - q|we
```

# obsidian-outliner:indent-list should keep numeration

```md
1. one
  1. two
  2. three|
  3. four
```

- execute: `obsidian-outliner:indent-list`

```md
1. one
  1. two
    1. three|
  2. four
```
