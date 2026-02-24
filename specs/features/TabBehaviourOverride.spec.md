# Tab should indent line

- applyState:

```md
- qwe
- qwe|
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe|
```

# Tab should indent children

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

# Tab should not indent line if it's no parent

- applyState:

```md
- qwe
  - qwe|
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe|
```

# Tab should keep cursor at the same text position

- applyState:

```md
- qwe
  - qwe
  - q|we
```

- keydown: `Tab`
- assertState:

```md
- qwe
  - qwe
    - q|we
```

# Tab should keep numeration

- applyState:

```md
1. one
    1. two
    2. three|
    3. four
```

- keydown: `Tab`
- assertState:

```md
1. one
    1. two
        1. three|
    2. four
```
