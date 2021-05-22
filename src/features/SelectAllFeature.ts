import { Platform, Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { SelectAllOperation } from "src/root/SelectAllOperation";
import { Settings } from "src/settings";
import { IFeature } from "../feature";

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
    if (!this.settings.selectAll || !isSelectAll(event)) {
      return;
    }

    const { shouldStopPropagation } = this.listsUtils.performOperation(
      (root) => new SelectAllOperation(root),
      cm
    );

    if (shouldStopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
}
