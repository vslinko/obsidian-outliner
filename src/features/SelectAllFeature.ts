import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { Settings } from "src/settings";
import { IFeature } from "../feature";

function isCmdA(e: KeyboardEvent) {
  return (
    (e.keyCode === 65 || e.code === "KeyA") &&
    e.shiftKey === false &&
    e.metaKey === true &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

function isCtrlA(e: KeyboardEvent) {
  return (
    (e.keyCode === 65 || e.code === "KeyA") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === true
  );
}

function isSelectAll(e: KeyboardEvent) {
  return process.platform === "darwin" ? isCmdA(e) : isCtrlA(e);
}

export class SelectAllFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private listsUtils: ListUtils
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

  onKeyDown = (cm: CodeMirror.Editor, event: KeyboardEvent) => {
    if (!this.settings.selectAll || !isSelectAll(event)) {
      return;
    }

    const worked = this.selectAll(cm);

    if (worked) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private selectAll(editor: CodeMirror.Editor) {
    const selections = editor.listSelections();

    if (selections.length !== 1) {
      return false;
    }

    const selection = selections[0];

    const root = this.listsUtils.parseList(editor, selection.anchor);

    if (!root) {
      return false;
    }

    const [rootStart, rootEnd] = root.getRange();

    if (
      selection.from().line < rootStart.line ||
      selection.to().line > rootEnd.line
    ) {
      return false;
    }

    if (
      selection.from().line === rootStart.line &&
      selection.from().ch === rootStart.ch &&
      selection.to().line === rootEnd.line &&
      selection.to().ch === rootEnd.ch
    ) {
      return false;
    }

    const list = root.getListUnderCursor();
    const contentStart = list.getFirstLineContentStart();
    const contentEnd = list.getLastLineContentEnd();

    if (
      selection.from().line < contentStart.line ||
      selection.to().line > contentEnd.line
    ) {
      return false;
    }

    if (
      selection.from().line === contentStart.line &&
      selection.from().ch === contentStart.ch &&
      selection.to().line === contentEnd.line &&
      selection.to().ch === contentEnd.ch
    ) {
      // select all list
      editor.setSelection(rootStart, rootEnd);
    } else {
      // select all line
      editor.setSelection(contentStart, contentEnd);
    }

    return true;
  }
}
