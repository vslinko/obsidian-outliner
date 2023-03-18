import { Operation } from "./Operation";

import { ListLine, Position, Root } from "../root";

export class MoveCursorToPreviousUnfoldedLineOperation implements Operation {
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

    if (!root.hasSingleCursor()) {
      return;
    }

    const list = this.root.getListUnderCursor();
    const cursor = this.root.getCursor();
    const lines = list.getLinesInfo();
    const lineNo = lines.findIndex((l) => {
      return (
        cursor.ch === l.from.ch + list.getCheckboxLength() &&
        cursor.line === l.from.line
      );
    });

    if (lineNo === 0) {
      this.moveCursorToPreviousUnfoldedItem(root, cursor);
    } else if (lineNo > 0) {
      this.moveCursorToPreviousNoteLine(root, lines, lineNo);
    }
  }

  private moveCursorToPreviousNoteLine(
    root: Root,
    lines: ListLine[],
    lineNo: number
  ) {
    this.stopPropagation = true;
    this.updated = true;

    root.replaceCursor(lines[lineNo - 1].to);
  }

  private moveCursorToPreviousUnfoldedItem(root: Root, cursor: Position) {
    const prev = root.getListUnderLine(cursor.line - 1);

    if (!prev) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    if (prev.isFolded()) {
      const foldRoot = prev.getTopFoldRoot();
      const firstLineEnd = foldRoot.getLinesInfo()[0].to;
      root.replaceCursor(firstLineEnd);
    } else {
      root.replaceCursor(prev.getLastLineContentEnd());
    }
  }
}
