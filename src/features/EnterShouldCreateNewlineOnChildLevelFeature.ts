import { Plugin_2 } from "obsidian";
import { IFeature } from "../feature";
import { ListUtils } from "../list_utils";
import { Settings } from "../settings";

export class EnterShouldCreateNewlineOnChildLevelFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private listUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("beforeChange", this.onBeforeChange);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeChange", this.onBeforeChange);
    });
  }

  private onBeforeChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => {
    if (!this.settings.betterEnter) {
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
