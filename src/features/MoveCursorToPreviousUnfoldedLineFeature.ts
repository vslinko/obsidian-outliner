import { Platform, Plugin_2 } from "obsidian";
import { IFeature } from "./IFeature";
import { ListsService } from "../services/ListsService";
import { MoveCursorToPreviousUnfoldedLineOperation } from "../operations/MoveCursorToPreviousUnfoldedLineOperation";
import { SettingsService } from "../services/SettingsService";

function isArrowLeft(e: KeyboardEvent) {
  return (
    (e.keyCode === 37 || e.code === "ArrowLeft") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

function isCtrlArrowLeft(e: KeyboardEvent) {
  return (
    (e.keyCode === 37 || e.code === "ArrowLeft") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === true
  );
}

export class MoveCursorToPreviousUnfoldedLineFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private listsService: ListsService
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
    if (!this.settingsService.stickCursor) {
      return;
    }

    if (isArrowLeft(event) || (!Platform.isMacOS && isCtrlArrowLeft(event))) {
      const { shouldStopPropagation } = this.listsService.performOperation(
        (root) => new MoveCursorToPreviousUnfoldedLineOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
}
