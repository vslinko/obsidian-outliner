import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { Settings } from "src/settings";

export class DeleteShouldIgnoreBulletsFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private editorUtils: EditorUtils,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("beforeChange", this.handleBeforeChange);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeChange", this.handleBeforeChange);
    });
  }

  private handleBeforeChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => {
    if (changeObj.origin !== "+delete" || !this.settings.stickCursor) {
      return;
    }

    const root = this.listsUtils.parseList(cm);

    if (!root) {
      return;
    }

    const list = root.getListUnderCursor();
    const listContentStartCh = list.getContentStartCh();
    const listContentEndCh = list.getContentEndCh();

    const sameLine = changeObj.from.line === changeObj.to.line;
    const nextLine = changeObj.from.line + 1 === changeObj.to.line;

    if (
      sameLine &&
      changeObj.from.ch === listContentStartCh - 1 &&
      changeObj.to.ch === listContentStartCh
    ) {
      changeObj.cancel();
      this.backspace(cm);
    } else if (sameLine && changeObj.from.ch < listContentStartCh) {
      const from = {
        line: changeObj.from.line,
        ch: listContentStartCh,
      };
      changeObj.update(from, changeObj.to, changeObj.text);
    } else if (
      nextLine &&
      changeObj.from.ch === listContentEndCh &&
      changeObj.to.ch === 0
    ) {
      changeObj.cancel();
      this.delete(cm);
    }
  };

  private backspace(editor: CodeMirror.Editor) {
    if (!this.editorUtils.containsSingleCursor(editor)) {
      return false;
    }

    const root = this.listsUtils.parseList(editor);

    if (!root) {
      return false;
    }

    if (
      root.getTotalLines() === 1 &&
      root.getChildren()[0].getContent().length === 0
    ) {
      editor.replaceRange(
        "",
        root.getListStartPosition(),
        root.getListEndPosition()
      );
      return true;
    }

    const res = root.deleteAndMergeWithPrevious();

    if (res) {
      this.listsUtils.applyChanges(editor, root);
    }

    return res;
  }

  private delete(editor: CodeMirror.Editor) {
    if (!this.editorUtils.containsSingleCursor(editor)) {
      return false;
    }

    const root = this.listsUtils.parseList(editor);

    if (!root) {
      return false;
    }

    const list = root.getListUnderCursor();
    const nextLineNo = root.getCursor().line + 1;
    const nextList = root.getListUnderLine(nextLineNo);

    if (!nextList || root.getCursor().ch !== list.getContentEndCh()) {
      return false;
    }

    root.replaceCursor({
      line: nextLineNo,
      ch: nextList.getContentStartCh(),
    });

    const res = root.deleteAndMergeWithPrevious();
    const reallyChanged = root.getCursor().line !== nextLineNo;

    if (reallyChanged) {
      this.listsUtils.applyChanges(editor, root);
    }

    return res;
  }
}
