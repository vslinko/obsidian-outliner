# disabled outdent keeps a top-level empty bullet on repeated Enter

- setting: `betterEnterOutdent=false`
- applyState:

```md
- one
- |
```

- keydown: `Enter`
- assertState:

```md
- one
- 
- |
```

- keydown: `Enter`
- assertState:

```md
- one
- 
- 
- |
```

# disabled outdent keeps a top-level empty checkbox on repeated Enter

- setting: `betterEnterOutdent=false`
- applyState:

```md
- [ ] one
- [ ] |
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
- [ ] 
- [ ] |
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
- [ ] 
- [ ] 
- [ ] |
```

# disabled outdent keeps an empty bullet in the middle of a list

- setting: `betterEnterOutdent=false`
- applyState:

```md
- one
- |
- three
```

- keydown: `Enter`
- assertState:

```md
- one
- 
- |
- three
```

# disabled outdent keeps an empty checkbox in the middle of a list

- setting: `betterEnterOutdent=false`
- applyState:

```md
- [ ] one
- [ ] |
- [ ] three
```

- keydown: `Enter`
- assertState:

```md
- [ ] one
- [ ] 
- [ ] |
- [ ] three
```

# disabled outdent continues nested empty bullets at the same level

- setting: `betterEnterOutdent=false`
- applyState:

```md
- parent
  - |
```

- keydown: `Enter`
- keydown: `Enter`
- assertState:

```md
- parent
  - 
  - 
  - |
```

# disabled outdent continues a nested empty checkbox before a sibling

- setting: `betterEnterOutdent=false`
- applyState:

```md
- parent
  - [ ] |
  - [ ] sibling
```

- keydown: `Enter`
- assertState:

```md
- parent
  - [ ] 
  - [ ] |
  - [ ] sibling
```

# disabled outdent preserves TAB indentation and marker separators

- setting: `betterEnterOutdent=false`
- applyState:

```md
-	parent
	-	|
```

- keydown: `Enter`
- assertState:

```md
-	parent
	-	
	-	|
```

# disabled outdent keeps children and uses the existing child-level Enter behavior

- setting: `betterEnterOutdent=false`
- applyState:

```md
- |
  - child
```

- keydown: `Enter`
- assertState:

```md
- 
  - |
  - child
```

# enabling outdent again restores nested outdent and top-level list closing

- setting: `betterEnterOutdent=false`
- applyState:

```md
- parent
  - |
```

- keydown: `Enter`
- assertState:

```md
- parent
  - 
  - |
```

- setting: `betterEnterOutdent=true`
- keydown: `Enter`
- assertState:

```md
- parent
  - 
- |
```

- keydown: `Enter`
- assertState:

```md
- parent
  - 
|
```

# disabling Enhance Enter uses native list closing despite disabled outdent

- setting: `betterEnterOutdent=false`
- setting: `betterEnter=false`
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

# re-enabling Enhance Enter retains the disabled outdent choice

- setting: `betterEnterOutdent=false`
- setting: `betterEnter=false`
- setting: `betterEnter=true`
- applyState:

```md
- one
- |
```

- keydown: `Enter`
- assertState:

```md
- one
- 
- |
```
