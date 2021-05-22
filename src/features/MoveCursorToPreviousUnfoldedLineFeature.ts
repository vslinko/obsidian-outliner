import { Platform, Plugin_2 } from "obsidian";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { MoveCursorToPreviousUnfoldedLineOperation } from "src/root/MoveCursorToPreviousUnfoldedLineOperation";
import { Settings } from "src/settings";

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
    private settings: Settings,
    private listsUtils: ListUtils
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

  onKeyDown = (cm: CodeMirror.Editor, event: KeyboardEvent) => {
    if (!this.settings.stickCursor) {
      return;
    }

    if (isArrowLeft(event) || (!Platform.isMacOS && isCtrlArrowLeft(event))) {
      const { shouldStopPropagation } = this.listsUtils.performOperation(
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
