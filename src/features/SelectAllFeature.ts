import { Platform, Plugin_2 } from "obsidian";
import { ListsService } from "../services/ListsService";
import { SelectAllOperation } from "../operations/SelectAllOperation";
import { SettingsService } from "../services/SettingsService";
import { IFeature } from "./IFeature";
import { IMEService } from "src/services/IMEService";

function isCmdA(e: KeyboardEvent) {
  return (
    (e.keyCode === 65 || e.code === "KeyA") &&
    e.shiftKey === false &&
    e.metaKey === true &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

function isCtrlA(e: KeyboardEvent) {
  return (
    (e.keyCode === 65 || e.code === "KeyA") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === true
  );
}

function isSelectAll(e: KeyboardEvent) {
  return Platform.isMacOS ? isCmdA(e) : isCtrlA(e);
}

export class SelectAllFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private listsService: ListsService,
    private imeService: IMEService
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("keydown", this.onKeyDown);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("keydown", this.onKeyDown);
    });
  }

  private onKeyDown = (cm: CodeMirror.Editor, event: KeyboardEvent) => {
    if (
      !this.settingsService.selectAll ||
      !isSelectAll(event) ||
      this.imeService.isIMEOpened()
    ) {
      return;
    }

    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) => new SelectAllOperation(root),
      cm
    );

    if (shouldStopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
}
