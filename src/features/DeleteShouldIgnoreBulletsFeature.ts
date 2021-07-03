import { Platform, Plugin_2 } from "obsidian";
import { IFeature } from "./IFeature";
import { ListsService } from "../services/ListsService";
import { DeleteAndMergeWithNextLineOperation } from "../operations/DeleteAndMergeWithNextLineOperation";
import { DeleteAndMergeWithPreviousLineOperation } from "../operations/DeleteAndMergeWithPreviousLineOperation";
import { DeleteTillLineStartOperation } from "../operations/DeleteTillLineStartOperation";
import { SettingsService } from "../services/SettingsService";
import { IMEService } from "src/services/IMEService";

function isBackspace(e: KeyboardEvent) {
  return (
    (e.keyCode === 8 || e.code === "Backspace") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

function isCmdBackspace(e: KeyboardEvent) {
  return (
    (e.keyCode === 8 || e.code === "Backspace") &&
    e.shiftKey === false &&
    e.metaKey === true &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

function isDelete(e: KeyboardEvent) {
  return (
    (e.keyCode === 46 || e.code === "Delete") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class DeleteShouldIgnoreBulletsFeature implements IFeature {
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

    if (isBackspace(event)) {
      const { shouldStopPropagation } = this.listsService.performOperation(
        (root) => new DeleteAndMergeWithPreviousLineOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    if (Platform.isMacOS && isCmdBackspace(event)) {
      const { shouldStopPropagation } = this.listsService.performOperation(
        (root) => new DeleteTillLineStartOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    if (isDelete(event)) {
      const { shouldStopPropagation } = this.listsService.performOperation(
        (root) => new DeleteAndMergeWithNextLineOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
}
