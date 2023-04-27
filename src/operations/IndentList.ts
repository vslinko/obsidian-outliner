import { Operation } from "./Operation";

import { Root, recalculateNumericBullets } from "../root";

export class IndentList implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root, private defaultIndentChars: string) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleCursor()) {
      return;
    }

    this.stopPropagation = true;

    const list = root.getListUnderCursor();
    const parent = list.getParent();
    const prev = parent.getPrevSiblingOf(list);

    if (!prev) {
      return;
    }

    this.updated = true;

    const listStartLineBefore = root.getContentLinesRangeOf(list)[0];

    const indentPos = list.getFirstLineIndent().length;
    let indentChars = "";

    if (indentChars === "" && !prev.isEmpty()) {
      indentChars = prev
        .getChildren()[0]
        .getFirstLineIndent()
        .slice(prev.getFirstLineIndent().length);
    }

    if (indentChars === "") {
      indentChars = list
        .getFirstLineIndent()
        .slice(parent.getFirstLineIndent().length);
    }

    if (indentChars === "" && !list.isEmpty()) {
      indentChars = list.getChildren()[0].getFirstLineIndent();
    }

    if (indentChars === "") {
      indentChars = this.defaultIndentChars;
    }

    parent.removeChild(list);
    prev.addAfterAll(list);
    list.indentContent(indentPos, indentChars);

    const listStartLineAfter = root.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;

    const cursor = root.getCursor();
    root.replaceCursor({
      line: cursor.line + lineDiff,
      ch: cursor.ch + indentChars.length,
    });

    recalculateNumericBullets(root);
  }
}
