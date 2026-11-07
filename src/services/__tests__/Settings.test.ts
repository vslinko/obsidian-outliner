import { Settings } from "../Settings";

type SavedSettings = ReturnType<Settings["getValues"]>;

function makeStorage(initial: Partial<SavedSettings> = {}) {
  let data = { ...initial };
  return {
    // Stored settings from older releases may lack newly introduced keys.
    loadData: jest.fn(async () => ({ ...data }) as SavedSettings),
    saveData: jest.fn(async (settings: SavedSettings) => {
      data = { ...settings };
    }),
  };
}

describe("Settings empty-item outdent preference", () => {
  test("defaults to true when old saved data has no betterEnterOutdent", async () => {
    const storage = makeStorage({ betterEnter: false, betterTab: false });
    const settings = new Settings(storage);

    await settings.load();

    expect(settings.enterOutdentsEmptyListItem).toBe(true);
    expect(settings.overrideEnterBehaviour).toBe(false);
    expect(settings.overrideTabBehaviour).toBe(false);
    expect(settings.getValues().betterEnterOutdent).toBe(true);
    expect(storage.saveData).not.toHaveBeenCalled();
  });

  test("persists false and restores it in a new Settings instance", async () => {
    const storage = makeStorage();
    const settings = new Settings(storage);
    await settings.load();

    settings.enterOutdentsEmptyListItem = false;
    await settings.save();

    expect(storage.saveData).toHaveBeenCalledWith(
      expect.objectContaining({ betterEnterOutdent: false }),
    );
    const reloaded = new Settings(storage);
    await reloaded.load();
    expect(reloaded.enterOutdentsEmptyListItem).toBe(false);
    expect(reloaded.getValues().betterEnterOutdent).toBe(false);
  });

  test("reset restores true and saves the reset preference", async () => {
    const storage = makeStorage({ betterEnterOutdent: false });
    const settings = new Settings(storage);
    await settings.load();
    expect(settings.enterOutdentsEmptyListItem).toBe(false);

    settings.reset();
    expect(settings.enterOutdentsEmptyListItem).toBe(true);
    await settings.save();

    const reloaded = new Settings(storage);
    await reloaded.load();
    expect(reloaded.enterOutdentsEmptyListItem).toBe(true);
  });

  test("is independent of the master Enter, Vim O and Tab preferences", async () => {
    const storage = makeStorage({ betterVimO: false, betterTab: false });
    const settings = new Settings(storage);
    await settings.load();
    const original = settings.getValues();

    settings.enterOutdentsEmptyListItem = false;
    expect(settings.getValues()).toEqual({
      ...original,
      betterEnterOutdent: false,
    });

    settings.overrideEnterBehaviour = false;
    expect(settings.overrideEnterBehaviour).toBe(false);
    expect(settings.enterOutdentsEmptyListItem).toBe(false);
    settings.overrideEnterBehaviour = true;
    expect(settings.overrideEnterBehaviour).toBe(true);
    expect(settings.enterOutdentsEmptyListItem).toBe(false);

    settings.overrideVimOBehaviour = true;
    settings.overrideTabBehaviour = true;
    expect(settings.enterOutdentsEmptyListItem).toBe(false);
    expect(settings.overrideEnterBehaviour).toBe(true);
    await settings.save();

    const reloaded = new Settings(storage);
    await reloaded.load();
    expect(reloaded.overrideEnterBehaviour).toBe(true);
    expect(reloaded.enterOutdentsEmptyListItem).toBe(false);
  });
});

describe("Settings automatic selection expansion preference", () => {
  test.each([
    {},
    { stickCursor: "never" as const },
    { stickCursor: "bullet-only" as const },
    { stickCursor: "bullet-and-checkbox" as const },
    { stickCursor: false },
    { stickCursor: true },
  ])("new and old saved data default expansion off: %j", async (saved) => {
    const storage = makeStorage(saved);
    const settings = new Settings(storage);
    await settings.load();

    expect(settings.expandSelection).toBe(false);
    expect(settings.getValues().expandSelection).toBe(false);
    expect(storage.saveData).not.toHaveBeenCalled();
    if (saved.stickCursor === false || saved.stickCursor === "never") {
      expect(settings.keepCursorWithinContent).toBe("never");
    }
  });

  test.each([false, true])(
    "persists and restores explicit expandSelection=%s",
    async (expandSelection) => {
      const storage = makeStorage({ stickCursor: false });
      const settings = new Settings(storage);
      await settings.load();
      settings.expandSelection = expandSelection;
      await settings.save();

      expect(storage.saveData).toHaveBeenCalledWith(
        expect.objectContaining({ expandSelection, stickCursor: false }),
      );
      const reloaded = new Settings(storage);
      await reloaded.load();
      expect(reloaded.expandSelection).toBe(expandSelection);
      expect(reloaded.keepCursorWithinContent).toBe("never");
      expect(reloaded.getValues().stickCursor).toBe(false);
    },
  );

  test.each(["never", "bullet-only", "bullet-and-checkbox"] as const)(
    "toggle is independent of cursor mode %s, select-all and Enter preferences",
    async (stickCursor) => {
      const storage = makeStorage({
        stickCursor,
        selectAll: false,
        betterEnter: false,
      });
      const settings = new Settings(storage);
      await settings.load();
      const original = settings.getValues();
      const onChange = jest.fn();
      settings.onChange(onChange);

      settings.expandSelection = true;
      expect(settings.getValues()).toEqual({
        ...original,
        expandSelection: true,
      });
      expect(settings.keepCursorWithinContent).toBe(stickCursor);
      expect(onChange).toHaveBeenCalledTimes(1);
      for (const mode of [
        "never",
        "bullet-only",
        "bullet-and-checkbox",
      ] as const) {
        settings.keepCursorWithinContent = mode;
        expect(settings.expandSelection).toBe(true);
      }
      settings.overrideSelectAllBehaviour = true;
      settings.overrideEnterBehaviour = true;
      expect(settings.expandSelection).toBe(true);
      settings.expandSelection = false;
      expect(settings.keepCursorWithinContent).toBe("bullet-and-checkbox");
      expect(settings.overrideSelectAllBehaviour).toBe(true);
      expect(settings.overrideEnterBehaviour).toBe(true);
      await settings.save();

      const reloaded = new Settings(storage);
      await reloaded.load();
      expect(reloaded.expandSelection).toBe(false);
      expect(reloaded.keepCursorWithinContent).toBe("bullet-and-checkbox");
    },
  );

  test("loads explicit opt-in without enabling legacy cursor protection", async () => {
    const storage = makeStorage({ expandSelection: true, stickCursor: false });
    const settings = new Settings(storage);
    await settings.load();
    expect(settings.expandSelection).toBe(true);
    expect(settings.keepCursorWithinContent).toBe("never");
    settings.expandSelection = false;
    expect(settings.getValues().stickCursor).toBe(false);
  });

  test("reset restores expansion off, saves it and restores existing defaults", async () => {
    const storage = makeStorage({
      expandSelection: true,
      stickCursor: "never",
      selectAll: false,
    });
    const settings = new Settings(storage);
    await settings.load();
    settings.reset();
    expect(settings.expandSelection).toBe(false);
    expect(settings.keepCursorWithinContent).toBe("bullet-and-checkbox");
    expect(settings.overrideSelectAllBehaviour).toBe(true);
    await settings.save();
    expect(storage.saveData).toHaveBeenCalledWith(
      expect.objectContaining({
        expandSelection: false,
        stickCursor: "bullet-and-checkbox",
      }),
    );

    const reloaded = new Settings(storage);
    await reloaded.load();
    expect(reloaded.expandSelection).toBe(false);
    expect(reloaded.keepCursorWithinContent).toBe("bullet-and-checkbox");
  });
});
