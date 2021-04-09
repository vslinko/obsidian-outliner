export interface IList {
  getLevel(): number;
  getParent(): IList | null;
  add(list: IList): void;
}

export class List implements IList {
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

export class Root implements IList {
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

  replaceCursor(cursor: CodeMirror.Position) {
    this.cursor = cursor;
  }

  getTotalLines() {
    return this.end.line - this.start.line + 1;
  }

  getChildren() {
    return this.rootList.getChildren();
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
}
