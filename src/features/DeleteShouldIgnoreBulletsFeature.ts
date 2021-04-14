import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { Root } from "src/root";
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
    if (
      changeObj.origin !== "+delete" ||
      !this.settings.stickCursor ||
      !this.editorUtils.containsSingleCursor(cm)
    ) {
      return;
    }

    const root = this.listsUtils.parseList(cm);

    if (!root) {
      return;
    }

    const list = root.getListUnderCursor();
    const listContentStartCh = list.getContentStartCh();
    const listContentEndCh = list.getContentEndCh();

    if (this.isBackspaceOnContentStart(changeObj, listContentStartCh)) {
      this.deleteItemAndMergeContentWithPreviousLine(cm, root, changeObj);
    } else if (this.isDeletionIncludesBullet(changeObj, listContentStartCh)) {
      this.limitDeleteRangeToContentRange(changeObj, listContentStartCh);
    } else if (this.isDeleteOnLineEnd(changeObj, listContentEndCh)) {
      this.deleteNextItemAndMergeContentWithCurrentLine(cm, root, changeObj);
    }
  };

  private isDeleteOnLineEnd(
    changeObj: CodeMirror.EditorChangeCancellable,
    listContentEndCh: number
  ) {
    return (
      changeObj.from.line + 1 === changeObj.to.line &&
      changeObj.from.ch === listContentEndCh &&
      changeObj.to.ch === 0
    );
  }

  private isDeletionIncludesBullet(
    changeObj: CodeMirror.EditorChangeCancellable,
    listContentStartCh: number
  ) {
    return (
      changeObj.from.line === changeObj.to.line &&
      changeObj.from.ch < listContentStartCh
    );
  }

  private isBackspaceOnContentStart(
    changeObj: CodeMirror.EditorChangeCancellable,
    listContentStartCh: number
  ) {
    return (
      changeObj.from.line === changeObj.to.line &&
      changeObj.from.ch === listContentStartCh - 1 &&
      changeObj.to.ch === listContentStartCh
    );
  }

  private limitDeleteRangeToContentRange(
    changeObj: CodeMirror.EditorChangeCancellable,
    listContentStartCh: number
  ) {
    const from = {
      line: changeObj.from.line,
      ch: listContentStartCh,
    };
    changeObj.update(from, changeObj.to, changeObj.text);
  }

  private deleteItemAndMergeContentWithPreviousLine(
    editor: CodeMirror.Editor,
    root: Root,
    changeObj: CodeMirror.EditorChangeCancellable
  ) {
    const list = root.getListUnderCursor();
    if (
      root.getListStartPosition().line === root.getLineNumberOf(list) &&
      list.getChildren().length === 0
    ) {
      return false;
    }

    const res = root.deleteAndMergeWithPrevious();

    if (res) {
      changeObj.cancel();
      this.listsUtils.applyChanges(editor, root);
    }

    return res;
  }

  private deleteNextItemAndMergeContentWithCurrentLine(
    editor: CodeMirror.Editor,
    root: Root,
    changeObj: CodeMirror.EditorChangeCancellable
  ) {
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
      changeObj.cancel();
      this.listsUtils.applyChanges(editor, root);
    }

    return res;
  }
}
