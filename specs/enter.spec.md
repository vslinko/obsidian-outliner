# enter should create new item on the child level if child exists and current item has notes

```md
- one
  - two|
    note
    - three
```

- keydown: `Enter`

```md
- one
  - two
  - |
    note
    - three
```

# enter should create new item on the child level if child exists and previous item has notes

```md
- one
  note
  - two|
    - three
```

- keydown: `Enter`

```md
- one
  note
  - two
    - |
    - three
```

# enter should create new item on the child level if child exists

```md
- one
  - two|
    - three
```

- keydown: `Enter`

```md
- one
  - two
    - |
    - three
```

# enter should create new item on the child level if child exists and item have notes

```md
- one
  - two
    notes|
    - three
```

- keydown: `Enter`

```md
- one
  - two
    notes
    - |
    - three
```

# enter should create new item on the same level

```md
- one
  - two|
```

- keydown: `Enter`

```md
- one
  - two
  - |
```

# enter should create new item on the same level and split the text

```md
- one
  - tw|o
```

- keydown: `Enter`

```md
- one
  - tw
  - |o
```

# enter should outdent line if line is empty

```md
- one
  - two
    - |
```

- keydown: `Enter`

```md
- one
  - two
  - |
```

# enter should outdent line if line is empty and previous line has notes

```md
- one
  - two
    note
    - |
```

- keydown: `Enter`

```md
- one
  - two
    note
  - |
```

# enter should delete list item if it's last item and it's on the top level

```md
- one
- |
```

- keydown: `Enter`

```md
- one

|
```

# enter should create checkbox if current item contains checkbox

```md
- [ ] one|
```

- keydown: `Enter`

```md
- [ ] one
- [ ] |
```

# enter should create unchecked checkbox if current item contains checked checkbox

```md
- [x] one|
```

- keydown: `Enter`

```md
- [x] one
- [ ] |
```

# enter should create checkbox if current item contains checkbox and cursor on notes

```md
- [ ] one
  qwe|
```

- keydown: `Enter`

```md
- [ ] one
  qwe
- [ ] |
```

# enter should create checkbox and split text if current item contains checkbox and cursor inside text

```md
- [ ] one
  q|we
```

- keydown: `Enter`

```md
- [ ] one
  q
- [ ] |we
```

# enter should not create checkbox if current item contains checkbox but cursor inside checkbox

```md
- [| ] one
```

- keydown: `Enter`

```md
- [
- | ] one
```

# shift-enter should create note

```md
- one|
  - two
```

- keydown: `Shift-Enter`

```md
- one
  |
  - two
```

# shift-enter should continue note

```md
- one
  note|
```

- keydown: `Shift-Enter`

```md
- one
  note
  |
```

# shift-enter should split note

```md
- one
  no|te
```

- keydown: `Shift-Enter`

```md
- one
  no
  |te
```

# enter should not create new item if cursor is inside code block

```md
- one
  ```
  code|
  ```
- two
```

- keydown: `Enter`

```md
- one
  ```
  code
  |
  ```
- two
```
