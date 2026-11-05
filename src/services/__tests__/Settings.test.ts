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
