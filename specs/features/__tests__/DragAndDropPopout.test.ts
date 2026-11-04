describe("Drag and drop in separate windows (#589)", () => {
  const initialState = ["- one", "  - two", "- |three"];
  const expectedState = ["- |three", "- one", "  - two"];
  const popupState = ["- popup one", "  - popup two", "- |popup three"];
  const popupExpected = ["- |popup three", "- popup one", "  - popup two"];

  beforeEach(async () => {
    await resetSettings();
    await setSetting({ k: "dnd", v: true });
  });

  afterEach(async () => {
    // Cancel rather than drop, and restore main even after a failed assertion.
    try {
      await simulateKeydown("Escape");
      await setSetting({ k: "dnd", v: false });
    } finally {
      try {
        await closePopoutEditor();
      } finally {
        await selectTestEditor({ window: "main" });
        await simulateKeydown("Escape");
        await resetSettings();
      }
    }
  }, 10000);

  async function prepare(state = initialState) {
    await applyState(state);
    // This checks source text AND cursor before any gesture is dispatched.
    await expect(await getCurrentState()).toEqualEditorState(state);
  }

  async function moveToTop(buttons = 1) {
    await move({
      to: { line: 0, ch: 0 },
      offsetX: 10,
      offsetY: -10,
      buttons,
    });
  }

  async function startDrag() {
    await drag({ from: { line: 2, ch: 0 } });
    await moveToTop();
  }

  async function expectActive(window: "main" | "popout") {
    const snapshot = await getDragAndDropSnapshot();
    expect(snapshot).toMatchObject({
      active: true,
      pending: false,
      source: window,
    });
    const source = snapshot.documents.find((doc) => doc.window === window);
    expect(source).toMatchObject({
      registered: true,
      dragging: true,
      dropZones: 1,
      visibleDropZones: 1,
    });
    expect(source.draggingLines).toBeGreaterThan(0);
  }

  async function expectClean(contextCount: number) {
    const snapshot = await getDragAndDropSnapshot();
    expect(snapshot).toMatchObject({
      active: false,
      pending: false,
      source: null,
      contextCount,
    });
    for (const doc of snapshot.documents) {
      expect(doc).toMatchObject({
        dragging: false,
        visibleDropZones: 0,
        draggingLines: 0,
        droppingLines: 0,
        dropZones: doc.registered ? 1 : 0,
      });
    }
    return snapshot;
  }

  async function moveLastItemToTop(contextCount: number) {
    await prepare();
    await startDrag();
    await drop();
    await expectClean(contextCount);
    await expect(await getCurrentState()).toEqualEditorState(expectedState);
  }

  async function openPreparedPopup() {
    // True requires a rendered editor with a different ownerDocument.
    expect(await openPopoutEditor()).toBe(true);
    await prepare(popupState);
    const snapshot = await expectClean(2);
    expect(snapshot.distinctDocuments).toBe(true);
    expect(snapshot.documents.map((doc) => doc.window).sort()).toEqual([
      "main",
      "popout",
    ]);
  }

  async function prepareTwoDocuments() {
    await prepare();
    await openPreparedPopup();
    // Focus B BEFORE starting A; all later ownership switches only change
    // the bridge reference, so no real focus/blur can make cancellation vacuous.
    await selectTestEditor({ window: "popout" });
    await selectTestEditor({ window: "main", focus: false });
    await expect(await getCurrentState()).toEqualEditorState(initialState);
  }

  async function expectUnchangedMainAndReorderedPopup() {
    await expectClean(2);
    await expect(await getCurrentState()).toEqualEditorState(popupExpected);
    await selectTestEditor({ window: "main", focus: false });
    await expect(await getCurrentState()).toEqualEditorState(initialState);
  }

  test.each(["main", "popout"] as const)(
    "rejects an orphan bullet in %s without errors and accepts the next drag (#604)",
    async (window) => {
      if (window === "popout") {
        expect(await openPopoutEditor()).toBe(true);
      }
      const contextCount = window === "popout" ? 2 : 1;
      // Parser deliberately excludes this orphan after whitespace boundaries
      // (#630), although Obsidian still renders its draggable bullet.
      const orphanState = [
        "- parent",
        "  - child",
        "  ",
        " ",
        "  - |orphan",
        "- last",
        "- tail",
      ];
      await prepare(orphanState);
      await drag({ from: { line: 4, ch: 2 } });
      expect(await getDragAndDropSnapshot()).toMatchObject({
        active: false,
        pending: true,
      });
      // The bridge rejects if a DOM listener reports an uncaught window error.
      await moveToTop();
      await expectClean(contextCount);
      await expect(await getCurrentState()).toEqualEditorState(orphanState);
      await moveToTop();
      await drop();
      await expectClean(contextCount);
      await expect(await getCurrentState()).toEqualEditorState(orphanState);
      await moveLastItemToTop(contextCount);
    },
    20000,
  );

  test("moves an item in the main window (control)", async () => {
    await moveLastItemToTop(1);
  });

  test("moves an item in a real pop-out window", async () => {
    expect(await openPopoutEditor()).toBe(true);
    await moveLastItemToTop(2);
  }, 15000);

  test("still moves an item in main after independently opening and closing a pop-out", async () => {
    expect(await openPopoutEditor()).toBe(true);
    await closePopoutEditor();
    await expectClean(1);
    await moveLastItemToTop(1);
  }, 15000);

  test("foreign mouseup cancels A before a new drag and drop in B", async () => {
    await prepareTwoDocuments();
    await startDrag();
    await expectActive("main");
    await selectTestEditor({ window: "popout", focus: false });
    await drop();
    await expectClean(2);
    await expect(await getCurrentState()).toEqualEditorState(popupState);
    await startDrag();
    await expectActive("popout");
    await drop();
    await expectUnchangedMainAndReorderedPopup();
  }, 15000);

  test("a new mousedown in B cleans A even without a prior mouseup", async () => {
    await prepareTwoDocuments();
    await startDrag();
    await expectActive("main");
    await selectTestEditor({ window: "popout", focus: false });
    await drag({ from: { line: 2, ch: 0 } });
    const snapshot = await getDragAndDropSnapshot();
    expect(snapshot).toMatchObject({
      active: false,
      pending: true,
      contextCount: 2,
    });
    for (const doc of snapshot.documents) {
      expect(doc).toMatchObject({
        dragging: false,
        visibleDropZones: 0,
        draggingLines: 0,
        droppingLines: 0,
      });
    }
    await moveToTop();
    await expectActive("popout");
    await drop();
    await expectUnchangedMainAndReorderedPopup();
  }, 15000);

  test.each([false, true])(
    "buttons=0 cancels a pop-out gesture (active=%s)",
    async (active) => {
      await openPreparedPopup();
      await drag({ from: { line: 2, ch: 0 } });
      if (active) {
        await moveToTop();
        await expectActive("popout");
      } else {
        expect(await getDragAndDropSnapshot()).toMatchObject({
          active: false,
          pending: true,
        });
      }
      await moveToTop(0);
      await expectClean(2);
      // A later move/up must not revive a cancelled pending gesture.
      await moveToTop();
      await drop();
      await expectClean(2);
      await expect(await getCurrentState()).toEqualEditorState(popupState);
    },
    15000,
  );

  test("Escape in the pop-out cancels its drag without changing text", async () => {
    await openPreparedPopup();
    await startDrag();
    await expectActive("popout");
    await simulateKeydown("Escape");
    await expectClean(2);
    await expect(await getCurrentState()).toEqualEditorState(popupState);
  }, 15000);

  test("Escape in B also cancels an active drag in A", async () => {
    await prepareTwoDocuments();
    await startDrag();
    await expectActive("main");
    await selectTestEditor({ window: "popout", focus: false });
    await simulateKeydown("Escape");
    await expectClean(2);
    await expect(await getCurrentState()).toEqualEditorState(popupState);
    await selectTestEditor({ window: "main", focus: false });
    await expect(await getCurrentState()).toEqualEditorState(initialState);
  }, 15000);

  test.each([false, true])(
    "window blur cancels a pop-out gesture (active=%s)",
    async (active) => {
      await openPreparedPopup();
      await drag({ from: { line: 2, ch: 0 } });
      if (active) {
        await moveToTop();
        await expectActive("popout");
      } else {
        expect(await getDragAndDropSnapshot()).toMatchObject({ pending: true });
      }
      await simulateWindowBlur();
      await expectClean(2);
      await expect(await getCurrentState()).toEqualEditorState(popupState);
    },
    15000,
  );

  test("closing a pop-out during a drag cancels and releases its document context", async () => {
    await openPreparedPopup();
    const unchanged = await getCurrentState();
    await startDrag();
    await expectActive("popout");
    await closePopoutEditor();
    const snapshot = await expectClean(1);
    expect(
      snapshot.documents.find((doc) => doc.window === "popout"),
    ).toMatchObject({
      registered: false,
      enabled: false,
      dropZones: 0,
    });
    // Reopen the saved file to check that closing did not accidentally drop it.
    expect(await openPopoutEditor()).toBe(true);
    expect(await getCurrentState()).toMatchObject({ value: unchanged.value });
    await expectClean(2);
  }, 15000);

  test("repeated open/close does not accumulate contexts or duplicate drop zones", async () => {
    for (let i = 0; i < 3; i++) {
      await openPreparedPopup();
      await startDrag();
      await expectActive("popout");
      await drop();
      await expectClean(2);
      await expect(await getCurrentState()).toEqualEditorState(popupExpected);
      await closePopoutEditor();
      await expectClean(1);
    }
  }, 20000);

  test("turning dnd off during a drag cancels in both documents", async () => {
    await prepareTwoDocuments();
    await startDrag();
    await expectActive("main");
    await setSetting({ k: "dnd", v: false });
    const snapshot = await expectClean(2);
    expect(snapshot.documents.every((doc) => !doc.enabled)).toBe(true);
    await drop();
    await expect(await getCurrentState()).toEqualEditorState(initialState);
    await selectTestEditor({ window: "popout", focus: false });
    await expect(await getCurrentState()).toEqualEditorState(popupState);
  }, 15000);
});
