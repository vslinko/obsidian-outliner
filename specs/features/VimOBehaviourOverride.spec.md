# vim O should create sibling above unfolded children

- applyState:

```md
- 1
- 2|
  - a
- 3
```

- keydown: `Escape`
- keydown: `Shift-KeyO`
- assertState:

```md
- 1
- |
- 2
  - a
- 3
```
