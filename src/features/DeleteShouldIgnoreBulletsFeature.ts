import { Platform, Plugin_2 } from "obsidian";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { DeleteAndMergeWithNextLineOperation } from "src/root/DeleteAndMergeWithNextLineOperation";
import { DeleteAndMergeWithPreviousLineOperation } from "src/root/DeleteAndMergeWithPreviousLineOperation";
import { DeleteTillLineStartOperation } from "src/root/DeleteTillLineStartOperation";
import { Settings } from "src/settings";

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

    if (isBackspace(event)) {
      const { shouldStopPropagation } = this.listsUtils.performOperation(
        (root) => new DeleteAndMergeWithPreviousLineOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    if (Platform.isMacOS && isCmdBackspace(event)) {
      const { shouldStopPropagation } = this.listsUtils.performOperation(
        (root) => new DeleteTillLineStartOperation(root),
        cm
      );

      if (shouldStopPropagation) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    if (isDelete(event)) {
      const { shouldStopPropagation } = this.listsUtils.performOperation(
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
