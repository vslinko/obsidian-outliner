describe("Third-party replacement drag handles (#631), native Chromium input", () => {
  const initial = ["- one", "  - child", "- |last"];
  const text = "- one\n  - child\n- last";
  let owner: "main" | "popout" = "main";

  beforeEach(async () => {
    owner = "main";
    await resetSettings();
    await setSetting({ k: "dnd", v: true });
  });

  afterEach(async () => {
    // Cancel before releasing a possibly-held native button, even on failure.
    try {
      await simulateKeydown("Escape");
      await setSetting({ k: "dnd", v: false });
      await nativeInput({ action: "reset" });
    } finally {
      try {
        await testHandle({ action: "clear" });
      } finally {
        await closePopoutEditor();
        await selectTestEditor({ window: "main" });
        await resetSettings();
      }
    }
  }, 15000);

  const snapshot = () => testHandle({ action: "snapshot" });
  const input = (action: "down" | "move" | "up", point: NativePoint) =>
    nativeInput({ action, window: owner, ...point });

  async function prepare(
    window: "main" | "popout",
    opts: Partial<TestHandleCommand> = {},
    state = initial,
  ) {
    owner = window;
    if (window === "popout") expect(await openPopoutEditor()).toBe(true);
    await applyState(state);
    await expect(await getCurrentState()).toEqualEditorState(state);
    const fixture = await testHandle({ action: "install", line: 2, ...opts });
    expect(fixture.handle).not.toBeNull();
    if (opts.kind !== "checkbox") {
      // Otherwise a native Obsidian bullet ancestor could make the attribute
      // test pass without ever exercising the public opt-in.
      expect(fixture.nativeBulletAncestor).toBe(false);
      expect(fixture.nested).not.toBeNull();
    }
    return fixture;
  }

  async function click(point: NativePoint) {
    await input("move", point);
    await input("down", point);
    await input("up", point);
  }

  async function start(point: NativePoint) {
    await input("move", point);
    await input("down", point);
    await input("move", { x: point.x + 80, y: point.y });
    expect(await getDragAndDropSnapshot()).toMatchObject({
      active: true,
      source: owner,
    });
  }

  function expectNativeClicks(fixture: TestHandleSnapshot, count: number) {
    const clicks = fixture.events.filter(
      (event) => event.type === "click" && event.detail > 0,
    );
    if (clicks.length !== count) {
      throw new Error(
        `Expected ${count} native handle clicks: ${JSON.stringify(fixture)}`,
      );
    }
    expect(clicks).toHaveLength(count);
    expect(clicks.every((event) => event.trusted && event.button === 0)).toBe(
      true,
    );
    // Window capture sees real mouseup followed by click, even when document
    // capture suppresses the click before the widget or checkbox sees it.
    const lastClick = fixture.events
      .map((event) => event.type)
      .lastIndexOf("click");
    expect(fixture.events[lastClick - 1]?.type).toBe("mouseup");
  }

  async function expectActions(count: number) {
    const fixture = await snapshot();
    if (fixture.clicks !== count) {
      throw new Error(
        `Expected ${count} delivered actions: ${JSON.stringify(fixture)}`,
      );
    }
    expect(fixture.clicks).toBe(count);
  }

  test.each([
    ["main", "handle"],
    ["main", "nested"],
    ["popout", "handle"],
    ["popout", "nested"],
  ] as const)(
    "%s %s: plain click, release-back, Escape, next click and reorder",
    async (window, target) => {
      const fixture = await prepare(window);
      let point = fixture[target]!;
      await click(point);
      expect((await snapshot()).clicks).toBe(1);
      expectNativeClicks(await snapshot(), 1);

      point = (await snapshot())[target]!;
      await start(point);
      point = (await snapshot())[target]!;
      await input("move", point);
      await input("up", point);
      await expectActions(1);
      expectNativeClicks(await snapshot(), 2);
      expect((await getCurrentState()).value).toBe(text);

      await click(point);
      expect((await snapshot()).clicks).toBe(2);
      await start(point);
      await nativeInput({ action: "escape", window: owner });
      expect(await getDragAndDropSnapshot()).toMatchObject({
        active: false,
        pending: false,
      });
      await input("move", point);
      await input("up", point);
      await expectActions(2);
      expectNativeClicks(await snapshot(), 4);
      expect((await getCurrentState()).value).toBe(text);

      await click(point);
      expect((await snapshot()).clicks).toBe(3);
      await start(point);
      await input("move", fixture.top);
      await input("up", fixture.top);
      expect((await getCurrentState()).value).toBe("- last\n- one\n  - child");
      expect(await getDragAndDropSnapshot()).toMatchObject({
        active: false,
        pending: false,
      });
    },
    30000,
  );

  test.each(["main", "popout"] as const)(
    "%s: without the attribute, the same widget is not draggable",
    async (window) => {
      const fixture = await prepare(window, { attribute: false });
      const point = fixture.nested!;
      await input("move", point);
      await input("down", point);
      await input("move", fixture.top);
      expect(await getDragAndDropSnapshot()).toMatchObject({
        active: false,
        pending: false,
      });
      await input("move", point);
      await input("up", point);
      expect((await getCurrentState()).value).toBe(text);
      // Native movement may retarget/cancel the browser click without any
      // Outliner involvement. A separate stationary click must still work.
      const before = await snapshot();
      await click(before.nested!);
      await expectActions(before.clicks + 1);
      expectNativeClicks(
        await snapshot(),
        before.events.filter(
          (event) => event.type === "click" && event.detail > 0,
        ).length + 1,
      );
    },
    20000,
  );

  test("a rejected orphan drag still delivers its native handle click (#604)", async () => {
    const state = [
      "- parent",
      "  - child",
      "  ",
      " ",
      "  - orphan",
      "- last",
      "- |tail",
    ];
    const fixture = await prepare("main", { line: 4 }, state);
    const point = fixture.nested!;
    await input("move", point);
    await input("down", point);
    expect(await getDragAndDropSnapshot()).toMatchObject({
      active: false,
      pending: true,
    });
    await input("move", { x: point.x + 80, y: point.y });
    expect(await getDragAndDropSnapshot()).toMatchObject({
      active: false,
      pending: false,
    });
    await input("move", point);
    await input("up", point);
    expect((await snapshot()).clicks).toBe(1);
    expectNativeClicks(await snapshot(), 1);
    expect((await getCurrentState()).value).toBe(
      state.join("\n").replace("|", ""),
    );
  });

  test.each([
    ["main", false],
    ["main", true],
    ["popout", false],
    ["popout", true],
  ] as const)(
    "%s native checkbox: drag (Escape=%s) does not toggle; next ordinary click does",
    async (window, escape) => {
      const state = ["- [ ] task", "- middle", "- |last"];
      const fixture = await prepare(
        window,
        { kind: "checkbox", line: 0 },
        state,
      );
      expect(fixture.checked).toBe(false);
      const point = fixture.handle!;
      await start(point);
      if (escape) await nativeInput({ action: "escape", window: owner });
      await input("move", point);
      await input("up", point);
      expect((await snapshot()).clicks).toBe(0);
      expectNativeClicks(await snapshot(), 1);
      expect((await snapshot()).checked).toBe(false);
      expect((await getCurrentState()).value).toBe(
        "- [ ] task\n- middle\n- last",
      );
      await click(point);
      expect((await snapshot()).clicks).toBe(1);
      expect((await snapshot()).checked).toBe(true);
      expect((await getCurrentState()).value).toBe(
        "- [x] task\n- middle\n- last",
      );
    },
    20000,
  );

  test("programmatic and trusted keyboard clicks are preserved while Escape awaits native release", async () => {
    const fixture = await prepare("main");
    const point = fixture.handle!;
    await start(point);
    await nativeInput({ action: "escape" });
    await testHandle({ action: "programmaticClick" });
    expect((await snapshot()).clicks).toBe(1);
    expect((await snapshot()).events).toContainEqual({
      type: "click",
      trusted: false,
      detail: 0,
      button: 0,
    });
    expect(await testHandle({ action: "focus" })).toMatchObject({
      focused: true,
    });
    await nativeInput({ action: "enter" });
    await expectActions(2);
    expect((await snapshot()).events).toContainEqual({
      type: "click",
      trusted: true,
      detail: 0,
      button: 0,
    });
    await input("move", point);
    await input("up", point);
    expect((await snapshot()).clicks).toBe(2);
    expectNativeClicks(await snapshot(), 1);
    expect((await getCurrentState()).value).toBe(text);
    await click(point);
    expect((await snapshot()).clicks).toBe(3);
  });

  test.each(["blur", "disable"] as const)(
    "%s clears an Escape-cancelled gesture with a missing mouseup",
    async (cleanup) => {
      const fixture = await prepare("main");
      const point = fixture.handle!;
      await start(point);
      await nativeInput({ action: "escape" });
      if (cleanup === "blur") await simulateWindowBlur();
      else await setSetting({ k: "dnd", v: false });
      await testHandle({ action: "programmaticClick" });
      expect((await snapshot()).clicks).toBe(1);
      // The late release must not be swallowed by stale drag ownership.
      await input("move", point);
      await input("up", point);
      await expectActions(2);
      expectNativeClicks(await snapshot(), 1);
      expect((await getCurrentState()).value).toBe(text);
      await click(point);
      expect((await snapshot()).clicks).toBe(3);
    },
  );

  test("closing the source pop-out preserves unrelated clicks in the surviving document", async () => {
    const main = await prepare("main");
    const popout = await prepare("popout");
    await start(popout.handle!);
    await nativeInput({ action: "escape", window: "popout" });
    await selectTestEditor({ window: "main", focus: false });
    await testHandle({ action: "programmaticClick" });
    expect((await snapshot()).clicks).toBe(1);
    expect((await getCurrentState()).value).toBe(text);
    await closePopoutEditor();
    // The native source target was destroyed with the held button. Reset closes
    // its CDP socket without substituting an artificial release in main.
    await nativeInput({ action: "reset" });
    owner = "main";
    expect(await testHandle({ action: "focus" })).toMatchObject({
      focused: true,
    });
    await nativeInput({ action: "enter" });
    await expectActions(2);
    expect((await snapshot()).events).toContainEqual({
      type: "click",
      trusted: true,
      detail: 0,
      button: 0,
    });
    await click(main.handle!);
    expect((await snapshot()).clicks).toBe(3);
    expectNativeClicks(await snapshot(), 1);
    expect((await getCurrentState()).value).toBe(text);
  }, 25000);
});
