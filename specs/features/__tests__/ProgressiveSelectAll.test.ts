describe("Progressive select all (#578)", () => {
  const selectAllKey = process.platform === "darwin" ? "Cmd-KeyA" : "Ctrl-KeyA";

  // The test plugin accepts State objects as well as marker strings; the
  // ambient declaration exposes only strings. Objects preserve direction and
  // multiple selections, which the | marker format cannot express.
  const applySelectionState = applyState as unknown as (
    state: State,
  ) => Promise<void>;

  beforeEach(async () => {
    await resetSettings();
  });

  afterEach(async () => {
    await resetSettings();
  });

  function compare(a: StatePosition, b: StatePosition) {
    return a.line - b.line || a.ch - b.ch;
  }

  async function selectAndExpect(state: string[]) {
    const previous = await getCurrentState();
    await simulateKeydown(selectAllKey);
    const current = await getCurrentState();
    await expect(current).toEqualEditorState(state);
    expect(current.value).toBe(previous.value);
    // Unlike the marker matcher, this also verifies forward normalization.
    expect(current.selections).toEqual((await parseState(state)).selections);

    const { anchor, head } = current.selections[0];
    for (const selection of previous.selections) {
      const ordered = compare(selection.anchor, selection.head) <= 0;
      const from = ordered ? selection.anchor : selection.head;
      const to = ordered ? selection.head : selection.anchor;
      expect(compare(anchor, from)).toBeLessThanOrEqual(0);
      expect(compare(head, to)).toBeGreaterThanOrEqual(0);
      if (previous.selections.length === 1) {
        expect(compare(anchor, from) < 0 || compare(head, to) > 0).toBe(true);
      }
    }
  }

  test("visits the item, its subtree and every parent before the root and document", async () => {
    const lines = [
      "before",
      "- outer",
      "  - middle",
      "    - parent",
      "      - [ ] leaf",
      "        leaf note",
      "        - twig",
      "    - aunt",
      "  - uncle",
      "- tail",
      "after",
    ];
    await applyState([
      ...lines.slice(0, 4),
      "      - [ ] leaf|",
      ...lines.slice(5),
    ]);
    await selectAndExpect([
      ...lines.slice(0, 4),
      "      - [ ] |leaf",
      "        leaf note|",
      ...lines.slice(6),
    ]);
    await selectAndExpect([
      ...lines.slice(0, 4),
      "      - [ ] |leaf",
      lines[5],
      "        - twig|",
      ...lines.slice(7),
    ]);
    await selectAndExpect([
      ...lines.slice(0, 3),
      "    - |parent",
      ...lines.slice(4, 6),
      "        - twig|",
      ...lines.slice(7),
    ]);
    await selectAndExpect([
      ...lines.slice(0, 2),
      "  - |middle",
      ...lines.slice(3, 7),
      "    - aunt|",
      ...lines.slice(8),
    ]);
    await selectAndExpect([
      lines[0],
      "- |outer",
      ...lines.slice(2, 8),
      "  - uncle|",
      ...lines.slice(9),
    ]);
    await selectAndExpect([
      lines[0],
      "|- outer",
      ...lines.slice(2, 9),
      "- tail|",
      lines[10],
    ]);
    await selectAndExpect(["|before", ...lines.slice(1, 10), "after|"]);
  });

  test("top-level siblings select the synthetic root, including its first bullet", async () => {
    await applyState(["before", "- |one", "- tw|o", "- three", "after"]);
    await selectAndExpect(["before", "|- one", "- two", "- three|", "after"]);
    await selectAndExpect(["|before", "- one", "- two", "- three", "after|"]);
  });

  test.each(["forward", "reversed"])(
    "%s nested sibling selection expands to their common ancestor",
    async (direction) => {
      const initial = await parseState([
        "before",
        "- parent",
        "  - o|ne",
        "  - tw|o",
        "  - three",
        "- tail",
        "after",
      ]);
      if (direction === "reversed") {
        const { anchor, head } = initial.selections[0];
        initial.selections = [{ anchor: head, head: anchor }];
      }
      await applySelectionState(initial);
      expect((await getCurrentState()).selections).toEqual(initial.selections);
      await selectAndExpect([
        "before",
        "- |parent",
        "  - one",
        "  - two",
        "  - three|",
        "- tail",
        "after",
      ]);
      await selectAndExpect([
        "before",
        "|- parent",
        "  - one",
        "  - two",
        "  - three",
        "- tail|",
        "after",
      ]);
      await selectAndExpect([
        "|before",
        "- parent",
        "  - one",
        "  - two",
        "  - three",
        "- tail",
        "after|",
      ]);
    },
  );

  test.each([
    ["bullet", "  |- [ ] child|"],
    ["checkbox", "  - |[ ] child|"],
    ["indentation", "|  - [ ] child|"],
  ])(
    "keeps the selected %s when growing past a child subtree",
    async (_, child) => {
      await applyState([
        "before",
        "- parent",
        child,
        "    - grandchild",
        "- tail",
        "after",
      ]);
      await selectAndExpect([
        "before",
        "- |parent",
        "  - [ ] child",
        "    - grandchild|",
        "- tail",
        "after",
      ]);
      await selectAndExpect([
        "before",
        "|- parent",
        "  - [ ] child",
        "    - grandchild",
        "- tail|",
        "after",
      ]);
      await selectAndExpect([
        "|before",
        "- parent",
        "  - [ ] child",
        "    - grandchild",
        "- tail",
        "after|",
      ]);
    },
  );

  test("a cursor on a note selects all item content before descendants", async () => {
    await applyState([
      "before",
      "- [ ] title",
      "  first note",
      "  second| note",
      "  - child",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "- [ ] |title",
      "  first note",
      "  second note|",
      "  - child",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "- [ ] |title",
      "  first note",
      "  second note",
      "  - child|",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "|- [ ] title",
      "  first note",
      "  second note",
      "  - child|",
      "after",
    ]);
    await selectAndExpect([
      "|before",
      "- [ ] title",
      "  first note",
      "  second note",
      "  - child",
      "after|",
    ]);
  });

  test("an empty nested checkbox skips empty and duplicate stages", async () => {
    await applyState(["before", "- parent", "  - [ ] |", "- tail", "after"]);
    await selectAndExpect([
      "before",
      "- |parent",
      "  - [ ] |",
      "- tail",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "|- parent",
      "  - [ ] ",
      "- tail|",
      "after",
    ]);
    await selectAndExpect([
      "|before",
      "- parent",
      "  - [ ] ",
      "- tail",
      "after|",
    ]);
  });

  test.each([
    ["|before", "- o|ne", "- two", "after"],
    ["before", "- o|ne", "- two", "after|"],
  ])(
    "a selection crossing the parsed root uses native select all (%j)",
    async (...state) => {
      await applyState(state);
      await selectAndExpect(["|before", "- one", "- two", "after|"]);
    },
  );

  test("multiple cursors use native document selection", async () => {
    const initial = await parseState(["before", "- one|", "- two", "after"]);
    initial.selections.push({
      anchor: { line: 2, ch: 5 },
      head: { line: 2, ch: 5 },
    });
    await applySelectionState(initial);
    expect((await getCurrentState()).selections).toEqual(initial.selections);
    await selectAndExpect(["|before", "- one", "- two", "after|"]);
  });
});
