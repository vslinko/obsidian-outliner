export type VerticalLinesAction = "none" | "zoom-in" | "toggle-folding";
export type KeepCursorWithinContent =
  | "never"
  | "bullet-only"
  | "bullet-and-checkbox";

interface SettingsObject {
  styleLists: boolean;
  debug: boolean;
  stickCursor: KeepCursorWithinContent | boolean;
  betterEnter: boolean;
  betterVimO: boolean;
  betterTab: boolean;
  selectAll: boolean;
  listLines: boolean;
  listLineAction: VerticalLinesAction;
  dnd: boolean;
  previousRelease: string | null;
}

const DEFAULT_SETTINGS: SettingsObject = {
  styleLists: true,
  debug: false,
  stickCursor: "bullet-and-checkbox",
  betterEnter: true,
  betterVimO: true,
  betterTab: true,
  selectAll: true,
  listLines: false,
  listLineAction: "toggle-folding",
  dnd: true,
  previousRelease: null,
};

export interface Storage {
  loadData(): Promise<SettingsObject>;
  saveData(settings: SettingsObject): Promise<void>;
}

type Callback = () => void;

export class Settings {
  private storage: Storage;
  private values: SettingsObject;
  private callbacks: Set<Callback>;

  constructor(storage: Storage) {
    this.storage = storage;
    this.callbacks = new Set();
  }

  get keepCursorWithinContent() {
    // Adaptor for users migrating from older version of the plugin.
    if (this.values.stickCursor === true) {
      return "bullet-and-checkbox";
    } else if (this.values.stickCursor === false) {
      return "never";
    }

    return this.values.stickCursor;
  }

  set keepCursorWithinContent(value: KeepCursorWithinContent) {
    this.set("stickCursor", value);
  }

  get overrideTabBehaviour() {
    return this.values.betterTab;
  }

  set overrideTabBehaviour(value: boolean) {
    this.set("betterTab", value);
  }

  get overrideEnterBehaviour() {
    return this.values.betterEnter;
  }

  set overrideEnterBehaviour(value: boolean) {
    this.set("betterEnter", value);
  }

  get overrideVimOBehaviour() {
    return this.values.betterVimO;
  }

  set overrideVimOBehaviour(value: boolean) {
    this.set("betterVimO", value);
  }

  get overrideSelectAllBehaviour() {
    return this.values.selectAll;
  }

  set overrideSelectAllBehaviour(value: boolean) {
    this.set("selectAll", value);
  }

  get betterListsStyles() {
    return this.values.styleLists;
  }

  set betterListsStyles(value: boolean) {
    this.set("styleLists", value);
  }

  get verticalLines() {
    return this.values.listLines;
  }

  set verticalLines(value: boolean) {
    this.set("listLines", value);
  }

  get verticalLinesAction() {
    return this.values.listLineAction;
  }

  set verticalLinesAction(value: VerticalLinesAction) {
    this.set("listLineAction", value);
  }

  get dragAndDrop() {
    return this.values.dnd;
  }

  set dragAndDrop(value: boolean) {
    this.set("dnd", value);
  }

  get debug() {
    return this.values.debug;
  }

  set debug(value: boolean) {
    this.set("debug", value);
  }

  get previousRelease() {
    return this.values.previousRelease;
  }

  set previousRelease(value: string | null) {
    this.set("previousRelease", value);
  }

  onChange(cb: Callback) {
    this.callbacks.add(cb);
  }

  removeCallback(cb: Callback): void {
    this.callbacks.delete(cb);
  }

  reset() {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      this.set(k as keyof SettingsObject, v);
    }
  }

  async load() {
    this.values = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.storage.loadData(),
    );
  }

  async save() {
    await this.storage.saveData(this.values);
  }

  getValues(): SettingsObject {
    return { ...this.values };
  }

  private set<T extends keyof SettingsObject>(
    key: T,
    value: SettingsObject[T],
  ): void {
    this.values[key] = value;

    for (const cb of this.callbacks) {
      cb();
    }
  }
}
