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

# shift-tab should outdent all selected lists that could be outdented

- applyState:

```md
- one
  - two
|    - three
    - four
      - five|
    - six
```

- keydown: `Shift-Tab`
- assertState:

```md
- one
  - two
    - six
|  - three
  - four
    - five|
```

- keydown: `Shift-Tab`
- assertState:

```md
- one
  - two
    - six
|- three
- four
  - five|
```

- keydown: `Shift-Tab`
- assertState:

```md
- one
  - two
    - six
|- three
- four
  - five|
```
