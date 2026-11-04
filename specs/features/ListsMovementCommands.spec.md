# obsidian-outliner:move-list-item-down should move line down

- applyState:

```md
- one|
- two
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- two
- one|
```

# obsidian-outliner:move-list-item-down should move children down

- applyState:

```md
- one|
  - one one
- two
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- two
- one|
  - one one
```

# obsidian-outliner:move-list-item-up should move line up

- applyState:

```md
- one
- two|
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- two|
- one
```

# obsidian-outliner:move-list-item-up should move children up

- applyState:

```md
- two
- one|
  - one one
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- one|
  - one one
- two
```

# Move down from 2 to 4 spaces keeps receiving siblings independent after reparsing (#619)

- applyState:

```md
- source
  - mo|ved
    note
    - child
      child note
- destination
    - existing
      - existing child
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- source
- destination
    - mo|ved
      note
      - child
        child note
    - existing
      - existing child
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- source
- destination
    - existing
      - existing child
    - mo|ved
      note
      - child
        child note
```

# Move down from 4 to 2 spaces preserves a note cursor and independent subtrees (#619)

- applyState:

```md
- source
    - moved
      no|te
      - child
        child note
- destination
  - existing
    - existing child
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- source
- destination
  - moved
    no|te
    - child
      child note
  - existing
    - existing child
```

- execute: `obsidian-outliner:move-list-item-down`
- assertState:

```md
- source
- destination
  - existing
    - existing child
  - moved
    no|te
    - child
      child note
```

# Move up from 2 to 4 spaces preserves a note cursor and independent subtrees (#619)

- applyState:

```md
- destination
    - existing
      - existing child
- source
  - moved
    no|te
    - child
      child note
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- destination
    - existing
      - existing child
    - moved
      no|te
      - child
        child note
- source
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- destination
    - moved
      no|te
      - child
        child note
    - existing
      - existing child
- source
```

# Move up from 4 to 2 spaces keeps receiving siblings independent after reparsing (#619)

- applyState:

```md
- destination
  - existing
    - existing child
- source
    - mo|ved
      note
      - child
        child note
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- destination
  - existing
    - existing child
  - mo|ved
    note
    - child
      child note
- source
```

- execute: `obsidian-outliner:move-list-item-up`
- assertState:

```md
- destination
  - mo|ved
    note
    - child
      child note
  - existing
    - existing child
- source
```

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
