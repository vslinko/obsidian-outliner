# obsidian-outliner:select-list-content should select list item content

- applyState:

```md
- one
  - two|
```

- execute: `obsidian-outliner:select-list-content`
- assertState:

```md
- one
  - |two|
```

# obsidian-outliner:select-list-content should select the whole list on second invoke

- applyState:

```md
a
- one
  - two|
b
```

- execute: `obsidian-outliner:select-list-content`
- execute: `obsidian-outliner:select-list-content`
- assertState:

```md
a
|- one
  - two|
b
```

# obsidian-outliner:insert-note-line should create a note line

- applyState:

```md
- one|
  - two
```

- execute: `obsidian-outliner:insert-note-line`
- assertState:

```md
- one
  |
  - two
```

# obsidian-outliner:insert-note-line should split an existing note line

- applyState:

```md
- one
  no|te
```

- execute: `obsidian-outliner:insert-note-line`
- assertState:

```md
- one
  no
  |te
```
