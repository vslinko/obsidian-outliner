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

  private iterateWhileFolded(
    editor: CodeMirror.Editor,
    pos: CodeMirror.Position,
    inc: (pos: CodeMirror.Position) => void
  ) {
    let folded = false;
    do {
      inc(pos);
      folded = (editor as any).isFolded(pos);
    } while (folded);
    return pos;
  }

  private handleBeforeSelectionChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorSelectionChange
  ) => {
    if (
      !this.settings.smartCursor ||
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

    if (
      cursor.ch === listContentStartCh &&
      range.anchor.ch === listContentStartCh - 1
    ) {
      const newCursor = this.iterateWhileFolded(
        cm,
        {
          line: cursor.line,
          ch: 0,
        },
        (pos) => {
          pos.line--;
          pos.ch = cm.getLine(pos.line).length - 1;
        }
      );
      newCursor.ch++;
      range.anchor.line = newCursor.line;
      range.anchor.ch = newCursor.ch;
      range.head.line = newCursor.line;
      range.head.ch = newCursor.ch;
      changeObj.update([range]);
    }
  };
}
