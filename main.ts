import { MarkdownView, Plugin } from "obsidian";
import { diffLines } from "diff";

type Mod = "shift" | "ctrl" | "cmd" | "alt";

function rangeIsCursor(selection: CodeMirror.Range) {
  return (
    selection.anchor.line === selection.head.line &&
    selection.anchor.ch === selection.head.ch
  );
}

function testKeydown(e: KeyboardEvent, code: string, mods: Mod[] = []) {
  const shoudhShift = mods.includes("shift");
  const shoudhMeta = mods.includes("cmd");
  const shoudhAlt = mods.includes("alt");
  const shoudhCtrl = mods.includes("ctrl");

  return (
    e.code === code &&
    e.shiftKey === shoudhShift &&
    e.metaKey === shoudhMeta &&
    e.altKey === shoudhAlt &&
    e.ctrlKey === shoudhCtrl
  );
}

interface IList {
  getLevel(): number;
  getParent(): IList | null;
  add(list: IList): void;
}

class List implements IList {
  private indentSign: string;
  private bullet: string;
  private content: string;
  private children: List[];
  private parent: List;

  constructor(indentSign: string, bullet: string, content: string) {
    this.indentSign = indentSign;
    this.bullet = bullet;
    this.content = content;
    this.children = [];
    this.parent = null;
  }

  getChildren() {
    return this.children.concat();
  }

  getFullContent() {
    return (
      new Array(this.getLevel() - 1).fill(this.indentSign).join("") +
      this.bullet +
      " " +
      this.content
    );
  }

  appendContent(content: string) {
    this.content += content;
  }

  setContent(content: string) {
    this.content = content;
  }

  getContent() {
    return this.content;
  }

  isEmpty() {
    return this.children.length === 0;
  }

  getContentStartCh() {
    const indentLength = (this.getLevel() - 1) * this.indentSign.length;
    return indentLength + 2;
  }

  getContentEndCh() {
    return this.getContentStartCh() + this.content.length;
  }

  getParent() {
    return this.parent;
  }

  getPrevSibling(list: List) {
    const i = this.children.indexOf(list);
    return i > 0 ? this.children[i - 1] : null;
  }

  getNextSibling(list: List) {
    const i = this.children.indexOf(list);
    return i >= 0 && i < this.children.length ? this.children[i + 1] : null;
  }

  getLevel() {
    let level = 0;
    let ref: List = this;
    while (ref.parent) {
      ref = ref.parent;
      level++;
    }
    return level;
  }

  add(list: List) {
    this.children.push(list);
    list.parent = this;
  }

  addAtBeginning(list: List) {
    this.children.unshift(list);
    list.parent = this;
  }

  addBefore(before: List, list: List) {
    const i = this.children.indexOf(before);
    this.children.splice(i, 0, list);
    list.parent = this;
  }

  addAfter(before: List, list: List) {
    const i = this.children.indexOf(before);
    this.children.splice(i + 1, 0, list);
    list.parent = this;
  }

  remove(list: List) {
    const i = this.children.indexOf(list);
    this.children.splice(i, 1);
    list.parent = null;
  }

  print() {
    let res = this.getFullContent() + "\n";

    for (const child of this.children) {
      res += child.print();
    }

    return res;
  }
}

class Root implements IList {
  private indentSign: string;
  private rootList: List;
  private start: CodeMirror.Position;
  private end: CodeMirror.Position;
  private cursor: CodeMirror.Position;

  constructor(
    indentSign: string,
    start: CodeMirror.Position,
    end: CodeMirror.Position,
    cursor: CodeMirror.Position
  ) {
    this.indentSign = indentSign;
    this.start = start;
    this.end = end;
    this.cursor = cursor;
    this.rootList = new List("", "", "");
  }

  getIndentSign() {
    return this.indentSign;
  }

  getLevel() {
    return 0;
  }

  getParent(): List | null {
    return null;
  }

  add(list: List) {
    this.rootList.add(list);
  }

  getStart() {
    return this.start;
  }

  getEnd() {
    return this.end;
  }

  getCursor() {
    return this.cursor;
  }

  getCursorOnList(): List {
    return this.getListUnderLine(this.cursor.line);
  }

  print() {
    let res = "";

    for (const child of this.rootList.getChildren()) {
      res += child.print();
    }

    return res.replace(/\n$/, "");
  }

  getLineNumber(list: List) {
    let result: number = null;
    let line: number = 0;
    const visitArr = (ll: List[]) => {
      for (const l of ll) {
        if (l === list) {
          result = line;
        } else {
          line++;
          visitArr(l.getChildren());
        }
        if (result !== null) {
          return;
        }
      }
    };

    visitArr(this.rootList.getChildren());

    return result + this.start.line;
  }

  getListUnderLine(line: number) {
    if (line < this.start.line) {
      return;
    }

    let result: List = null;
    let index: number = 0;
    const visitArr = (ll: List[]) => {
      for (const l of ll) {
        if (index + this.start.line === line) {
          result = l;
        } else {
          index++;
          visitArr(l.getChildren());
        }
        if (result !== null) {
          return;
        }
      }
    };

    visitArr(this.rootList.getChildren());

    return result;
  }

  moveUp() {
    const list = this.getCursorOnList();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const prev = parent.getPrevSibling(list);

    if (!prev && grandParent) {
      const newParent = grandParent.getPrevSibling(parent);

      if (newParent) {
        parent.remove(list);
        newParent.add(list);
        this.cursor.line = this.getLineNumber(list);
      }
    } else if (prev) {
      parent.remove(list);
      parent.addBefore(prev, list);
      this.cursor.line = this.getLineNumber(list);
    }

    return true;
  }

  moveDown() {
    const list = this.getCursorOnList();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const next = parent.getNextSibling(list);

    if (!next && grandParent) {
      const newParent = grandParent.getNextSibling(parent);

      if (newParent) {
        parent.remove(list);
        newParent.addAtBeginning(list);
        this.cursor.line = this.getLineNumber(list);
      }
    } else if (next) {
      parent.remove(list);
      parent.addAfter(next, list);
      this.cursor.line = this.getLineNumber(list);
    }

    return true;
  }

  moveLeft() {
    const list = this.getCursorOnList();
    const parent = list.getParent();
    const grandParent = parent.getParent();

    if (!grandParent) {
      return true;
    }

    parent.remove(list);
    grandParent.addAfter(parent, list);
    this.cursor.line = this.getLineNumber(list);
    this.cursor.ch--;

    return true;
  }

  moveRight() {
    const list = this.getCursorOnList();
    const parent = list.getParent();
    const prev = parent.getPrevSibling(list);

    if (!prev) {
      return true;
    }

    parent.remove(list);
    prev.add(list);
    this.cursor.line = this.getLineNumber(list);
    this.cursor.ch++;

    return true;
  }

  delete() {
    const list = this.getCursorOnList();

    if (this.cursor.ch !== list.getContentStartCh()) {
      return false;
    }

    const prev = this.getListUnderLine(this.cursor.line - 1);

    if (!prev) {
      return true;
    }

    const bothAreEmpty = prev.isEmpty() && list.isEmpty();
    const prevIsEmptyAndSameLevel =
      prev.isEmpty() && !list.isEmpty() && prev.getLevel() == list.getLevel();
    const listIsEmptyAndPrevIsParent =
      list.isEmpty() && prev.getLevel() == list.getLevel() - 1;

    if (bothAreEmpty || prevIsEmptyAndSameLevel || listIsEmptyAndPrevIsParent) {
      const parent = list.getParent();
      const prevEndCh = prev.getContentEndCh();

      prev.appendContent(list.getContent());
      parent.remove(list);
      for (const c of list.getChildren()) {
        list.remove(c);
        prev.add(c);
      }

      this.cursor.line = this.getLineNumber(prev);
      this.cursor.ch = prevEndCh;
    }

    return true;
  }

  deleteFullLeft() {
    const list = this.getCursorOnList();
    const diff = this.cursor.ch - list.getContentStartCh();

    if (diff > 0) {
      list.setContent(list.getContent().slice(diff));
      this.cursor.ch -= diff;
    }

    return true;
  }
}

class ZoomState {
  constructor(public level: number, public header: HTMLElement) {}
}

export default class ObsidianOutlinerPlugin extends Plugin {
  private zoomStates: WeakMap<CodeMirror.Editor, ZoomState> = new WeakMap();

  detectListIndentSign(editor: CodeMirror.Editor, cursor: CodeMirror.Position) {
    const { useTab, tabSize } = (this.app.vault as any).config;
    const defaultIndentSign = useTab
      ? "\t"
      : new Array(tabSize).fill(" ").join("");

    const line = editor.getLine(cursor.line);

    const withTabsRe = /^\t+[-*] /;
    const withSpacesRe = /^[ ]+[-*] /;
    const mayBeWithSpacesRe = /^[ ]*[-*] /;

    if (withTabsRe.test(line)) {
      return "\t";
    }

    if (withSpacesRe.test(line)) {
      const spacesA = line.length - line.trimLeft().length;

      let lineNo = cursor.line - 1;
      let indentSign: string | null = null;
      while (lineNo >= editor.firstLine()) {
        const line = editor.getLine(lineNo);
        if (!mayBeWithSpacesRe.test(line)) {
          break;
        }
        const spacesB = line.length - line.trimLeft().length;
        if (spacesB < spacesA) {
          indentSign = new Array(spacesA - spacesB).fill(" ").join("");
          break;
        }

        lineNo--;
      }

      return indentSign;
    }

    if (mayBeWithSpacesRe.test(line)) {
      const spacesA = line.length - line.trimLeft().length;

      let lineNo = cursor.line + 1;
      let indentSign = defaultIndentSign;
      while (lineNo <= editor.lastLine()) {
        const line = editor.getLine(lineNo);
        if (!mayBeWithSpacesRe.test(line)) {
          break;
        }
        const spacesB = line.length - line.trimLeft().length;
        if (spacesB > spacesA) {
          indentSign = new Array(spacesB - spacesA).fill(" ").join("");
          break;
        }

        lineNo++;
      }

      return indentSign;
    }

    return null;
  }

  parseList(editor: CodeMirror.Editor, cursor = editor.getCursor()): Root {
    const cursorLine = cursor.line;
    const cursorCh = cursor.ch;
    const line = editor.getLine(cursorLine);

    const indentSign = this.detectListIndentSign(editor, cursor);

    if (indentSign === null) {
      return null;
    }

    let listStartLine = cursorLine;
    const listStartCh = 0;
    while (listStartLine >= 1) {
      const line = editor.getLine(listStartLine - 1);
      if (!this.getListLineInfo(line, indentSign)) {
        break;
      }
      listStartLine--;
    }

    let listEndLine = cursorLine;
    let listEndCh = line.length;
    while (listEndLine < editor.lineCount()) {
      const line = editor.getLine(listEndLine + 1);
      if (!this.getListLineInfo(line, indentSign)) {
        break;
      }
      listEndCh = line.length;
      listEndLine++;
    }

    const root = new Root(
      indentSign,
      { line: listStartLine, ch: listStartCh },
      { line: listEndLine, ch: listEndCh },
      { line: cursorLine, ch: cursorCh }
    );

    let currentLevel: IList = root;
    let lastList: IList = root;

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const { bullet, content, indentLevel } = this.getListLineInfo(
        line,
        indentSign
      );

      if (indentLevel === currentLevel.getLevel() + 1) {
        currentLevel = lastList;
      } else if (indentLevel < currentLevel.getLevel()) {
        while (indentLevel < currentLevel.getLevel()) {
          currentLevel = currentLevel.getParent();
        }
      } else if (indentLevel != currentLevel.getLevel()) {
        console.error(`Unable to parse list`);
        return null;
      }

      const list = new List(indentSign, bullet, content);
      currentLevel.add(list);
      lastList = list;
    }

    return root;
  }

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

  getListLineInfo(line: string, indentSign: string) {
    const prefixRe = new RegExp(`^(?:${indentSign})*([-*]) `);
    const matches = prefixRe.exec(line);

    if (!matches) {
      return null;
    }

    const prefixLength = matches[0].length;
    const bullet = matches[1];
    const content = line.slice(prefixLength);
    const indentLevel = (prefixLength - 2) / indentSign.length;

    return {
      bullet,
      content,
      prefixLength,
      indentLevel,
    };
  }

  isJustCursor(editor: CodeMirror.Editor) {
    const selections = editor.listSelections();

    return selections.length === 1 && rangeIsCursor(selections[0]);
  }

  evalEnsureCursorInContent(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();
    const indentSign = this.detectListIndentSign(editor, cursor);

    if (indentSign === null) {
      return;
    }

    const line = editor.getLine(cursor.line);
    const linePrefix = this.getListLineInfo(line, indentSign).prefixLength;

    if (cursor.ch < linePrefix) {
      cursor.ch = linePrefix;
      editor.setCursor(cursor);
    }
  }

  execute(
    editor: CodeMirror.Editor,
    cb: (root: Root) => boolean,
    options: {
      force?: boolean;
      cursor?: CodeMirror.Position;
    } | void
  ): boolean {
    const { force, cursor } = {
      force: false,
      cursor: editor.getCursor(),
      ...options,
    };

    const root = this.parseList(editor, cursor);

    if (!root) {
      return false;
    }

    const result = cb(root);

    if (force || result) {
      this.applyChanges(editor, root, { force });
    }

    return result;
  }

  applyChanges(
    editor: CodeMirror.Editor,
    root: Root,
    options: {
      force?: boolean;
      cursor?: CodeMirror.Position;
    } | void
  ) {
    const { force } = {
      force: false,
      ...options,
    };

    const oldString = editor.getRange(root.getStart(), root.getEnd());
    const newString = root.print();

    const diff = diffLines(oldString, newString);
    let l = root.getStart().line;
    for (const change of diff) {
      if (change.added) {
        editor.replaceRange(change.value, { line: l, ch: 0 });
        l += change.count;
      } else if (change.removed) {
        const withNewline = /\n$/.test(change.value);
        const tillLine = withNewline ? l + change.count : l + change.count - 1;
        const tillCh = withNewline ? 0 : editor.getLine(tillLine).length;
        editor.replaceRange(
          "",
          { line: l, ch: 0 },
          { line: tillLine, ch: tillCh }
        );
      } else {
        l += change.count;
      }
    }

    const oldCursor = editor.getCursor();
    const newCursor = root.getCursor();

    if (
      force ||
      oldCursor.line != newCursor.line ||
      oldCursor.ch != newCursor.ch
    ) {
      editor.setCursor(newCursor);
    }
  }

  isCursorInList(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();
    const indentSign = this.detectListIndentSign(editor, cursor);
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
    if (!this.isJustCursor(editor)) {
      return false;
    }

    // TODO: remove hack
    const cursor = editor.getCursor();
    const indentSign = this.detectListIndentSign(editor, cursor);
    if (indentSign === null) {
      return false;
    }
    const line = editor.getLine(cursor.line);
    if (
      cursor.line === 0 &&
      cursor.ch == 2 &&
      this.getListLineInfo(line, indentSign).indentLevel === 0
    ) {
      return false;
    }

    return this.execute(editor, (root) => root.delete());
  }

  deleteFullLeft(editor: CodeMirror.Editor) {
    const selection = editor.listSelections()[0];

    if (!rangeIsCursor(selection)) {
      editor.replaceRange("", selection.from(), selection.to());
      return true;
    }

    return this.execute(editor, (root) => root.deleteFullLeft());
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

  cursorLeft(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();
    const indentSign = this.detectListIndentSign(editor, cursor);

    if (indentSign === null) {
      return false;
    }

    const line = editor.getLine(cursor.line);
    const linePrefix = this.getListLineInfo(line, indentSign).prefixLength;

    if (cursor.ch > linePrefix) {
      return false;
    }

    const newCursor = this.iterateWhileFolded(
      editor,
      {
        line: cursor.line,
        ch: 0,
      },
      (pos) => {
        pos.line--;
        pos.ch = editor.getLine(pos.line).length - 1;
      }
    );
    newCursor.ch++;
    editor.setCursor(newCursor);

    return true;
  }

  selectFullLeft(editor: CodeMirror.Editor) {
    const cursor = editor.getCursor();
    const root = this.parseList(editor, cursor);

    if (!root) {
      return false;
    }

    const list = root.getCursorOnList();
    const startCh = list.getContentStartCh();
    const selection = editor.listSelections()[0];

    editor.setSelection(selection.anchor, {
      line: cursor.line,
      ch: startCh,
    });

    return true;
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
    const root = this.parseList(editor, cursor);

    if (!root) {
      return false;
    }

    this.zoomOut(editor);

    const { indentLevel } = this.getListLineInfo(
      editor.getLine(lineNo),
      root.getIndentSign()
    );

    let after = false;
    for (let i = editor.firstLine(), l = editor.lastLine(); i <= l; i++) {
      if (i < lineNo) {
        editor.addLineClass(i, "wrap", "outliner-plugin-hidden-row");
      } else if (i > lineNo && !after) {
        const afterLineInfo = this.getListLineInfo(
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

    this.zoomStates.set(editor, new ZoomState(indentLevel, zoomHeader));

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

    const root = this.parseList(editor, selection.anchor);

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

  handleKeydown = (cm: CodeMirror.Editor, e: KeyboardEvent) => {
    let worked = false;
    const metaKey = process.platform === "darwin" ? "cmd" : "ctrl";

    if (testKeydown(e, "Tab", ["shift"])) {
      worked = this.moveListElementLeft(cm);
    } else if (testKeydown(e, "Tab")) {
      worked = this.moveListElementRight(cm);
    } else if (testKeydown(e, "ArrowUp", ["shift", metaKey])) {
      worked = this.moveListElementUp(cm);
    } else if (testKeydown(e, "ArrowDown", ["shift", metaKey])) {
      worked = this.moveListElementDown(cm);
    } else if (testKeydown(e, "ArrowUp", [metaKey])) {
      worked = this.fold(cm);
    } else if (testKeydown(e, "ArrowDown", [metaKey])) {
      worked = this.unfold(cm);
    } else if (testKeydown(e, "ArrowLeft")) {
      worked = this.cursorLeft(cm);
    } else if (testKeydown(e, "Backspace", [metaKey])) {
      worked = this.deleteFullLeft(cm);
    } else if (testKeydown(e, "Backspace")) {
      worked = this.delete(cm);
    } else if (testKeydown(e, "ArrowLeft", [metaKey, "shift"])) {
      worked = this.selectFullLeft(cm);
    } else if (testKeydown(e, "KeyA", [metaKey])) {
      worked = this.selectAll(cm);
    }

    if (worked) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  async onload() {
    console.log(`Loading obsidian-outliner`);

    this.addCommand({
      id: "zoom-in",
      name: "Zoom In",
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!view) {
          return;
        }

        this.zoomIn(view.sourceMode.cmEditor);
      },
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
      callback: () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!view) {
          return;
        }

        this.zoomOut(view.sourceMode.cmEditor);
      },
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: ".",
        },
      ],
    });

    this.registerCodeMirror((cm) => {
      cm.on("beforeChange", (cm, changeObj) => {
        if (changeObj.origin === "setValue") {
          this.zoomOut(cm);
        }
      });

      cm.on("beforeChange", (cm, changeObj) => {
        const currentLine = cm.getLine(changeObj.from.line);
        const nextLine = cm.getLine(changeObj.from.line + 1);

        if (!currentLine || !nextLine) {
          return;
        }

        const indentSign = this.detectListIndentSign(cm, changeObj.from);

        if (indentSign === null) {
          return;
        }

        const currentLineInfo = this.getListLineInfo(currentLine, indentSign);
        const nextLineInfo = this.getListLineInfo(nextLine, indentSign);

        if (!currentLineInfo || !nextLineInfo) {
          return;
        }

        const changeIsNewline =
          changeObj.text.length === 2 &&
          changeObj.text[0] === "" &&
          !!this.getListLineInfo(changeObj.text[1], indentSign);
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
          if (visibleFrom !== null && visibleTill === null && isHidden) {
            visibleTill = { line: i - 1, ch: cm.getLine(i - 1).length };
            break;
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

      cm.on("cursorActivity", (cm) => {
        if (this.isJustCursor(cm) && this.isCursorInList(cm)) {
          this.evalEnsureCursorInContent(cm);
        }
      });

      cm.on("keydown", this.handleKeydown);
    });
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    this.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("keydown", this.handleKeydown);
    });
  }
}
