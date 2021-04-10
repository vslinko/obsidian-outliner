import { Plugin_2 } from "obsidian";
import { EditorUtils } from "../editor_utils";
import { IFeature } from "../feature";
import { ListUtils } from "../list_utils";
import { Settings } from "../settings";

function isEnter(e: KeyboardEvent) {
  return (
    e.code === "Enter" &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class EnterOutdentIfLineIsEmptyFeature implements IFeature {
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

  private outdentIfLineIsEmpty(editor: CodeMirror.Editor) {
    if (!this.editorUtils.containsSingleCursor(editor)) {
      return false;
    }

    const root = this.listUtils.parseList(editor);

    if (!root) {
      return false;
    }

    const list = root.getListUnderCursor();

    if (list.getContent().length > 0 || list.getLevel() === 1) {
      return false;
    }

    root.moveLeft();

    this.listUtils.applyChanges(editor, root);

    return true;
  }

  private onKeyDown = (cm: CodeMirror.Editor, e: KeyboardEvent) => {
    if (!this.settings.smartEnter || !isEnter(e)) {
      return;
    }

    const worked = this.outdentIfLineIsEmpty(cm);

    if (worked) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
}
