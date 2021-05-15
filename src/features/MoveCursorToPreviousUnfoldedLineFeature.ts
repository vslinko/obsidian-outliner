import { Plugin_2 } from "obsidian";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { Settings } from "src/settings";

export class MoveCursorToPreviousUnfoldedLineFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("beforeSelectionChange", this.handleBeforeSelectionChange);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeSelectionChange", this.handleBeforeSelectionChange);
    });
  }

  private handleBeforeSelectionChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorSelectionChange
  ) => {
    if (
      !this.settings.stickCursor ||
      changeObj.origin !== "+move" ||
      changeObj.ranges.length > 1
    ) {
      return;
    }

    const range = changeObj.ranges[0];
    const cursor = cm.getCursor();

    if (
      range.anchor.line !== range.head.line ||
      range.anchor.ch !== range.head.ch
    ) {
      return;
    }

    if (cursor.line <= 0 || cursor.line !== range.anchor.line) {
      return;
    }

    const root = this.listsUtils.parseList(cm);

    if (!root) {
      return;
    }

    const list = root.getListUnderCursor();
    const listContentStartCh = list.getContentStartCh();
    const listStartLine = root.getContentLinesRangeOf(list)[0];

    if (
      cursor.line === listStartLine &&
      cursor.ch === listContentStartCh &&
      range.anchor.ch === listContentStartCh - 1
    ) {
      let newCursor = {
        line: cursor.line - 1,
        ch: cm.getLine(cursor.line - 1).length,
      };

      const foldMark = cm
        .findMarksAt(newCursor)
        .find((m) => (m as any).__isFold);

      if (foldMark) {
        const firstFoldingLine: CodeMirror.LineHandle = (foldMark as any)
          .lines[0];

        if (firstFoldingLine) {
          const firstFoldingLineNo = cm.getLineNumber(firstFoldingLine);

          newCursor = {
            line: firstFoldingLineNo,
            ch: cm.getLine(firstFoldingLineNo).length,
          };
        }
      }

      range.anchor.line = newCursor.line;
      range.anchor.ch = newCursor.ch;
      range.head.line = newCursor.line;
      range.head.ch = newCursor.ch;
      changeObj.update([range]);
    }
  };
}
