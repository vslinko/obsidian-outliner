export type ListLineAction = "none" | "zoom-in" | "toggle-folding";
export type StickCursor = "never" | "bullet-only" | "bullet-and-checkbox";

export interface ObsidianOutlinerPluginSettings {
  styleLists: boolean;
  debug: boolean;
  stickCursor: StickCursor | boolean;
  betterEnter: boolean;
  betterTab: boolean;
  selectAll: boolean;
  listLines: boolean;
  listLineAction: ListLineAction;
  dndExperiment: boolean;
  previousRelease: string | null;
}

const DEFAULT_SETTINGS: ObsidianOutlinerPluginSettings = {
  styleLists: true,
  debug: false,
  stickCursor: "bullet-and-checkbox",
  betterEnter: true,
  betterTab: true,
  selectAll: true,
  listLines: false,
  listLineAction: "toggle-folding",
  dndExperiment: false,
  previousRelease: null,
};

export interface Storage {
  loadData(): Promise<ObsidianOutlinerPluginSettings>;
  saveData(settigns: ObsidianOutlinerPluginSettings): Promise<void>;
}

type K = keyof ObsidianOutlinerPluginSettings;
type Callback<T extends K> = (cb: ObsidianOutlinerPluginSettings[T]) => void;

export class SettingsService implements ObsidianOutlinerPluginSettings {
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
    // Adaptor for users migrating from older version of the plugin.
    if (this.values.stickCursor === true) {
      return "bullet-and-checkbox";
    } else if (this.values.stickCursor === false) {
      return "never";
    }
    return this.values.stickCursor;
  }
  set stickCursor(value: StickCursor) {
    this.set("stickCursor", value);
  }

  get betterEnter() {
    return this.values.betterEnter;
  }
  set betterEnter(value: boolean) {
    this.set("betterEnter", value);
  }

  get dndExperiment() {
    return this.values.dndExperiment;
  }
  set dndExperiment(value: boolean) {
    this.set("dndExperiment", value);
  }

  get betterTab() {
    return this.values.betterTab;
  }
  set betterTab(value: boolean) {
    this.set("betterTab", value);
  }

  get selectAll() {
    return this.values.selectAll;
  }
  set selectAll(value: boolean) {
    this.set("selectAll", value);
  }

  get listLines() {
    return this.values.listLines;
  }
  set listLines(value: boolean) {
    this.set("listLines", value);
  }

  get listLineAction() {
    return this.values.listLineAction;
  }
  set listLineAction(value: ListLineAction) {
    this.set("listLineAction", value);
  }

  get previousRelease() {
    return this.values.previousRelease;
  }
  set previousRelease(value: string | null) {
    this.set("previousRelease", value);
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

  reset() {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      this.set(k as keyof ObsidianOutlinerPluginSettings, v);
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

  set<T extends K>(key: T, value: ObsidianOutlinerPluginSettings[T]): void {
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
