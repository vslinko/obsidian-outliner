import { Operation } from "./Operation";

import { List, Root } from "../root";

export class InsertNewLineWithoutBullet implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleSelection()) {
      return;
    }

    const selection = root.getSelection();
    if (!selection || selection.anchor.line !== selection.head.line) {
      return;
    }

    const list = root.getListUnderCursor();
    const lines = list.getLinesInfo();
    const cursor = root.getCursor();
    const lineIndex = lines.findIndex((line) => line.from.line === cursor.line);

    if (lineIndex < 0) {
      return;
    }

    const lineUnderCursor = lines[lineIndex];

    if (cursor.ch < lineUnderCursor.from.ch) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    const lineOffset = cursor.ch - lineUnderCursor.from.ch;
    const lineText = lines[lineIndex].text;
    const left = lineText.slice(0, lineOffset);
    const right = lineText.slice(lineOffset);
    const newLines = list.getLines();

    newLines.splice(lineIndex, 1, left, right);

    if (!list.getNotesIndent()) {
      list.setNotesIndent(this.createNotesIndent(list));
    }

    list.replaceLines(newLines);

    root.replaceCursor({
      line: cursor.line + 1,
      ch: list.getNotesIndent().length,
    });
  }

  private createNotesIndent(list: List) {
    return (
      list.getFirstLineIndent() +
      " ".repeat(list.getBullet().length + list.getSpaceAfterBullet().length)
    );
  }
}
