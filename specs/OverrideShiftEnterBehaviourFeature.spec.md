# shift-enter should create note

- applyState:

```md
- one|
  - two
```

- keydown: `Shift-Enter`
- assertState:

```md
- one
  |
  - two
```

# shift-enter should continue note

- applyState:

```md
- one
  note|
```

- keydown: `Shift-Enter`
- assertState:

```md
- one
  note
  |
```

# shift-enter should split note

- applyState:

```md
- one
  no|te
```

- keydown: `Shift-Enter`
- assertState:

```md
- one
  no
  |te
```

# shift-enter should do nothing if multiple lines are selected

- applyState:

```md
|-	one
	-	two|
```

- keydown: `Shift-Enter`
- assertState:

```md
|-	one
	-	two|
```
