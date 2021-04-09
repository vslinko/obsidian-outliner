import { MarkdownView, Plugin } from "obsidian";
import { ObsidianOutlinerPluginSettingTab, Settings } from "./settings";
import { IFeature } from "./feature";
import { ObsidianUtils } from "./obsidian_utils";
import { EditorUtils } from "./editor_utils";
import { ListUtils } from "./list_utils";
import { Root } from "./root";
import { Logger } from "./logger";
import { ListsStylesFeature } from "./features/lists_styles";
import { SmartEnterFeature } from "./features/smart_enter";

class ZoomState {
  constructor(public line: CodeMirror.LineHandle, public header: HTMLElement) {}
}

export default class ObsidianOutlinerPlugin extends Plugin {
  private features: IFeature[];
  private settings: Settings;
  private logger: Logger;
  private obsidianUtils: ObsidianUtils;
  private editorUtils: EditorUtils;
  private listsUtils: ListUtils;
  private zoomStates: WeakMap<CodeMirror.Editor, ZoomState> = new WeakMap();

  iterateWhileFolded(
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

  evalEnsureCursorInContent(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();
    const indentSign = this.listsUtils.detectListIndentSign(editor, cursor);

    if (indentSign === null) {
      return;
    }

    process.nextTick(() => {
      const cursor = editor.getCursor();
      const lineStartCursor = editor.coordsChar({
        ...editor.cursorCoords(),
        left: 0,
      });

      if (lineStartCursor.line !== cursor.line) {
        editor.setCursor({
          line: lineStartCursor.line,
          ch: editor.getLine(lineStartCursor.line).length,
        });
      }
    });

    const line = editor.getLine(cursor.line);
    const linePrefix = this.listsUtils.getListLineInfo(line, indentSign)
      .prefixLength;

    if (cursor.ch < linePrefix) {
      cursor.ch = linePrefix;
      editor.setCursor(cursor);
    }
  }

  execute(editor: CodeMirror.Editor, cb: (root: Root) => boolean): boolean {
    const root = this.listsUtils.parseList(editor, editor.getCursor());

    if (!root) {
      return false;
    }

    const result = cb(root);

    if (result) {
      this.listsUtils.applyChanges(editor, root);
    }

    return result;
  }

  isCursorInList(editor: CodeMirror.Editor) {
    const indentSign = this.listsUtils.detectListIndentSign(
      editor,
      editor.getCursor()
    );

    return indentSign !== null;
  }

  moveListElementDown(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveDown());
  }

  moveListElementUp(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveUp());
  }

  moveListElementRight(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveRight());
  }

  moveListElementLeft(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveLeft());
  }

  delete(editor: CodeMirror.Editor) {
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
      editor.replaceRange("", root.getStart(), root.getEnd());
      return true;
    }

    const res = root.delete();

    if (res) {
      this.listsUtils.applyChanges(editor, root);
    }

    return res;
  }

  deleteNext(editor: CodeMirror.Editor) {
    if (!this.editorUtils.containsSingleCursor(editor)) {
      return false;
    }

    const root = this.listsUtils.parseList(editor);

    if (!root) {
      return false;
    }

    const list = root.getCursorOnList();
    const nextLineNo = root.getCursor().line + 1;
    const nextList = root.getListUnderLine(nextLineNo);

    if (!nextList || root.getCursor().ch !== list.getContentEndCh()) {
      return false;
    }

    root.replaceCursor({
      line: nextLineNo,
      ch: nextList.getContentStartCh(),
    });

    const res = root.delete();
    const reallyChanged = root.getCursor().line !== nextLineNo;

    if (reallyChanged) {
      this.listsUtils.applyChanges(editor, root);
    }

    return res;
  }

  setFold(editor: CodeMirror.Editor, type: "fold" | "unfold") {
    if (!this.isCursorInList(editor)) {
      return false;
    }

    (editor as any).foldCode(editor.getCursor(), null, type);

    return true;
  }

  fold(editor: CodeMirror.Editor) {
    return this.setFold(editor, "fold");
  }

  unfold(editor: CodeMirror.Editor) {
    return this.setFold(editor, "unfold");
  }

  zoomOut(editor: CodeMirror.Editor) {
    const zoomState = this.zoomStates.get(editor);

    if (!zoomState) {
      return false;
    }

    for (let i = editor.firstLine(), l = editor.lastLine(); i <= l; i++) {
      editor.removeLineClass(i, "wrap", "outliner-plugin-hidden-row");
    }

    zoomState.header.parentElement.removeChild(zoomState.header);

    this.zoomStates.delete(editor);

    return true;
  }

  zoomIn(
    editor: CodeMirror.Editor,
    cursor: CodeMirror.Position = editor.getCursor()
  ) {
    const lineNo = cursor.line;
    const root = this.listsUtils.parseList(editor, cursor);

    if (!root) {
      return false;
    }

    this.zoomOut(editor);

    const { indentLevel } = this.listsUtils.getListLineInfo(
      editor.getLine(lineNo),
      root.getIndentSign()
    );

    let after = false;
    for (let i = editor.firstLine(), l = editor.lastLine(); i <= l; i++) {
      if (i < lineNo) {
        editor.addLineClass(i, "wrap", "outliner-plugin-hidden-row");
      } else if (i > lineNo && !after) {
        const afterLineInfo = this.listsUtils.getListLineInfo(
          editor.getLine(i),
          root.getIndentSign()
        );
        after = !afterLineInfo || afterLineInfo.indentLevel <= indentLevel;
      }

      if (after) {
        editor.addLineClass(i, "wrap", "outliner-plugin-hidden-row");
      }
    }

    const createSeparator = () => {
      const span = document.createElement("span");
      span.textContent = " > ";
      return span;
    };

    const createTitle = (content: string, cb: () => void) => {
      const a = document.createElement("a");
      a.className = "outliner-plugin-zoom-title";
      if (content) {
        a.textContent = content;
      } else {
        a.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
      }
      a.onclick = (e) => {
        e.preventDefault();
        cb();
      };
      return a;
    };

    const createHeader = () => {
      const div = document.createElement("div");
      div.className = "outliner-plugin-zoom-header";

      let list = root.getListUnderLine(lineNo).getParent();
      while (list && list.getParent()) {
        const lineNo = root.getLineNumber(list);
        div.prepend(
          createTitle(list.getContent(), () =>
            this.zoomIn(editor, { line: lineNo, ch: 0 })
          )
        );
        div.prepend(createSeparator());
        list = list.getParent();
      }

      div.prepend(
        createTitle(this.app.workspace.activeLeaf.getDisplayText(), () =>
          this.zoomOut(editor)
        )
      );

      return div;
    };

    const zoomHeader = createHeader();
    editor.getWrapperElement().prepend(zoomHeader);

    this.zoomStates.set(
      editor,
      new ZoomState(editor.getLineHandle(lineNo), zoomHeader)
    );

    return true;
  }

  selectAll(editor: CodeMirror.Editor) {
    const selections = editor.listSelections();

    if (selections.length !== 1) {
      return false;
    }

    const selection = selections[0];

    if (selection.anchor.line !== selection.head.line) {
      return false;
    }

    const root = this.listsUtils.parseList(editor, selection.anchor);

    if (!root) {
      return false;
    }

    const list = root.getCursorOnList();
    const startCh = list.getContentStartCh();
    const endCh = list.getContentEndCh();

    if (selection.from().ch === startCh && selection.to().ch === endCh) {
      // select all list
      editor.setSelection(root.getStart(), root.getEnd());
    } else {
      // select all line
      editor.setSelection(
        {
          line: selection.anchor.line,
          ch: startCh,
        },
        {
          line: selection.anchor.line,
          ch: endCh,
        }
      );
    }

    return true;
  }

  createCommandCallback(cb: (editor: CodeMirror.Editor) => boolean) {
    return () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);

      if (!view) {
        return;
      }

      const editor = view.sourceMode.cmEditor;

      const worked = cb(editor);

      if (!worked && window.event && window.event.type === "keydown") {
        (editor as any).triggerOnKeyDown(window.event);
      }
    };
  }

  async onload() {
    console.log(`Loading obsidian-outliner`);

    this.settings = new Settings(this);
    await this.settings.load();

    this.logger = new Logger(this.settings);

    this.obsidianUtils = new ObsidianUtils(this.app);
    this.editorUtils = new EditorUtils();
    this.listsUtils = new ListUtils(this.logger, this.obsidianUtils);

    this.addSettingTab(
      new ObsidianOutlinerPluginSettingTab(this.app, this, this.settings)
    );

    this.features = [
      new ListsStylesFeature(this, this.settings, this.obsidianUtils),
      new SmartEnterFeature(
        this,
        this.settings,
        this.editorUtils,
        this.listsUtils
      ),
    ];

    for (const feature of this.features) {
      await feature.load();
    }

    this.addCommand({
      id: "move-list-item-up",
      name: "Move list item up",
      callback: this.createCommandCallback(this.moveListElementUp.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "ArrowUp",
        },
      ],
    });

    this.addCommand({
      id: "move-list-item-down",
      name: "Move list item down",
      callback: this.createCommandCallback(this.moveListElementDown.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "ArrowDown",
        },
      ],
    });

    this.addCommand({
      id: "indent-list",
      name: "Indent list",
      callback: this.createCommandCallback(
        this.moveListElementRight.bind(this)
      ),
      hotkeys: [
        {
          modifiers: [],
          key: "Tab",
        },
      ],
    });

    this.addCommand({
      id: "select-all",
      name: "Select list item or whole list",
      callback: this.createCommandCallback(this.selectAll.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "a",
        },
      ],
    });

    this.addCommand({
      id: "fold",
      name: "Fold list",
      callback: this.createCommandCallback(this.fold.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowUp",
        },
      ],
    });

    this.addCommand({
      id: "unfold",
      name: "Unfold list",
      callback: this.createCommandCallback(this.unfold.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowDown",
        },
      ],
    });

    this.addCommand({
      id: "outdent-list",
      name: "Outdent list",
      callback: this.createCommandCallback(this.moveListElementLeft.bind(this)),
      hotkeys: [
        {
          modifiers: ["Shift"],
          key: "Tab",
        },
      ],
    });

    this.addCommand({
      id: "zoom-in",
      name: "Zoom In",
      callback: this.createCommandCallback(this.zoomIn.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: ".",
        },
      ],
    });

    this.addCommand({
      id: "zoom-out",
      name: "Zoom Out",
      callback: this.createCommandCallback(this.zoomOut.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: ".",
        },
      ],
    });

    this.registerCodeMirror((cm) => {
      this.attachZoomModeHandlers(cm);
      this.attachSmartCursorHandlers(cm);
      this.attachSmartDeleteHandlers(cm);
      this.attachSmartSelectionHandlers(cm);
    });
  }

  attachZoomModeHandlers(cm: CodeMirror.Editor) {
    cm.on("beforeChange", (cm, changeObj) => {
      const zoomState = this.zoomStates.get(cm);

      if (
        !zoomState ||
        changeObj.origin !== "setValue" ||
        changeObj.from.line !== 0 ||
        changeObj.from.ch !== 0
      ) {
        return;
      }

      const tillLine = cm.lastLine();
      const tillCh = cm.getLine(tillLine).length;

      if (changeObj.to.line !== tillLine || changeObj.to.ch !== tillCh) {
        return;
      }

      this.zoomOut(cm);
    });

    cm.on("change", (cm, changeObj) => {
      const zoomState = this.zoomStates.get(cm);

      if (!zoomState || changeObj.origin !== "setValue") {
        return;
      }

      this.zoomIn(cm, {
        line: cm.getLineNumber(zoomState.line),
        ch: 0,
      });
    });

    cm.on("beforeSelectionChange", (cm, changeObj) => {
      if (!this.zoomStates.has(cm)) {
        return;
      }

      let visibleFrom: CodeMirror.Position | null = null;
      let visibleTill: CodeMirror.Position | null = null;

      for (let i = cm.firstLine(); i <= cm.lastLine(); i++) {
        const wrapClass = cm.lineInfo(i).wrapClass || "";
        const isHidden = wrapClass.includes("outliner-plugin-hidden-row");
        if (visibleFrom === null && !isHidden) {
          visibleFrom = { line: i, ch: 0 };
        }
        if (visibleFrom !== null && visibleTill !== null && isHidden) {
          break;
        }
        if (visibleFrom !== null) {
          visibleTill = { line: i, ch: cm.getLine(i).length };
        }
      }

      let changed = false;

      for (const range of changeObj.ranges) {
        if (range.anchor.line < visibleFrom.line) {
          changed = true;
          range.anchor.line = visibleFrom.line;
          range.anchor.ch = visibleFrom.ch;
        }
        if (range.anchor.line > visibleTill.line) {
          changed = true;
          range.anchor.line = visibleTill.line;
          range.anchor.ch = visibleTill.ch;
        }
        if (range.head.line < visibleFrom.line) {
          changed = true;
          range.head.line = visibleFrom.line;
          range.head.ch = visibleFrom.ch;
        }
        if (range.head.line > visibleTill.line) {
          changed = true;
          range.head.line = visibleTill.line;
          range.head.ch = visibleTill.ch;
        }
      }

      if (changed) {
        changeObj.update(changeObj.ranges);
      }
    });
  }

  getMetaKey() {
    return process.platform === "darwin" ? "cmd" : "ctrl";
  }

  attachSmartDeleteHandlers(cm: CodeMirror.Editor) {
    cm.on("beforeChange", (cm, changeObj) => {
      if (changeObj.origin !== "+delete" || !this.settings.smartDelete) {
        return;
      }

      const root = this.listsUtils.parseList(cm);

      if (!root) {
        return;
      }

      const list = root.getCursorOnList();
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
        this.delete(cm);
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
        this.deleteNext(cm);
      }
    });
  }

  attachSmartSelectionHandlers(cm: CodeMirror.Editor) {
    cm.on("beforeSelectionChange", (cm, changeObj) => {
      if (
        !this.settings.smartSelection ||
        changeObj.origin !== "+move" ||
        changeObj.ranges.length > 1
      ) {
        return;
      }

      const range = changeObj.ranges[0];

      if (
        range.anchor.line !== range.head.line ||
        range.anchor.ch === range.head.ch
      ) {
        return;
      }

      const root = this.listsUtils.parseList(cm);

      if (!root) {
        return;
      }

      const list = root.getCursorOnList();
      const listContentStartCh = list.getContentStartCh();

      if (range.from().ch < listContentStartCh) {
        range.from().ch = listContentStartCh;
        changeObj.update([range]);
      }
    });
  }

  attachSmartCursorHandlers(cm: CodeMirror.Editor) {
    cm.on("beforeSelectionChange", (cm, changeObj) => {
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

      const list = root.getCursorOnList();
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
    });

    cm.on("cursorActivity", (cm) => {
      if (
        this.settings.smartCursor &&
        this.editorUtils.containsSingleCursor(cm) &&
        this.isCursorInList(cm)
      ) {
        this.evalEnsureCursorInContent(cm);
      }
    });
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    for (const feature of this.features) {
      await feature.unload();
    }
  }
}
