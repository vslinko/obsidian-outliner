import { Platform, Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { SelectTillLineStartOperation } from "src/root/SelectTillLineStartOperation";
import { IFeature } from "../feature";
import { Settings } from "../settings";

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

  private onKeyDown = (cm: CodeMirror.Editor, event: KeyboardEvent) => {
    if (!this.settings.stickCursor) {
      return;
    }

    if (Platform.isMacOS && isCmdShiftLeft(event)) {
      const { shouldStopPropagation } = this.listsUtils.performOperation(
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
