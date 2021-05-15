function countLines(string: string) {
  let count = 0;
  let i = -1;

  while ((i = string.indexOf("\n", i + 1)) >= 0) {
    count++;
  }

  return count;
}

export class List {
  private parent: List | null = null;
  private children: List[] = [];

  constructor(
    private root: Root,
    private indent: string,
    private bullet: string,
    private content: string,
    private folded: boolean
  ) {}

  getRoot() {
    return this.root;
  }

  getChildren() {
    return this.children.concat();
  }

  getContent() {
    return this.content;
  }

  getContentRange() {
    const [startLine, endLine] = this.root.getContentLinesRangeOf(this);
    const startCh = this.getContentStartCh();
    const lines = this.content.split("\n");
    const endCh =
      lines.length === 1
        ? startCh + lines[0].length
        : lines[lines.length - 1].length;

    return [
      { line: startLine, ch: startCh },
      { line: endLine, ch: endCh },
    ];
  }

  getContentStartCh() {
    return this.indent.length + this.bullet.length + 1;
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

  unindentContent(from: number, till: number) {
    this.indent = this.indent.slice(0, from) + this.indent.slice(till);

    this.content = this.content
      .split("\n")
      .map((row, i) => {
        if (i === 0) {
          return row;
        }
        return row.slice(0, from) + row.slice(till);
      })
      .join("\n");

    for (const child of this.children) {
      child.unindentContent(from, till);
    }
  }

  indentContent(indentPos: number, indentChars: string) {
    this.indent =
      this.indent.slice(0, indentPos) +
      indentChars +
      this.indent.slice(indentPos);

    this.content = this.content
      .split("\n")
      .map((row, i) => {
        if (i === 0) {
          return row;
        }
        return row.slice(0, indentPos) + indentChars + row.slice(indentPos);
      })
      .join("\n");

    for (const child of this.children) {
      child.indentContent(indentPos, indentChars);
    }
  }

  getIndent() {
    return this.indent;
  }

  getBullet() {
    return this.bullet;
  }

  getParent() {
    return this.parent;
  }

  setContent(content: string) {
    this.content = content;
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

  appendContent(content: string) {
    this.content += content;
  }

  isEmpty() {
    return this.children.length === 0;
  }

  print() {
    let res = this.indent + this.bullet + " " + this.content + "\n";

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
    private cursor: CodeMirror.Position,
    private defaultIndentChars: string
  ) {}

  getRange() {
    return [this.start, this.end];
  }

  // TODO: replace by getRange
  getListStartPosition() {
    return { ...this.start };
  }

  // TODO: replace by getRange
  getListEndPosition() {
    return { ...this.end };
  }

  getCursor() {
    return { ...this.cursor };
  }

  replaceCursor(cursor: CodeMirror.Position) {
    this.cursor = cursor;
  }

  getIndent() {
    return this.rootList.getIndent();
  }

  getParent(): List | null {
    return null;
  }

  addAfterAll(list: List) {
    this.rootList.addAfterAll(list);
  }

  appendContent(content: string) {
    throw new Error("Invalid");
  }

  getListUnderCursor(): List {
    return this.getListUnderLine(this.cursor.line);
  }

  deleteAndMergeWithPrevious() {
    const list = this.getListUnderCursor();

    const contentStart = list.getContentRange()[0];

    if (
      this.cursor.ch !== contentStart.ch ||
      this.cursor.line !== contentStart.line
    ) {
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
      const prevEnd = prev.getContentRange()[1];

      list.unindentContent(prev.getIndent().length, list.getIndent().length);

      prev.appendContent(list.getContent());
      parent.removeChild(list);
      for (const c of list.getChildren()) {
        list.removeChild(c);
        prev.addAfterAll(c);
      }

      this.cursor.line = prevEnd.line;
      this.cursor.ch = prevEnd.ch;
    }

    return true;
  }

  moveUp() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const prev = parent.getPrevSiblingOf(list);

    const listStartLineBefore = this.getContentLinesRangeOf(list)[0];

    if (!prev && grandParent) {
      const newParent = grandParent.getPrevSiblingOf(parent);

      if (newParent) {
        parent.removeChild(list);
        newParent.addAfterAll(list);
      }
    } else if (prev) {
      parent.removeChild(list);
      parent.addBefore(prev, list);
    }

    const listStartLineAfter = this.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;

    this.cursor.line += lineDiff;

    return true;
  }

  moveDown() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const next = parent.getNextSiblingOf(list);

    const listStartLineBefore = this.getContentLinesRangeOf(list)[0];

    if (!next && grandParent) {
      const newParent = grandParent.getNextSiblingOf(parent);

      if (newParent) {
        parent.removeChild(list);
        newParent.addBeforeAll(list);
      }
    } else if (next) {
      parent.removeChild(list);
      parent.addAfter(next, list);
    }

    const listStartLineAfter = this.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;

    this.cursor.line += lineDiff;

    return true;
  }

  moveRight() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const prev = parent.getPrevSiblingOf(list);

    if (!prev) {
      return true;
    }

    const listStartLineBefore = this.getContentLinesRangeOf(list)[0];

    const indentPos = list.getIndent().length;
    let indentChars = "";

    if (indentChars === "" && !prev.isEmpty()) {
      indentChars = prev
        .getChildren()[0]
        .getIndent()
        .slice(prev.getIndent().length);
    }

    if (indentChars === "") {
      indentChars = list.getIndent().slice(parent.getIndent().length);
    }

    if (indentChars === "" && !list.isEmpty()) {
      indentChars = list.getChildren()[0].getIndent();
    }

    if (indentChars === "") {
      indentChars = this.defaultIndentChars;
    }

    parent.removeChild(list);
    prev.addAfterAll(list);
    list.indentContent(indentPos, indentChars);

    const listStartLineAfter = this.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;

    this.cursor.line += lineDiff;
    this.cursor.ch += indentChars.length;

    return true;
  }

  moveLeft() {
    const list = this.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();

    if (!grandParent) {
      return true;
    }

    const listStartLineBefore = this.getContentLinesRangeOf(list)[0];
    const indentRmFrom = parent.getIndent().length;
    const indentRmTill = list.getIndent().length;

    parent.removeChild(list);
    grandParent.addAfter(parent, list);
    list.unindentContent(indentRmFrom, indentRmTill);

    const listStartLineAfter = this.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;
    const chDiff = indentRmTill - indentRmFrom;

    this.cursor.line += lineDiff;
    this.cursor.ch -= chDiff;

    return true;
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

  getContentLinesRangeOf(list: List): [number, number] | null {
    let result: [number, number] | null = null;
    let line: number = this.start.line;

    const visitArr = (ll: List[]) => {
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

  enter() {
    const list = this.getListUnderCursor();
    const content = list.getContent();

    if (content === "") {
      return false;
    }

    const endPos = list.getContentRange()[1];
    const onChildLevel =
      !list.isEmpty() &&
      this.cursor.line === endPos.line &&
      this.cursor.ch === endPos.ch;

    const indent = onChildLevel
      ? list.getChildren()[0].getIndent()
      : list.getIndent();

    const bullet = onChildLevel
      ? list.getChildren()[0].getBullet()
      : list.getBullet();

    const lines = content.split("\n");
    const lineDiff = this.cursor.line - this.getContentLinesRangeOf(list)[0];
    const chDiff =
      lineDiff === 0
        ? this.cursor.ch - list.getContentStartCh()
        : this.cursor.ch;

    let index = chDiff;
    for (let i = 0; i < lineDiff; i++) {
      index += lines[i].length + 1;
    }

    const oldListContent = content.slice(0, index);
    const newListContent = content.slice(index);

    const newList = new List(
      list.getRoot(),
      indent,
      bullet,
      newListContent,
      list.isFolded()
    );

    if (onChildLevel) {
      list.addBeforeAll(newList);
    } else {
      const children = list.getChildren();
      for (const child of children) {
        list.removeChild(child);
        newList.addAfterAll(child);
      }

      list.getParent().addAfter(list, newList);
    }

    list.setContent(oldListContent);

    this.cursor.line = this.getContentLinesRangeOf(newList)[0];
    this.cursor.ch = newList.getContentStartCh();

    return true;
  }
}
