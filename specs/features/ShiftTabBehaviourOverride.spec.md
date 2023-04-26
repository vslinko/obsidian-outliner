# Shift-Tab should outdent line

- applyState:

```md
- qwe
  - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
- qwe|
```

# Shift-Tab should outdent children

- applyState:

```md
- qwe
  - qwe|
    - qwe
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
- qwe|
  - qwe
```

# Shift-Tab should outdent in case #144

- applyState:

```md
- qwe
  - qwe
    - qwe
  - qwe
  - qwe|
```

- keydown: `Shift-Tab`
- assertState:

```md
- qwe
  - qwe
    - qwe
  - qwe
- qwe|
```
