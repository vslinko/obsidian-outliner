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
