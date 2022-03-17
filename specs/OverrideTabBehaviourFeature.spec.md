# tab should indent list

- applyState:

```md
- qwe
- qwe|
  - qwe
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe|
    - qwe
```

# tab should indent all selected lists that could be indented

- applyState:

```md
- qwe
  - qwe
|    - qwe
  - qwe
- qwe|
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe
|    - qwe
  - qwe
  - qwe|
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe
|    - qwe
    - qwe
    - qwe|
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe
|    - qwe
    - qwe
    - qwe|
```
