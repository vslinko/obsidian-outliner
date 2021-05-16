export interface IListLine {
  text: string;
  from: CodeMirror.Position;
  to: CodeMirror.Position;
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
    firstLine: string,
    private folded: boolean
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

  getLinesInfo(): IListLine[] {
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
    if (this.folded) {
      return true;
    }

    if (this.parent) {
      return this.parent.isFolded();
    }

    return false;
  }

  isFoldRoot() {
    let parent = this.getParent();

    while (parent) {
      if (parent.folded) {
        return false;
      }

      parent = parent.getParent();
    }

    return this.folded;
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
      res += i === 0 ? this.indent + this.bullet + " " : this.notesIndent;
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
  private rootList = new List(this, "", "", "", false);

  constructor(
    private start: CodeMirror.Position,
    private end: CodeMirror.Position,
    private cursor: CodeMirror.Position
  ) {}

  getRootList() {
    return this.rootList;
  }

  getRange(): [CodeMirror.Position, CodeMirror.Position] {
    return [{ ...this.start }, { ...this.end }];
  }

  getCursor() {
    return { ...this.cursor };
  }

  replaceCursor(cursor: CodeMirror.Position) {
    this.cursor = cursor;
  }

  getListUnderCursor(): List {
    return this.getListUnderLine(this.cursor.line);
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
