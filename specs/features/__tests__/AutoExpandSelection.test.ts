describe("Automatic selection expansion (#581)", () => {
  const selectAllKey = process.platform === "darwin" ? "Cmd-KeyA" : "Ctrl-KeyA";
  const undoKey = process.platform === "darwin" ? "Cmd-KeyZ" : "Ctrl-KeyZ";
  const applySelectionState = applyState as unknown as (
    state: State,
  ) => Promise<void>;
  const lines = [
    "before",
    "- [ ] parent",
    "  parent note",
    "  - first",
    "    first note",
    "    - twig",
    "  - second",
    "    - second child",
    "- tail",
    "  tail note",
    "  - tail child",
    "after",
  ];

  beforeEach(async () => {
    await resetSettings();
  });

  afterEach(async () => {
    // Drain selection callbacks before restoring preferences for other suites.
    await waitForSelectionPipeline();
    await resetSettings();
  });

  function waitForSelectionPipeline() {
    return new Promise((resolve) => setTimeout(resolve, 60));
  }

  async function markedState(marked: string[], reversed = false) {
    const state = await parseState(marked);
    if (reversed) {
      const { anchor, head } = state.selections[0];
      state.selections = [{ anchor: head, head: anchor }];
    }
    return state;
  }

  async function expectSettledState(expected: State) {
    // The selection extender schedules a setTimeout and can schedule another
    // transaction. An immediate bridge reply may expose an intermediate state.
    await waitForSelectionPipeline();
    expect(await getCurrentState()).toEqual(expected);
    await waitForSelectionPipeline();
    expect(await getCurrentState()).toEqual(expected);
  }

  async function expectMarked(marked: string[], reversed = false) {
    await expectSettledState(await markedState(marked, reversed));
  }

  test("is opt-in and can be enabled and disabled with cursor sticking off", async () => {
    // Expansion must not depend on the separate cursor-sticking preference.
    await setSetting({ k: "stickCursor", v: "never" });
    const initial = await markedState([
      ...lines.slice(0, 3),
      "  - fi|rst",
      ...lines.slice(4, 6),
      "  - sec|ond",
      ...lines.slice(7),
    ]);
    // Do not set expandSelection here: existing/default settings must be off.
    await applySelectionState(initial);
    await expectSettledState(initial);

    await setSetting({ k: "expandSelection", v: true });
    await applySelectionState(initial);
    await expectMarked([
      ...lines.slice(0, 3),
      "  - |first",
      ...lines.slice(4, 7),
      "    - second child|",
      ...lines.slice(8),
    ]);

    await setSetting({ k: "expandSelection", v: false });
    await applySelectionState(initial);
    await expectSettledState(initial);
  });

  test.each([false, true])(
    "expands sibling items with their notes and descendants, reversed=%s",
    async (reversed) => {
      await setSetting({ k: "expandSelection", v: true });
      await applySelectionState(
        await markedState(
          [
            ...lines.slice(0, 3),
            "  - fi|rst",
            ...lines.slice(4, 6),
            "  - sec|ond",
            ...lines.slice(7),
          ],
          reversed,
        ),
      );
      await expectMarked(
        [
          ...lines.slice(0, 3),
          "  - |first",
          ...lines.slice(4, 7),
          "    - second child|",
          ...lines.slice(8),
        ],
        reversed,
      );
    },
  );

  test("touching a parent's note and first child includes the parent's entire subtree", async () => {
    await setSetting({ k: "expandSelection", v: true });
    await applyState([
      ...lines.slice(0, 2),
      "  parent |note",
      "  - fi|rst",
      ...lines.slice(4),
    ]);
    await expectMarked([
      lines[0],
      "- [ ] |parent",
      ...lines.slice(2, 7),
      "    - second child|",
      ...lines.slice(8),
    ]);
  });

  test("a whole-root selection preserves an already selected checkbox and bullet", async () => {
    await setSetting({ k: "expandSelection", v: true });
    await applyState([
      lines[0],
      "|- [ ] parent",
      ...lines.slice(2, 8),
      "- ta|il",
      ...lines.slice(9),
    ]);
    await expectMarked([
      lines[0],
      "|- [ ] parent",
      ...lines.slice(2, 10),
      "  - tail child|",
      lines[11],
    ]);
  });

  test("multiline content of one item does not select that item or its children", async () => {
    await setSetting({ k: "expandSelection", v: true });
    const initial = await markedState([
      lines[0],
      "- [ ] par|ent",
      "  parent no|te",
      ...lines.slice(3),
    ]);
    await applySelectionState(initial);
    await expectSettledState(initial);
  });

  test.each([false, true])(
    "an exclusive column-zero endpoint does not touch the next item, reversed=%s",
    async (reversed) => {
      await setSetting({ k: "expandSelection", v: true });
      await applySelectionState(
        await markedState(
          [
            ...lines.slice(0, 3),
            "  - fi|rst",
            ...lines.slice(4, 6),
            "|  - second",
            ...lines.slice(7),
          ],
          reversed,
        ),
      );
      // The first item's child is touched, but the second item is not. Keep
      // the original newline endpoint, rather than shrinking to the twig.
      await expectMarked(
        [
          ...lines.slice(0, 3),
          "  - |first",
          ...lines.slice(4, 6),
          "|  - second",
          ...lines.slice(7),
        ],
        reversed,
      );

      const sameItem = await markedState(
        [
          ...lines.slice(0, 3),
          "  - fi|rst",
          lines[4],
          "|    - twig",
          ...lines.slice(6),
        ],
        reversed,
      );
      await applySelectionState(sameItem);
      await expectSettledState(sameItem);
    },
  );

  test("leaves multiple selections and selections crossing the root untouched", async () => {
    await setSetting({ k: "expandSelection", v: true });
    const multiple = await markedState([
      ...lines.slice(0, 3),
      "  - f|ir|st",
      ...lines.slice(4),
    ]);
    multiple.selections.push({
      anchor: { line: 6, ch: 5 },
      head: { line: 6, ch: 7 },
    });
    await applySelectionState(multiple);
    await expectSettledState(multiple);

    const crossing = await markedState([
      "be|fore",
      ...lines.slice(1, 6),
      "  - sec|ond",
      ...lines.slice(7),
    ]);
    await applySelectionState(crossing);
    await expectSettledState(crossing);
  });

  test("Shift+ArrowDown expands visibly, deletion removes that range and undo restores it", async () => {
    await setSetting({ k: "expandSelection", v: true });
    await applyState([
      "before",
      "- on|e",
      "- two",
      "  - child",
      "- tail",
      "after",
    ]);
    await simulateKeydown("Shift-ArrowDown");
    const expanded = await markedState([
      "before",
      "- |one",
      "- two",
      "  - child|",
      "- tail",
      "after",
    ]);
    await expectSettledState(expanded);

    await simulateKeydown("Backspace");
    await expectMarked(["before", "- |", "- tail", "after"]);
    await simulateKeydown(undoKey);
    await expectSettledState(expanded);
  });

  test.each([true, false])(
    "does not skip progressive select-all stages or native document handoff, enabled=%s",
    async (enabled) => {
      await setSetting({ k: "expandSelection", v: enabled });
      await applyState([
        "before",
        "- parent",
        "  - [ ] leaf|",
        "    leaf note",
        "    - twig",
        "  - sibling",
        "- tail",
        "after",
      ]);
      const value = (await getCurrentState()).value;
      const stages: [StatePosition, StatePosition][] = [
        [
          { line: 2, ch: 8 },
          { line: 3, ch: 13 },
        ],
        [
          { line: 2, ch: 8 },
          { line: 4, ch: 10 },
        ],
        [
          { line: 1, ch: 2 },
          { line: 5, ch: 11 },
        ],
        [
          { line: 1, ch: 0 },
          { line: 6, ch: 6 },
        ],
        [
          { line: 0, ch: 0 },
          { line: 7, ch: 5 },
        ],
      ];
      for (const [anchor, head] of stages) {
        await simulateKeydown(selectAllKey);
        await expectSettledState({
          value,
          folds: [],
          selections: [{ anchor, head }],
        });
      }
    },
  );
});
