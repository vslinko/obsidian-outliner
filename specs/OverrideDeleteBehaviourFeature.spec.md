# delete should remove next item if cursor is on the end

- applyState:

```md
- qwe|
  - ee
```

- keydown: `Delete`
- assertState:

```md
- qwe|ee
```

# delete should remove next item if cursor is on the end and have notes

- applyState:

```md
- qwe
  notes|
  - ee
```

- keydown: `Delete`
- assertState:

```md
- qwe
  notes|ee
```

# delete should remove next line if cursor is on the end and have notes

- applyState:

```md
- qwe|
  notes
  - ee
```

- keydown: `Delete`
- assertState:

```md
- qwe|notes
  - ee
```

# delete should remove next line if cursor is on the end, issue #175

- applyState:

```md
- 1
- 2|

3
```

- keydown: `Delete`
- keydown: `Delete`
- assertState:

```md
- 1
- 2|3
```
