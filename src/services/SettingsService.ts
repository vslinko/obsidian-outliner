export interface ObsidianOutlinerPluginSettings {
  styleLists: boolean;
  debug: boolean;
  stickCursor: boolean;
  betterEnter: boolean;
  betterTab: boolean;
  selectAll: boolean;
  listLines: boolean;
}

const DEFAULT_SETTINGS: ObsidianOutlinerPluginSettings = {
  styleLists: false,
  debug: false,
  stickCursor: true,
  betterEnter: true,
  betterTab: true,
  selectAll: true,
  listLines: false,
};

export interface Storage {
  loadData(): Promise<ObsidianOutlinerPluginSettings>;
  saveData(settigns: ObsidianOutlinerPluginSettings): Promise<void>;
}

type K = keyof ObsidianOutlinerPluginSettings;
type V<T extends K> = ObsidianOutlinerPluginSettings[T];
type Callback<T extends K> = (cb: V<T>) => void;

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
      this.set(k, v);
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
