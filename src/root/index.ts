export function cmpPos(a: Position, b: Position) {
  return a.line - b.line || a.ch - b.ch;
}

export function maxPos(a: Position, b: Position) {
  return cmpPos(a, b) < 0 ? b : a;
}

export function minPos(a: Position, b: Position) {
  return cmpPos(a, b) < 0 ? a : b;
}

export interface Position {
  ch: number;
  line: number;
}

export interface ListLine {
  text: string;
  from: Position;
  to: Position;
}

export interface Range {
  anchor: Position;
  head: Position;
}

export class List {
  private parent: List | null = null;
  private children: List[] = [];
  private notesIndent: string | null = null;
  private lines: string[] = [];

  constructor(
    private root: Root,
    private indent: string,
    private bullet: string,
    private spaceAfterBullet: string,
    firstLine: string,
    private foldRoot: boolean
  ) {
    this.lines.push(firstLine);
  }

  getNotesIndent(): string | null {
    return this.notesIndent;
  }

  setNotesIndent(notesIndent: string) {
    if (this.notesIndent !== null) {
      throw new Error(`Notes indent already provided`);
    }
    this.notesIndent = notesIndent;
  }

  addLine(text: string) {
    if (this.notesIndent === null) {
      throw new Error(
        `Unable to add line, notes indent should be provided first`
      );
    }

    this.lines.push(text);
  }

  replaceLines(lines: string[]) {
    if (lines.length > 1 && this.notesIndent === null) {
      throw new Error(
        `Unable to add line, notes indent should be provided first`
      );
    }

    this.lines = lines;
  }

  getLineCount() {
    return this.lines.length;
  }

  getRoot() {
    return this.root;
  }

  getChildren() {
    return this.children.concat();
  }

  getLinesInfo(): ListLine[] {
    const startLine = this.root.getContentLinesRangeOf(this)[0];

    return this.lines.map((row, i) => {
      const line = startLine + i;
      const startCh =
        i === 0 ? this.getContentStartCh() : this.notesIndent.length;
      const endCh = startCh + row.length;

      return {
        text: row,
        from: { line, ch: startCh },
        to: { line, ch: endCh },
      };
    });
  }

  getLines(): string[] {
    return this.lines.concat();
  }

  getFirstLineContentStart() {
    const startLine = this.root.getContentLinesRangeOf(this)[0];

    return {
      line: startLine,
      ch: this.getContentStartCh(),
    };
  }

  getLastLineContentEnd() {
    const endLine = this.root.getContentLinesRangeOf(this)[1];
    const endCh =
      this.lines.length === 1
        ? this.getContentStartCh() + this.lines[0].length
        : this.notesIndent.length + this.lines[this.lines.length - 1].length;

    return {
      line: endLine,
      ch: endCh,
    };
  }

  private getContentStartCh() {
    return this.indent.length + this.bullet.length + 1;
  }

  isFolded(): boolean {
    if (this.foldRoot) {
      return true;
    }

    if (this.parent) {
      return this.parent.isFolded();
    }

    return false;
  }

  isFoldRoot() {
    return this.foldRoot;
  }

  getTopFoldRoot() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let tmp: List = this;
    let foldRoot: List | null = null;
    while (tmp) {
      if (tmp.isFoldRoot()) {
        foldRoot = tmp;
      }
      tmp = tmp.parent;
    }
    return foldRoot;
  }

  getLevel(): number {
    if (!this.parent) {
      return 0;
    }

    return this.parent.getLevel() + 1;
  }

  unindentContent(from: number, till: number) {
    this.indent = this.indent.slice(0, from) + this.indent.slice(till);
    if (this.notesIndent !== null) {
      this.notesIndent =
        this.notesIndent.slice(0, from) + this.notesIndent.slice(till);
    }

    for (const child of this.children) {
      child.unindentContent(from, till);
    }
  }

  indentContent(indentPos: number, indentChars: string) {
    this.indent =
      this.indent.slice(0, indentPos) +
      indentChars +
      this.indent.slice(indentPos);
    if (this.notesIndent !== null) {
      this.notesIndent =
        this.notesIndent.slice(0, indentPos) +
        indentChars +
        this.notesIndent.slice(indentPos);
    }

    for (const child of this.children) {
      child.indentContent(indentPos, indentChars);
    }
  }

  getFirstLineIndent() {
    return this.indent;
  }

  getBullet() {
    return this.bullet;
  }

  getSpaceAfterBullet() {
    return this.spaceAfterBullet;
  }

  replateBullet(bullet: string) {
    this.bullet = bullet;
  }

  getParent() {
    return this.parent;
  }

  addBeforeAll(list: List) {
    this.children.unshift(list);
    list.parent = this;
  }

  addAfterAll(list: List) {
    this.children.push(list);
    list.parent = this;
  }

  removeChild(list: List) {
    const i = this.children.indexOf(list);
    this.children.splice(i, 1);
    list.parent = null;
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

  getPrevSiblingOf(list: List) {
    const i = this.children.indexOf(list);
    return i > 0 ? this.children[i - 1] : null;
  }

  getNextSiblingOf(list: List) {
    const i = this.children.indexOf(list);
    return i >= 0 && i < this.children.length ? this.children[i + 1] : null;
  }

  isEmpty() {
    return this.children.length === 0;
  }

  print() {
    let res = "";

    for (let i = 0; i < this.lines.length; i++) {
      res +=
        i === 0
          ? this.indent + this.bullet + this.spaceAfterBullet
          : this.notesIndent;
      res += this.lines[i];
      res += "\n";
    }

    for (const child of this.children) {
      res += child.print();
    }

    return res;
  }
}

export class Root {
  private rootList = new List(this, "", "", "", "", false);
  private selections: Range[] = [];

  constructor(
    private start: Position,
    private end: Position,
    selections: Range[]
  ) {
    this.replaceSelections(selections);
  }

  getRootList() {
    return this.rootList;
  }

  getRange(): [Position, Position] {
    return [{ ...this.start }, { ...this.end }];
  }

  getSelections(): Range[] {
    return this.selections.map((s) => ({
      anchor: { ...s.anchor },
      head: { ...s.head },
    }));
  }

  hasSingleCursor() {
    if (!this.hasSingleSelection()) {
      return false;
    }

    const selection = this.selections[0];

    return (
      selection.anchor.line === selection.head.line &&
      selection.anchor.ch === selection.head.ch
    );
  }

  hasSingleSelection() {
    return this.selections.length === 1;
  }

  getSelection() {
    const selection = this.selections[this.selections.length - 1];

    const from =
      selection.anchor.ch > selection.head.ch
        ? selection.head.ch
        : selection.anchor.ch;
    const to =
      selection.anchor.ch > selection.head.ch
        ? selection.anchor.ch
        : selection.head.ch;

    return {
      ...selection,
      from,
      to,
    };
  }

  getCursor() {
    return { ...this.selections[this.selections.length - 1].head };
  }

  replaceCursor(cursor: Position) {
    this.selections = [{ anchor: cursor, head: cursor }];
  }

  replaceSelections(selections: Range[]) {
    if (selections.length < 1) {
      throw new Error(`Unable to create Root without selections`);
    }
    this.selections = selections;
  }

  getListUnderCursor(): List {
    return this.getListUnderLine(this.getCursor().line);
  }

  getListUnderLine(line: number) {
    if (line < this.start.line || line > this.end.line) {
      return;
    }

    let result: List = null;
    let index: number = this.start.line;

    const visitArr = (ll: List[]) => {
      for (const l of ll) {
        const listFromLine = index;
        const listTillLine = listFromLine + l.getLineCount() - 1;

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

  getContentLinesRangeOf(list: List): [number, number] | null {
    let result: [number, number] | null = null;
    let line: number = this.start.line;

    const visitArr = (ll: List[]) => {
      for (const l of ll) {
        const listFromLine = line;
        const listTillLine = listFromLine + l.getLineCount() - 1;

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
