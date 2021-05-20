export interface IList {
  getLevel(): number;
  getParent(): IList | null;
  addAfterAll(list: IList): void;
}

export class List implements IList {
  private indentSign: string;
  private bullet: string;
  private content: string;
  private folded: boolean;
  private children: List[];
  private parent: List;

  constructor(
    indentSign: string,
    bullet: string,
    content: string,
    folded: boolean
  ) {
    this.indentSign = indentSign;
    this.bullet = bullet;
    this.content = content;
    this.folded = folded;
    this.children = [];
    this.parent = null;
  }

  isFolded() {
    return this.folded;
  }

  isFoldRoot() {
    let parent = this.getParent();
    while (parent) {
      if (parent.isFolded()) {
        return false;
      }
      parent = parent.getParent();
    }

    return this.isFolded();
  }

  getChildren() {
    return this.children.concat();
  }

  appendContent(content: string) {
    this.content += content;
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

  getPrevSiblingOf(list: List) {
    const i = this.children.indexOf(list);
    return i > 0 ? this.children[i - 1] : null;
  }

  getNextSiblingOf(list: List) {
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

  addAfterAll(list: List) {
    this.children.push(list);
    list.parent = this;
  }

  addBeforeAll(list: List) {
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

  removeChild(list: List) {
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

  copy(
    override: {
      indentSign?: string;
      bullet?: string;
      content?: string;
      folded?: boolean;
    } = {}
  ) {
    const { indentSign, bullet, content, folded } = {
      indentSign: this.indentSign,
      bullet: this.bullet,
      content: this.content,
      folded: this.folded,
      ...override,
    };

    return new List(indentSign, bullet, content, folded);
  }

  private getFullContent() {
    return (
      new Array(this.getLevel() - 1).fill(this.indentSign).join("") +
      this.bullet +
      " " +
      this.content
    );
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
    this.rootList = new List("", "", "", false);
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

  addAfterAll(list: List) {
    this.rootList.addAfterAll(list);
  }

  getListStartPosition() {
    return { ...this.start };
  }

  getListEndPosition() {
    return { ...this.end };
  }

  getCursor() {
    return { ...this.cursor };
  }

  getListUnderCursor(): List {
    return this.getListUnderLine(this.cursor.line);
  }

  print() {
    let res = "";

    for (const child of this.rootList.getChildren()) {
      res += child.print();
    }

    return res.replace(/\n$/, "");
  }

  getLineNumberOf(list: List) {
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
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const prev = parent.getPrevSiblingOf(list);

    if (!prev && grandParent) {
      const newParent = grandParent.getPrevSiblingOf(parent);

      if (newParent) {
        parent.removeChild(list);
        newParent.addAfterAll(list);
        this.cursor.line = this.getLineNumberOf(list);
      }
    } else if (prev) {
      parent.removeChild(list);
      parent.addBefore(prev, list);
      this.cursor.line = this.getLineNumberOf(list);
    }

    return true;
  }

  createNewlineOnChildLevel() {
    const list = this.getListUnderCursor();

    if (list.isEmpty()) {
      return false;
    }

    if (this.cursor.ch !== list.getContentEndCh()) {
      return false;
    }

    const newList = list.getChildren()[0].copy({ content: "", folded: false });

    list.addBeforeAll(newList);

    this.cursor.line = this.getLineNumberOf(newList);
    this.cursor.ch = newList.getContentStartCh();

    return true;
  }

  moveDown() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const next = parent.getNextSiblingOf(list);

    if (!next && grandParent) {
      const newParent = grandParent.getNextSiblingOf(parent);

      if (newParent) {
        parent.removeChild(list);
        newParent.addBeforeAll(list);
        this.cursor.line = this.getLineNumberOf(list);
      }
    } else if (next) {
      parent.removeChild(list);
      parent.addAfter(next, list);
      this.cursor.line = this.getLineNumberOf(list);
    }

    return true;
  }

  moveLeft() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();

    if (!grandParent) {
      return true;
    }

    parent.removeChild(list);
    grandParent.addAfter(parent, list);
    this.cursor.line = this.getLineNumberOf(list);
    this.cursor.ch -= this.getIndentSign().length;

    return true;
  }

  moveRight() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const prev = parent.getPrevSiblingOf(list);

    if (!prev) {
      return true;
    }

    parent.removeChild(list);
    prev.addAfterAll(list);
    this.cursor.line = this.getLineNumberOf(list);
    this.cursor.ch += this.getIndentSign().length;

    return true;
  }

  deleteAndMergeWithPrevious() {
    const list = this.getListUnderCursor();

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
      parent.removeChild(list);
      for (const c of list.getChildren()) {
        list.removeChild(c);
        prev.addAfterAll(c);
      }

      this.cursor.line = this.getLineNumberOf(prev);
      this.cursor.ch = prevEndCh;
    }

    return true;
  }
}
