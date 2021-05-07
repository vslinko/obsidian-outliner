import { App, PluginSettingTab, Plugin_2, Setting } from "obsidian";

export interface ObsidianOutlinerPluginSettings {
  styleLists: boolean;
  debug: boolean;
  stickCursor: boolean;
  betterEnter: boolean;
  selectAll: boolean;
  zoomOnClick: boolean;
}

const DEFAULT_SETTINGS: ObsidianOutlinerPluginSettings = {
  styleLists: false,
  debug: false,
  stickCursor: true,
  betterEnter: true,
  selectAll: true,
  zoomOnClick: true,
};

export interface Storage {
  loadData(): Promise<ObsidianOutlinerPluginSettings>;
  saveData(settigns: ObsidianOutlinerPluginSettings): Promise<void>;
}

type K = keyof ObsidianOutlinerPluginSettings;
type V<T extends K> = ObsidianOutlinerPluginSettings[T];
type Callback<T extends K> = (cb: V<T>) => void;

export class Settings implements ObsidianOutlinerPluginSettings {
  private storage: Storage;
  private values: ObsidianOutlinerPluginSettings;
  private handlers: Map<K, Set<Callback<K>>>;

  constructor(storage: Storage) {
    this.storage = storage;
    this.handlers = new Map();
  }

  get styleLists() {
    return this.values.styleLists;
  }
  set styleLists(value: boolean) {
    this.set("styleLists", value);
  }

  get debug() {
    return this.values.debug;
  }
  set debug(value: boolean) {
    this.set("debug", value);
  }

  get stickCursor() {
    return this.values.stickCursor;
  }
  set stickCursor(value: boolean) {
    this.set("stickCursor", value);
  }

  get betterEnter() {
    return this.values.betterEnter;
  }
  set betterEnter(value: boolean) {
    this.set("betterEnter", value);
  }

  get selectAll() {
    return this.values.selectAll;
  }
  set selectAll(value: boolean) {
    this.set("selectAll", value);
  }

  get zoomOnClick() {
    return this.values.zoomOnClick;
  }
  set zoomOnClick(value: boolean) {
    this.set("zoomOnClick", value);
  }

  onChange<T extends K>(key: T, cb: Callback<T>) {
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }

    this.handlers.get(key).add(cb);
  }

  removeCallback<T extends K>(key: T, cb: Callback<T>): void {
    const handlers = this.handlers.get(key);

    if (handlers) {
      handlers.delete(cb);
    }
  }

  async load() {
    this.values = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.storage.loadData()
    );
  }

  async save() {
    await this.storage.saveData(this.values);
  }

  private set<T extends K>(key: T, value: V<K>): void {
    this.values[key] = value;
    const callbacks = this.handlers.get(key);

    if (!callbacks) {
      return;
    }

    for (const cb of callbacks.values()) {
      cb(value);
    }
  }
}

export class ObsidianOutlinerPluginSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin_2, private settings: Settings) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Improve the style of your lists")
      .setDesc(
        "Styles are only compatible with built-in Obsidian themes and may not be compatible with other themes. Styles only work well with spaces or four-space tabs."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.styleLists).onChange(async (value) => {
          this.settings.styleLists = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Stick the cursor to the content")
      .setDesc("Don't let the cursor move to the bullet position.")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.stickCursor).onChange(async (value) => {
          this.settings.stickCursor = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Enhance the Enter key")
      .setDesc("Make the Enter key behave the same as other outliners.")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.betterEnter).onChange(async (value) => {
          this.settings.betterEnter = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Enhance the Ctrl+A or Cmd+A behavior")
      .setDesc(
        "Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.selectAll).onChange(async (value) => {
          this.settings.selectAll = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Zooming in when clicking on the bullet")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.zoomOnClick).onChange(async (value) => {
          this.settings.zoomOnClick = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc(
        "Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.debug).onChange(async (value) => {
          this.settings.debug = value;
          await this.settings.save();
        });
      });
  }
}
