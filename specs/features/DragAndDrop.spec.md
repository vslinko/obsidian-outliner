# Drag-and-Drop: list should move after dragging it with the mouse

- setting: `dndExperiment=true`
- applyState:

```md
- one
  - two
- |three
```

- drag: `{"from": {"line": 2, "ch": 0}}`
- move: `{"to": {"line": 0, "ch": 0}, "offsetX": 10, "offsetY": -10}`
- drop
- assertState:

```md
- |three
- one
  - two
```

# Drag-and-Drop: list should move with sublists after dragging it with the mouse

- setting: `dndExperiment=true`
- applyState:

```md
- one
  - two
- |three
  - four
```

- drag: `{"from": {"line": 2, "ch": 0}}`
- move: `{"to": {"line": 0, "ch": 0}, "offsetX": 10, "offsetY": -10}`
- drop
- assertState:

```md
- |three
  - four
- one
  - two
```

# Drag-and-Drop: cursor should keep position after moving the list

- setting: `dndExperiment=true`
- applyState:

```md
- one
  - two|
- three
```

- drag: `{"from": {"line": 2, "ch": 0}}`
- move: `{"to": {"line": 0, "ch": 0}, "offsetX": 10, "offsetY": -10}`
- drop
- assertState:

```md
- three
- one
  - two|
```

# Drag-and-Drop: list should move to the first position if the mouse is moved above all items

- setting: `dndExperiment=true`
- applyState:

```md



- one
- two|
- three
```

- drag: `{"from": {"line": 5, "ch": 0}}`
- move: `{"to": {"line": 0, "ch": 0}}`
- drop
- assertState:

```md



- three
- one
- two|
```

# Drag-and-Drop: list should move to the last position if the mouse is moved below all items

- setting: `dndExperiment=true`
- applyState:

```md
- one
- two|
- three



```

- drag: `{"from": {"line": 0, "ch": 0}}`
- move: `{"to": {"line": 5, "ch": 0}}`
- drop
- assertState:

```md
- two|
- three
- one



```

# Drag-and-Drop: list should move inside another list if the mouse is moved slightly to the right

- setting: `dndExperiment=true`
- applyState:

```md
- one
- two|
- three
```

- drag: `{"from": {"line": 0, "ch": 0}}`
- move: `{"to": {"line": 2, "ch": 0}, "offsetX": 50, "offsetY": -10}`
- drop
- assertState:

```md
- two|
  - one
- three
```
