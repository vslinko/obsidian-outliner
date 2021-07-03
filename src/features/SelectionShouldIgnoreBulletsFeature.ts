import { Platform, Plugin_2 } from "obsidian";
import { ListsService } from "../services/ListsService";
import { SelectTillLineStartOperation } from "../operations/SelectTillLineStartOperation";
import { IFeature } from "./IFeature";
import { SettingsService } from "../services/SettingsService";
import { IMEService } from "src/services/IMEService";

function isCmdShiftLeft(e: KeyboardEvent) {
  return (
    (e.keyCode === 37 || e.code === "ArrowLeft") &&
    e.shiftKey === true &&
    e.metaKey === true &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class SelectionShouldIgnoreBulletsFeature implements IFeature {
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
    if (!this.settingsService.stickCursor || this.imeService.isIMEOpened()) {
      return;
    }

    if (Platform.isMacOS && isCmdShiftLeft(event)) {
      const { shouldStopPropagation } = this.listsService.performOperation(
        (root) => new SelectTillLineStartOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
}
