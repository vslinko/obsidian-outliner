import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "../feature";
import { ListUtils } from "../list_utils";
import { Settings } from "../settings";

function isShiftEnter(e: KeyboardEvent) {
  return (
    (e.keyCode === 13 || e.code === "Enter") &&
    e.shiftKey === true &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class ShiftEnterShouldCreateNote implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private listsUtils: ListUtils,
    private editorUtils: EditorUtils
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
      !isShiftEnter(e) ||
      !this.editorUtils.containsSingleCursor(cm)
    ) {
      return;
    }

    const cursor = cm.getCursor();
    const root = this.listsUtils.parseList(cm, cursor);

    if (!root) {
      return;
    }

    const list = root.getListUnderCursor();
    const contentStart = list.getContentRange()[0];

    const indent =
      cursor.line === contentStart.line
        ? list.getIndent() + this.listsUtils.getDefaultIndentChars()
        : cm.getLine(cursor.line).match(/^[ \t]*/)[0];

    e.preventDefault();
    e.stopPropagation();

    cm.replaceRange(`\n${indent}`, cursor);
    cm.setCursor({
      line: cursor.line + 1,
      ch: indent.length,
    });
  };
}
