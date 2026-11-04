describe("Drag and drop in separate windows (#589)", () => {
  const initialState = ["- one", "  - two", "- |three"];
  const expectedState = ["- |three", "- one", "  - two"];

  beforeEach(async () => {
    await resetSettings();
    await setSetting({ k: "dnd", v: true });
  });

  afterEach(async () => {
    // Restore the main editor even when the regression assertion fails.
    await closePopoutEditor();
  }, 10000);

  async function moveLastItemToTop() {
    await applyState(initialState);
    await expect(await getCurrentState()).toEqualEditorState(initialState);
    await drag({ from: { line: 2, ch: 0 } });
    await move({
      to: { line: 0, ch: 0 },
      offsetX: 10,
      offsetY: -10,
    });
    await drop();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(await getCurrentState()).toEqualEditorState(expectedState);
  }

  test("moves an item in the main window (control)", async () => {
    await moveLastItemToTop();
  });

  test("moves an item in a real pop-out window", async () => {
    // The bridge only returns true after a rendered editor exists in a
    // different ownerDocument. Failure to open a window is not a reproduction.
    expect(await openPopoutEditor()).toBe(true);
    await moveLastItemToTop();
  }, 15000);

  test("still moves an item in the main window after closing the pop-out", async () => {
    await moveLastItemToTop();
  });
});
