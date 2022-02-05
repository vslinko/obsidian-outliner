# shift-tab should outdent list

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
