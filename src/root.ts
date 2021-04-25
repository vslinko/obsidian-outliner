export interface IList {
  getLevel(): number;
  getParent(): IList | null;
  addAfterAll(list: IList): void;
}

function countLines(string: string) {
  let count = 0;
  let i = -1;

  while ((i = string.indexOf("\n", i + 1)) >= 0) {
    count++;
  }

  return count;
}

export class NewList {
  private parent: NewList | null = null;
  private children: NewList[] = [];

  constructor(
    private indent: string,
    private bullet: string,
    private content: string,
    private folded: boolean
  ) {}

  getChildren() {
    return this.children.concat();
  }

  getContent() {
    return this.content;
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

  getLevel(): number {
    if (!this.parent) {
      return 0;
    }

    return this.parent.getLevel() + 1;
  }

  unindent(from: number, till: number) {
    this.indent = this.indent.slice(0, from) + this.indent.slice(till);

    for (const child of this.children) {
      child.unindent(from, till);
    }
  }

  getIndent() {
    return this.indent;
  }

  getParent() {
    return this.parent;
  }

  addAfterAll(list: NewList) {
    this.children.push(list);
    list.parent = this;
  }

  removeChild(list: NewList) {
    const i = this.children.indexOf(list);
    this.children.splice(i, 1);
    list.parent = null;
  }

  addAfter(before: NewList, list: NewList) {
    const i = this.children.indexOf(before);
    this.children.splice(i + 1, 0, list);
    list.parent = this;
  }

  appendContent(content: string) {
    this.content += content;
  }

  print() {
    let res = this.indent + this.bullet + " " + this.content + "\n";

    for (const child of this.children) {
      res += child.print();
    }

    return res;
  }
}

export class NewRoot {
  private rootList = new NewList("", "", "", false);

  constructor(
    private start: CodeMirror.Position,
    private end: CodeMirror.Position,
    private cursor: CodeMirror.Position
  ) {}

  getListStartPosition() {
    return this.start;
  }

  getListEndPosition() {
    return this.end;
  }

  getCursor() {
    return this.cursor;
  }

  getIndent() {
    return this.rootList.getIndent();
  }

  getParent(): NewList | null {
    return null;
  }

  addAfterAll(list: NewList) {
    this.rootList.addAfterAll(list);
  }

  appendContent(content: string) {
    throw new Error("Invalid");
  }

  getListUnderCursor(): NewList {
    return this.getListUnderLine(this.cursor.line);
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

    const indentRmFrom = parent.getIndent().length;
    const indentRmTill = list.getIndent().length;
    const diff = indentRmTill - indentRmFrom;

    list.unindent(indentRmFrom, indentRmTill);

    this.cursor.line = this.getContentLinesRangeOf(list)[0];
    this.cursor.ch -= diff;

    return true;
  }

  getListUnderLine(line: number) {
    if (line < this.start.line || line > this.end.line) {
      return;
    }

    let result: NewList = null;
    let index: number = 0;

    const visitArr = (ll: NewList[]) => {
      for (const l of ll) {
        const listFromLine = index;
        const listTillLine = listFromLine + countLines(l.getContent());

        if (line >= listFromLine && line <= listTillLine) {
          result = l;
        } else {
          index = listTillLine + 1;
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

  getContentLinesRangeOf(list: NewList): [number, number] | null {
    let result: [number, number] | null = null;
    let line: number = this.start.line;

    const visitArr = (ll: NewList[]) => {
      for (const l of ll) {
        const listFromLine = line;
        const listTillLine = listFromLine + countLines(l.getContent());

        if (l === list) {
          result = [listFromLine, listTillLine];
        } else {
          line = listTillLine + 1;
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

  getChildren() {
    return this.rootList.getChildren();
  }

  print() {
    let res = "";

    for (const child of this.rootList.getChildren()) {
      res += child.print();
    }

    return res.replace(/\n$/, "");
  }
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

  getBullet() {
    return this.bullet;
  }

  getChildren() {
    return this.children.concat();
  }

  setContent(content: string) {
    this.content = content;
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

  enter() {
    const list = this.getListUnderCursor();

    if (list.getContent() === "") {
      return false;
    }

    const bullet = list.isEmpty()
      ? list.getBullet()
      : list.getChildren()[0].getBullet();

    const diff = this.cursor.ch - list.getContentStartCh();
    const oldListContent =
      diff > 0 ? list.getContent().slice(0, diff) : list.getContent();
    const newListContent = diff > 0 ? list.getContent().slice(diff) : "";
    const newList = new List(
      this.getIndentSign(),
      bullet,
      newListContent,
      list.isFolded()
    );

    if (list.isEmpty()) {
      list.getParent().addAfter(list, newList);
    } else {
      list.addBeforeAll(newList);
    }

    list.setContent(oldListContent);

    this.cursor.line = this.getLineNumberOf(newList);
    this.cursor.ch = newList.getContentStartCh();

    return true;
  }
}
