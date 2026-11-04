describe("Select all around whitespace-only lines (#618)", () => {
  const selectAllKey = process.platform === "darwin" ? "Cmd-KeyA" : "Ctrl-KeyA";

  beforeEach(async () => {
    await resetSettings();
  });

  afterEach(async () => {
    await resetSettings();
  });

  test.each([0, 3, 4])(
    "falls back to whole-document selection without changing text (cursor line %s)",
    async (line) => {
      const lines = ["- parent", "  - child", "  ", "- last", "- tail"];
      const initial = lines.map((text, i) => text + (i === line ? "|" : ""));
      await applyState(initial);
      await expect(await getCurrentState()).toEqualEditorState(initial);

      await simulateKeydown(selectAllKey);
      await expect(await getCurrentState()).toEqualEditorState([
        "|- parent",
        "  - child",
        "  ",
        "- last",
        "- tail|",
      ]);
    },
  );

  test("fallback includes text outside the list", async () => {
    await applyState([
      "before",
      "",
      "- parent|",
      "  - child",
      "  ",
      "- last",
      "- tail",
      "",
      "after",
    ]);

    await simulateKeydown(selectAllKey);
    await expect(await getCurrentState()).toEqualEditorState([
      "|before",
      "",
      "- parent",
      "  - child",
      "  ",
      "- last",
      "- tail",
      "",
      "after|",
    ]);
  });

  test("a lossless list keeps progressive Outliner selection", async () => {
    await applyState(["- parent|", "  - child", "    ", "- last", "- tail"]);

    await simulateKeydown(selectAllKey);
    await expect(await getCurrentState()).toEqualEditorState([
      "- |parent|",
      "  - child",
      "    ",
      "- last",
      "- tail",
    ]);

    await simulateKeydown(selectAllKey);
    await expect(await getCurrentState()).toEqualEditorState([
      "- |parent",
      "  - child",
      "    |",
      "- last",
      "- tail",
    ]);

    await simulateKeydown(selectAllKey);
    await expect(await getCurrentState()).toEqualEditorState([
      "|- parent",
      "  - child",
      "    ",
      "- last",
      "- tail|",
    ]);
  });
});
