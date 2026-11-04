describe("Select all around whitespace-only lines (#618)", () => {
  const selectAllKey = process.platform === "darwin" ? "Cmd-KeyA" : "Ctrl-KeyA";
  const lines = ["- parent", "  - child", "  ", "- last", "- tail"];

  beforeEach(async () => {
    await resetSettings();
  });

  afterEach(async () => {
    await resetSettings();
  });

  async function selectAndExpect(state: string[]) {
    await simulateKeydown(selectAllKey);
    await expect(await getCurrentState()).toEqualEditorState(state);
  }

  test("progressively selects the first list, then the document", async () => {
    await applyState(["- parent|", ...lines.slice(1)]);
    await selectAndExpect(["- |parent|", ...lines.slice(1)]);
    await selectAndExpect(["- |parent", "  - child|", ...lines.slice(2)]);
    await selectAndExpect(["|- parent", "  - child|", ...lines.slice(2)]);
    await selectAndExpect(["|- parent", ...lines.slice(1, 4), "- tail|"]);
  });

  test.each([3, 4])(
    "progressively selects the second list (cursor line %s)",
    async (line) => {
      await applyState(lines.map((text, i) => text + (i === line ? "|" : "")));
      await selectAndExpect(
        lines.map((text, i) =>
          i === line ? "- |" + text.slice(2) + "|" : text,
        ),
      );
      await selectAndExpect([...lines.slice(0, 3), "|- last", "- tail|"]);
      await selectAndExpect(["|- parent", ...lines.slice(1, 4), "- tail|"]);
    },
  );

  test("selection eventually includes text outside both lists", async () => {
    await applyState([
      "before",
      "",
      "- parent|",
      ...lines.slice(1),
      "",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "",
      "- |parent|",
      ...lines.slice(1),
      "",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "",
      "- |parent",
      "  - child|",
      ...lines.slice(2),
      "",
      "after",
    ]);
    await selectAndExpect([
      "before",
      "",
      "|- parent",
      "  - child|",
      ...lines.slice(2),
      "",
      "after",
    ]);
    await selectAndExpect(["|before", "", ...lines, "", "after|"]);
  });

  test("the separator itself uses standard select all", async () => {
    await applyState([...lines.slice(0, 2), "  |", ...lines.slice(3)]);
    await selectAndExpect(["|- parent", ...lines.slice(1, 4), "- tail|"]);
  });

  test.each(["\u00a0", "\u2003"])(
    "keeps both lists usable around mixed Unicode whitespace (%j)",
    async (suffix) => {
      const blank = `  ${suffix}`;
      await applyState(["- parent|", "  - child", blank, "- last", "- tail"]);
      await selectAndExpect([
        "- |parent|",
        "  - child",
        blank,
        "- last",
        "- tail",
      ]);
      await applyState(["- parent", "  - child", blank, "- last|", "- tail"]);
      await selectAndExpect([
        "- parent",
        "  - child",
        blank,
        "- |last|",
        "- tail",
      ]);
      await selectAndExpect([
        "- parent",
        "  - child",
        blank,
        "|- last",
        "- tail|",
      ]);
      await applyState(["- parent|", "  - child", blank]);
      await selectAndExpect(["- |parent|", "  - child", blank]);
      await selectAndExpect(["- |parent", "  - child|", blank]);
    },
  );

  test.each(["  ", "\t"])(
    "leaves trailing unsupported whitespace outside the list (%j)",
    async (blank) => {
      const child = blank === "\t" ? "\t- child" : "  - child";
      await applyState(["- parent|", child, blank, blank]);
      await selectAndExpect(["- |parent|", child, blank, blank]);
      await selectAndExpect(["- |parent", child + "|", blank, blank]);
      await selectAndExpect(["|- parent", child + "|", blank, blank]);
      await selectAndExpect(["|- parent", child, blank, blank + "|"]);
    },
  );

  test("moving an item stays within its list and preserves the separator", async () => {
    await applyState([...lines.slice(0, 3), "- last|", "- tail"]);
    await executeCommandById("obsidian-outliner:move-list-item-down");
    await expect(await getCurrentState()).toEqualEditorState([
      ...lines.slice(0, 3),
      "- tail",
      "- last|",
    ]);
  });

  test.each([
    [0, "obsidian-outliner:move-list-item-down"],
    [3, "obsidian-outliner:move-list-item-up"],
  ])(
    "list movement does not cross the separator (cursor line %s)",
    async (line, command) => {
      const state = lines.map((text, i) => text + (i === line ? "|" : ""));
      await applyState(state);
      await executeCommandById(command);
      await expect(await getCurrentState()).toEqualEditorState(state);
    },
  );

  test("a lossless list keeps progressive Outliner selection", async () => {
    await applyState(["- parent|", "  - child", "    ", "- last", "- tail"]);
    await selectAndExpect([
      "- |parent|",
      "  - child",
      "    ",
      "- last",
      "- tail",
    ]);
    await selectAndExpect([
      "- |parent",
      "  - child",
      "    |",
      "- last",
      "- tail",
    ]);
    await selectAndExpect([
      "|- parent",
      "  - child",
      "    ",
      "- last",
      "- tail|",
    ]);
  });
});
