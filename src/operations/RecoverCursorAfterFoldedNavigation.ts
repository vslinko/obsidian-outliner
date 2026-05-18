import { Operation } from "./Operation";

import { Position, Root } from "../root";

export class RecoverCursorAfterFoldedNavigation implements Operation {
  private stopPropagation = false;
  private updated = false;
  private refoldLine: number | null = null;

  constructor(
    private root: Root,
    private previousCursor: Position | null,
    private previousFoldedLines: number[],
    private pressedKey: string | null,
  ) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  getRefoldLine() {
    return this.refoldLine;
  }

  perform() {
    const { root, previousCursor, previousFoldedLines, pressedKey } = this;

    if (
      !root.hasSingleCursor() ||
      !previousCursor ||
      pressedKey !== "ArrowDown"
    ) {
      return;
    }

    if (!previousFoldedLines.includes(previousCursor.line)) {
      return;
    }

    const cursor = root.getCursor();

    if (cursor.line <= previousCursor.line) {
      return;
    }

    const previousList = root.getListUnderLine(previousCursor.line);

    if (!previousList) {
      return;
    }

    const foldedContentEnd = previousList.getContentEndIncludingChildren();

    if (cursor.line > foldedContentEnd.line) {
      return;
    }

    const nextList = root.getListUnderLine(foldedContentEnd.line + 1);

    if (!nextList) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;
    this.refoldLine = previousCursor.line;
    root.replaceCursor(nextList.getFirstLineContentStartAfterCheckbox());
  }
}
