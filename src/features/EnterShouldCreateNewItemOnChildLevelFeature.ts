import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "../feature";
import { ListUtils } from "../list_utils";
import { Settings } from "../settings";

function isEnter(e: KeyboardEvent) {
  return (
    (e.keyCode === 13 || e.code === "Enter") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class EnterShouldCreateNewItemOnChildLevelFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private editorUtils: EditorUtils,
    private listUtils: ListUtils
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

  private onKeyDown = (cm: CodeMirror.Editor, e: KeyboardEvent) => {
    if (
      !this.settings.betterEnter ||
      !isEnter(e) ||
      !this.editorUtils.containsSingleCursor(cm)
    ) {
      return;
    }

    const root = this.listUtils.parseList(cm);

    if (!root) {
      return;
    }

    const worked = root.enter();

    if (worked) {
      e.preventDefault();
      e.stopPropagation();
      this.listUtils.applyChanges(cm, root);
    }
  };
}
