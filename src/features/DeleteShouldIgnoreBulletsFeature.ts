import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { DeleteAndMergeWithNextLineOperation } from "src/root/DeleteAndMergeWithNextLineOperation";
import { DeleteAndMergeWithPreviousLineOperation } from "src/root/DeleteAndMergeWithPreviousLineOperation";
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
    private editorUtils: EditorUtils,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("beforeChange", this.handleBeforeChange);
      cm.on("keydown", this.onKeyDown);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("keydown", this.onKeyDown);
      cm.off("beforeChange", this.handleBeforeChange);
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
    const contentStart = list.getFirstLineContentStart();

    if (
      !this.isBackspaceOnContentStart(changeObj, contentStart) &&
      this.isDeletionIncludesBullet(changeObj, contentStart)
    ) {
      this.limitDeleteRangeToContentRange(changeObj, contentStart.ch);
    }
  };

  private isDeletionIncludesBullet(
    changeObj: CodeMirror.EditorChangeCancellable,
    contentStart: CodeMirror.Position
  ) {
    return (
      changeObj.from.line === changeObj.to.line &&
      changeObj.from.line === contentStart.line &&
      changeObj.from.ch < contentStart.ch
    );
  }

  private isBackspaceOnContentStart(
    changeObj: CodeMirror.EditorChangeCancellable,
    contentStart: CodeMirror.Position
  ) {
    return (
      changeObj.from.line === changeObj.to.line &&
      changeObj.from.line === contentStart.line &&
      changeObj.from.ch === contentStart.ch - 1 &&
      changeObj.to.ch === contentStart.ch
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
}
