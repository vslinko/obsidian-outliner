describe("Enter on empty items", () => {
  test("disabled outdent preserves a folded empty parent's children", async () => {
    await resetSettings();
    await setSetting({ k: "betterEnterOutdent", v: false });
    await applyState("- | #folded\n  - child");

    await simulateKeydown("Enter");

    // Markdown #folded assertions trim trailing whitespace; compare the exact
    // state here so the empty parent's marker retains its space.
    expect(await getCurrentState()).toEqual({
      value: "- \n  - child\n- ",
      folds: [0],
      selections: [{ anchor: { line: 2, ch: 2 }, head: { line: 2, ch: 2 } }],
    });
  });
});
