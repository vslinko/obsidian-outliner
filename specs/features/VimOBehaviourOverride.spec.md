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

# vim o opens a plain line below inside a list code block

- applyState:

```md
- item
  ```
  co|de
  ```
```

- keydown: `Escape`
- keydown: `KeyO`
- assertState:

```md
- item
  ```
  code
  |
  ```
```

- insertText: `new code`
- assertState:

```md
- item
  ```
  code
  new code|
  ```
```

# vim O opens a plain line above inside a list code block

- applyState:

```md
- item
  ```
  co|de
  ```
```

- keydown: `Escape`
- keydown: `Shift-KeyO`
- assertState:

```md
- item
  ```
  |
  code
  ```
```

- insertText: `new code`
- assertState:

```md
- item
  ```
  new code|
  code
  ```
```
