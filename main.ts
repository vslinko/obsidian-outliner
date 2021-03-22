import { Plugin } from "obsidian";

const LIST_LINE_TABS_RE = /^\t*/;
const LIST_LINE_PREFIX_RE = /^\t*- /;

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
  private content: string;
  private children: List[];
  private parent: List;

  constructor(content: string) {
    this.content = content;
    this.children = [];
    this.parent = null;
  }

  getChildren() {
    return this.children.concat();
  }

  getFullContent() {
    return (
      new Array(this.getTabsLength()).fill("\t").join("") + "- " + this.content
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

  getTabsLength() {
    return this.getLevel() - 1;
  }

  getContentStartCh() {
    return this.getTabsLength() + 2;
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
  private rootList: List;
  private start: CodeMirror.Position;
  private end: CodeMirror.Position;
  private cursor: CodeMirror.Position;

  constructor(
    start: CodeMirror.Position,
    end: CodeMirror.Position,
    cursor: CodeMirror.Position
  ) {
    this.start = start;
    this.end = end;
    this.cursor = cursor;
    this.rootList = new List("");
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

  enter(
    options: {
      checkEmptyContent?: boolean;
    } | void
  ) {
    const { checkEmptyContent } = {
      checkEmptyContent: true,
      ...options,
    };

    const list = this.getCursorOnList();

    if (checkEmptyContent && list.getContent() === "") {
      return false;
    }

    const diff = this.cursor.ch - list.getContentStartCh();
    const oldListContent =
      diff > 0 ? list.getContent().slice(0, diff) : list.getContent();
    const newListContent = diff > 0 ? list.getContent().slice(diff) : "";
    const newList = new List(newListContent);

    if (list.isEmpty()) {
      list.getParent().addAfter(list, newList);
    } else {
      list.addAtBeginning(newList);
    }

    list.setContent(oldListContent);

    this.cursor.line = this.getLineNumber(newList);
    this.cursor.ch = newList.getContentStartCh();

    return true;
  }

  cursorFullLeft() {
    const list = this.getCursorOnList();

    this.cursor.ch = list.getContentStartCh();

    return true;
  }

  checkCursorAfterPrefix() {
    const list = this.getCursorOnList();

    const startCh = list.getContentStartCh();

    if (this.cursor.ch < startCh) {
      this.cursor.ch = startCh;
    }

    return true;
  }

  cursorLeft() {
    const list = this.getCursorOnList();

    if (this.cursor.ch <= list.getContentStartCh()) {
      this.cursor.line--;
      this.cursor.ch = 999; // TODO: remove hack
    } else {
      this.cursor.ch--;
    }

    return true;
  }

  cursorRight() {
    const list = this.getCursorOnList();

    if (this.cursor.ch >= list.getContentEndCh()) {
      const next = this.getListUnderLine(this.cursor.line + 1);
      this.cursor.line++;
      this.cursor.ch = next ? next.getContentStartCh() : 0;
    } else {
      this.cursor.ch = Math.max(this.cursor.ch + 1, list.getContentStartCh());
    }

    return true;
  }
}

export default class ObsidianOutlinerPlugin extends Plugin {
  private dispose: () => void | undefined;

  parseList(editor: CodeMirror.Editor, cursor = editor.getCursor()): Root {
    const cursorLine = cursor.line;
    const cursorCh = cursor.ch;
    const line = editor.getLine(cursorLine);

    if (!this.isListLine(line)) {
      return null;
    }

    let listStartLine = cursorLine;
    const listStartCh = 0;
    while (listStartLine >= 1) {
      const line = editor.getLine(listStartLine - 1);
      if (!this.isListLine(line)) {
        break;
      }
      listStartLine--;
    }

    let listEndLine = cursorLine;
    let listEndCh = line.length;
    while (listEndLine < editor.lineCount()) {
      const line = editor.getLine(listEndLine + 1);
      if (!this.isListLine(line)) {
        break;
      }
      listEndCh = line.length;
      listEndLine++;
    }

    const root = new Root(
      { line: listStartLine, ch: listStartCh },
      { line: listEndLine, ch: listEndCh },
      { line: cursorLine, ch: cursorCh }
    );

    let currentLevel: IList = root;
    let lastList: IList = root;

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const lineLevel =
        line.length - line.replace(LIST_LINE_TABS_RE, "").length;

      if (lineLevel === currentLevel.getLevel() + 1) {
        currentLevel = lastList;
      } else if (lineLevel < currentLevel.getLevel()) {
        while (lineLevel < currentLevel.getLevel()) {
          currentLevel = currentLevel.getParent();
        }
      } else if (lineLevel != currentLevel.getLevel()) {
        console.error(`Unable to parse list`);
        return null;
      }

      const list = new List(line.replace(LIST_LINE_PREFIX_RE, ""));
      currentLevel.add(list);
      lastList = list;
    }

    return root;
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

    if (force || oldString !== newString) {
      editor.replaceRange(root.print(), root.getStart(), root.getEnd());
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

  isListLine(line: string) {
    return LIST_LINE_PREFIX_RE.test(line);
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
    const selection = editor.listSelections()[0];

    if (!rangeIsCursor(selection)) {
      editor.replaceRange("", selection.from(), selection.to());
      return true;
    }

    return this.execute(editor, (root) => root.delete());
  }

  enter(editor: CodeMirror.Editor) {
    const selection = editor.listSelections()[0];
    let checkEmptyContent = true;

    if (!rangeIsCursor(selection)) {
      editor.replaceRange("", selection.from(), selection.to());
      checkEmptyContent = false;
    }

    return this.execute(editor, (root) => root.enter({ checkEmptyContent }));
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
    const line = editor.getLine(editor.getCursor().line);

    if (!this.isListLine(line)) {
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
    return this.execute(editor, (root) => root.cursorLeft());
  }

  cursorRight(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.cursorRight());
  }

  cursorFullLeft(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.cursorFullLeft(), {
      force: true,
    });
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

  moveLine(editor: CodeMirror.Editor, diff: number) {
    const cursor = editor.getCursor();
    const newCursor = {
      line: cursor.line + diff,
      ch: cursor.ch,
    };

    return this.execute(editor, (root) => root.checkCursorAfterPrefix(), {
      cursor: newCursor,
    });
  }

  cursorUp(editor: CodeMirror.Editor) {
    return this.moveLine(editor, -1);
  }

  cursorDown(editor: CodeMirror.Editor) {
    return this.moveLine(editor, +1);
  }

  handleKeydown = (cm: CodeMirror.Editor, e: KeyboardEvent) => {
    let worked = false;

    if (testKeydown(e, "Tab", ["shift"])) {
      worked = this.moveListElementLeft(cm);
    } else if (testKeydown(e, "Tab")) {
      worked = this.moveListElementRight(cm);
    } else if (testKeydown(e, "ArrowUp", ["shift", "cmd"])) {
      worked = this.moveListElementUp(cm);
    } else if (testKeydown(e, "ArrowDown", ["shift", "cmd"])) {
      worked = this.moveListElementDown(cm);
    } else if (testKeydown(e, "ArrowUp", ["cmd"])) {
      worked = this.fold(cm);
    } else if (testKeydown(e, "ArrowDown", ["cmd"])) {
      worked = this.unfold(cm);
    } else if (testKeydown(e, "ArrowDown")) {
      worked = this.cursorDown(cm);
    } else if (testKeydown(e, "ArrowUp")) {
      worked = this.cursorUp(cm);
    } else if (testKeydown(e, "ArrowLeft")) {
      worked = this.cursorLeft(cm);
    } else if (testKeydown(e, "ArrowRight")) {
      worked = this.cursorRight(cm);
    } else if (testKeydown(e, "ArrowLeft", ["cmd"])) {
      worked = this.cursorFullLeft(cm);
    } else if (testKeydown(e, "Backspace", ["cmd"])) {
      worked = this.deleteFullLeft(cm);
    } else if (testKeydown(e, "Backspace")) {
      worked = this.delete(cm);
    } else if (testKeydown(e, "Enter")) {
      worked = this.enter(cm);
    } else if (testKeydown(e, "ArrowLeft", ["cmd", "shift"])) {
      worked = this.selectFullLeft(cm);
    }

    if (worked) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  async onload() {
    console.log(`Loading obsidian-outliner`);

    this.registerCodeMirror((cm) => {
      this.dispose = () => cm.off("keydown", this.handleKeydown);
      cm.on("keydown", this.handleKeydown);
    });
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    if (this.dispose) {
      this.dispose();
      this.dispose = undefined;
    }
  }
}
