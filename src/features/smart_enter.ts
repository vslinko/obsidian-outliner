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

export class SmartEnterFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private editorUtils: EditorUtils,
    private listUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("keydown", this.onKeyDown);
      cm.on("beforeChange", this.onBeforeChange);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeChange", this.onBeforeChange);
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

    const list = root.getCursorOnList();

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

  private onBeforeChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => {
    if (!this.settings.smartEnter) {
      return;
    }

    const { listUtils } = this;

    const currentLine = cm.getLine(changeObj.from.line);
    const nextLine = cm.getLine(changeObj.from.line + 1);

    if (!currentLine || !nextLine) {
      return;
    }

    const indentSign = listUtils.detectListIndentSign(cm, changeObj.from);

    if (indentSign === null) {
      return;
    }

    const currentLineInfo = listUtils.getListLineInfo(currentLine, indentSign);
    const nextLineInfo = listUtils.getListLineInfo(nextLine, indentSign);

    if (!currentLineInfo || !nextLineInfo) {
      return;
    }

    const changeIsNewline =
      changeObj.text.length === 2 &&
      changeObj.text[0] === "" &&
      !!listUtils.getListLineInfo(changeObj.text[1], indentSign);

    const nexlineLevelIsBigger =
      currentLineInfo.indentLevel + 1 == nextLineInfo.indentLevel;

    const nextLineIsEmpty =
      cm.getRange(changeObj.from, {
        line: changeObj.from.line,
        ch: changeObj.from.ch + 1,
      }).length === 0;

    if (changeIsNewline && nexlineLevelIsBigger && nextLineIsEmpty) {
      changeObj.text[1] = indentSign + changeObj.text[1];
      changeObj.update(changeObj.from, changeObj.to, changeObj.text);
    }
  };
}
