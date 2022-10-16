# enter should create new item on the child level if child exists and current item has notes

- applyState:

```md
- one
  - two|
    note
    - three
```

- keydown: `Enter`
- assertState:

```md
- one
  - two
  - |
    note
    - three
```

# enter should create new item on the child level if child exists and previous item has notes

- applyState:

```md
- one
  note
  - two|
    - three
```

- keydown: `Enter`
- assertState:

```md
- one
  note
  - two
    - |
    - three
```

# enter should create new item on the child level if child exists

- applyState:

```md
- one
  - two|
    - three
```

- keydown: `Enter`
- assertState:

```md
- one
  - two
    - |
    - three
```

# enter should create new item on the child level if child exists and item have notes

- applyState:

```md
- one
  - two
    notes|
    - three
```

- keydown: `Enter`
- assertState:

```md
- one
  - two
    notes
    - |
    - three
```

# enter should create new item on the same level

- applyState:

```md
- one
  - two|
```

- keydown: `Enter`
- assertState:

```md
- one
  - two
  - |
```

# enter should create new item on the same level and split the text

- applyState:

```md
- one
  - tw|o
```

- keydown: `Enter`
- assertState:

```md
- one
  - tw
  - |o
```

# enter should outdent line if line is empty

- applyState:

```md
- one
  - two
    - |
```

- keydown: `Enter`
- assertState:

```md
- one
  - two
  - |
```

# enter should outdent line if line is empty and list using TAB after bullet

- applyState:

```md
-	one
	-	two
		-	|
```

- keydown: `Enter`
- assertState:

```md
-	one
	-	two
	-	|
```

# enter should outdent line if line is empty and previous line has notes

- applyState:

```md
- one
  - two
    note
    - |
```

- keydown: `Enter`
- assertState:

```md
- one
  - two
    note
  - |
```

# enter should delete list item if it's last item and it's on the top level

- applyState:

```md
- one
- |
```

- keydown: `Enter`
- assertState:

```md
- one
|
```

# enter should delete list item if it's last item and it's on the top level and it's checkbox

- applyState:

```md
- [ ] one
- [ ] |
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
|
```

# enter should create checkbox if current item contains checkbox

- applyState:

```md
- [ ] one|
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
- [ ] |
```

# enter should create unchecked checkbox if current item contains checked checkbox

- applyState:

```md
- [x] one|
```

- keydown: `Enter`
- assertState:

```md
- [x] one
- [ ] |
```

# enter should create unchecked checkbox if current item contains checkbox with custom state

- applyState:

```md
- [!] one|
```

- keydown: `Enter`
- assertState:

```md
- [!] one
- [ ] |
```

# enter should create checkbox if current item contains checkbox and cursor on notes

- applyState:

```md
- [ ] one
  qwe|
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
  qwe
- [ ] |
```

# enter should create checkbox and split text if current item contains checkbox and cursor inside text

- applyState:

```md
- [ ] one
  q|we
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
  q
- [ ] |we
```

# enter should not create checkbox if current item contains checkbox but cursor inside checkbox

- applyState:

```md
- [| ] one
```

- keydown: `Enter`
- assertState:

```md
- [
- | ] one
```

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

# enter should not create new item if cursor is inside code block

- applyState:

```md
- one
  ```
  code|
  ```
- two
```

- keydown: `Enter`
- assertState:

```md
- one
  ```
  code
  |
  ```
- two
```

# enter should not create new item if cursor is before line start

- setting: `stickCursor=false`
- applyState:

```md
- one
|- two
```

- keydown: `Enter`
- assertState:

```md
- one

|- two
```

# enter should copy TAB after bullet point

- applyState:

```md
-	one
	-	two|
```

- keydown: `Enter`
- assertState:

```md
-	one
	-	two
	-	|
```

# enter should create new item on the same level and remove selection

- applyState:

```md
-	one
	-	two|three|
```

- keydown: `Enter`
- assertState:

```md
-	one
	-	two
	-	|
```

# enter should create new item on the same level and remove selection between words

- applyState:

```md
-	one
	-	two|three|four
```

- keydown: `Enter`
- assertState:

```md
-	one
	-	two
	-	|four
```
# enter should fallback behavior while multiline selection

- applyState:

```md
-	one
	-	two|three
- four|five
```

- keydown: `Enter`
- assertState:

```md
-	one
	-	two
  |five
```

# enter should fallback behavior while multiline selection with nested bullets

- applyState:

```md
-	|one
	-	two| three
- four
```

- keydown: `Enter`
- assertState:

```md
-	
 |three
- four
```
