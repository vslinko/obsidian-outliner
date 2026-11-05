# vim o keeps its empty-item behavior when Enter outdent is disabled

- setting: `betterEnterOutdent=false`
- applyState:

```md
- one
- |
```

- keydown: `Escape`
- keydown: `KeyO`
- assertState:

```md
- one
- |
```

# vim O keeps its empty-checkbox behavior when Enter outdent is disabled

- setting: `betterEnterOutdent=false`
- applyState:

```md
- [ ] one
- [ ] |
```

- keydown: `Escape`
- keydown: `Shift-KeyO`
- assertState:

```md
- [ ] one
- [ ] |
```

# vim o still creates a child independently of both Enter settings

- setting: `betterEnterOutdent=false`
- setting: `betterEnter=false`
- applyState:

```md
- parent|
  - child
```

- keydown: `Escape`
- keydown: `KeyO`
- assertState:

```md
- parent
  - |
  - child
```

# vim O still creates a sibling above independently of both Enter settings

- setting: `betterEnterOutdent=false`
- setting: `betterEnter=false`
- applyState:

```md
- parent|
  - child
```

- keydown: `Escape`
- keydown: `Shift-KeyO`
- assertState:

```md
- |
- parent
  - child
```
