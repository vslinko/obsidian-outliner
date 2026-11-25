describe("Native fold toggles are not drag handles (#447)", () => {
  const initial = [
    "- preceding",
    "- parent",
    "  - child one",
    "  - child two",
    "- |tail",
  ];
  const text = initial.join("\n").replace("|", "");

  beforeEach(async () => {
    await resetSettings();
    await setSetting({ k: "dnd", v: true });
    await applyState(initial);
  });

  afterEach(async () => {
    try {
      await simulateKeydown("Escape");
      await setSetting({ k: "dnd", v: false });
      await nativeInput({ action: "reset" });
    } finally {
      // Leave the editor in Live Preview for the other integration suites.
      await applyState(initial);
      const target = await getNativeListTarget({ line: 1, kind: "fold" });
      if (!target.livePreview) await executeCommandById("editor:toggle-source");
      await resetSettings();
    }
  });

  async function prepare(livePreview: boolean) {
    let target = await getNativeListTarget({ line: 1, kind: "fold" });
    if (target.livePreview !== livePreview) {
      await executeCommandById("editor:toggle-source");
      target = await getNativeListTarget({ line: 1, kind: "fold" });
    }
    expect(target.livePreview).toBe(livePreview);
    await nativeInput({ action: "move", ...target.point });
    target = await getNativeListTarget({ line: 1, kind: "fold" });
    expect(target.matches).toBe(true);
    expect(target.hit).toMatch(/<svg|<path/);
    return target.point;
  }

  test.each([
    [true, 2, 2],
    [true, 24, 0],
    [false, 2, 2],
    [false, 24, 0],
  ] as const)(
    "Live Preview=%s, triangle gesture %s×%s px does not drag",
    async (livePreview, dx, dy) => {
      const point = await prepare(livePreview);
      await nativeInput({ action: "down", ...point });
      const down = await getDragAndDropSnapshot();
      await nativeInput({ action: "move", x: point.x + dx, y: point.y + dy });
      const during = await getDragAndDropSnapshot();
      await nativeInput({ action: "up", x: point.x + dx, y: point.y + dy });
      const after = await getCurrentState();
      console.log(
        "#447 gesture",
        JSON.stringify({ livePreview, dx, dy, down, during, after }),
      );
      expect(down).toMatchObject({ pending: false, active: false });
      expect(during).toMatchObject({ pending: false, active: false });
      expect(after.value).toBe(text);
      expect(await getDragAndDropSnapshot()).toMatchObject({
        pending: false,
        active: false,
      });
    },
  );

  test.each([true, false])(
    "Live Preview=%s: ordinary triangle clicks fold/unfold; bullet still drags",
    async (livePreview) => {
      for (const folds of [[1], []]) {
        const point = await prepare(livePreview);
        await nativeInput({ action: "down", ...point });
        await nativeInput({ action: "up", ...point });
        const state = await getCurrentState();
        expect(state.value).toBe(text);
        expect(state.folds).toEqual(folds);
      }
      const bullet = await getNativeListTarget({ line: 4, kind: "bullet" });
      const top = await getNativeListTarget({ line: 0, kind: "bullet" });
      expect(bullet.matches).toBe(true);
      await nativeInput({ action: "move", ...bullet.point });
      await nativeInput({ action: "down", ...bullet.point });
      const destination = { x: top.point.x, y: top.point.y - 15 };
      await nativeInput({ action: "move", ...destination });
      expect(await getDragAndDropSnapshot()).toMatchObject({ active: true });
      await nativeInput({ action: "up", ...destination });
      expect((await getCurrentState()).value).toBe(
        "- tail\n- preceding\n- parent\n  - child one\n  - child two",
      );
    },
  );
});
