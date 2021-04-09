import {
  App,
  PluginSettingTab,
  Plugin_2,
  Setting,
  ToggleComponent,
} from "obsidian";

export interface ObsidianOutlinerPluginSettings {
  styleLists: boolean;
  debug: boolean;
  smartCursor: boolean;
  smartEnter: boolean;
  smartDelete: boolean;
  smartSelection: boolean;
}

const DEFAULT_SETTINGS: ObsidianOutlinerPluginSettings = {
  styleLists: false,
  debug: false,
  smartCursor: true,
  smartEnter: true,
  smartDelete: true,
  smartSelection: true,
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

  get smartCursor() {
    return this.values.smartCursor;
  }
  set smartCursor(value: boolean) {
    this.set("smartCursor", value);
  }

  get smartEnter() {
    return this.values.smartEnter;
  }
  set smartEnter(value: boolean) {
    this.set("smartEnter", value);
  }

  get smartDelete() {
    return this.values.smartDelete;
  }
  set smartDelete(value: boolean) {
    this.set("smartDelete", value);
  }

  get smartSelection() {
    return this.values.smartSelection;
  }
  set smartSelection(value: boolean) {
    this.set("smartSelection", value);
  }

  onChange<T extends K>(key: T, cb: Callback<T>): () => void {
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }

    this.handlers.get(key).add(cb);

    return () => {
      this.handlers.get(key).delete(cb);
    };
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
      .setName("Style lists")
      .setDesc(
        "Enable better lists styles (works well only with spaces or 4-spaces-tabs)"
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.styleLists).onChange(async (value) => {
          this.settings.styleLists = value;
          await this.settings.save();
        });
      });

    const onchange = async (value: boolean) => {
      this.settings.smartCursor = value;
      this.settings.smartEnter = value;
      this.settings.smartDelete = value;
      this.settings.smartSelection = value;

      const components = [
        smartCursor.components[0],
        smartEnter.components[0],
        smartDelete.components[0],
        smartSelection.components[0],
      ] as ToggleComponent[];

      for (const component of components) {
        if (component.getValue() !== value) {
          component.setValue(value);
        }
      }

      await this.settings.save();
    };

    const smartCursor = new Setting(containerEl)
      .setName("Smart cursor")
      .setDesc("Attaching the cursor to the contents of a list item")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.smartCursor).onChange(onchange);
      });

    const smartEnter = new Setting(containerEl)
      .setName("Smart enter")
      .setDesc("Make Enter behaviour similar to outliners")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.smartEnter).onChange(onchange);
      });

    const smartDelete = new Setting(containerEl)
      .setName("Smart delete")
      .setDesc("Make Backspace and Delete behaviour similar to outliners")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.smartDelete).onChange(onchange);
      });

    const smartSelection = new Setting(containerEl)
      .setName("Smart selection")
      .setDesc("Make text selection behaviour similar to outliners")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.smartSelection).onChange(onchange);
      });

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("Enable debug logging")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.debug).onChange(async (value) => {
          this.settings.debug = value;
          await this.settings.save();
        });
      });
  }
}
