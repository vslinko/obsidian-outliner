import { IListLine, Root } from "../root";
import { IOperation } from "./IOperation";

export class MoveCursorToPreviousUnfoldedLineOperation implements IOperation {
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
    const lineNo = lines.findIndex(
      (l) => cursor.ch === l.from.ch && cursor.line === l.from.line
    );

    if (lineNo === 0) {
      this.moveCursorToPreviousUnfoldedItem(root, cursor);
    } else if (lineNo > 0) {
      this.moveCursorToPreviousNoteLine(root, lines, lineNo);
    }
  }

  private moveCursorToPreviousNoteLine(
    root: Root,
    lines: IListLine[],
    lineNo: number
  ) {
    this.stopPropagation = true;
    this.updated = true;

    root.replaceCursor(lines[lineNo - 1].to);
  }

  private moveCursorToPreviousUnfoldedItem(root: Root, cursor: IPosition) {
    const prev = root.getListUnderLine(cursor.line - 1);

    if (!prev) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    if (prev.isFolded()) {
      let foldRoot = prev;
      while (!foldRoot.isFoldRoot()) {
        foldRoot = foldRoot.getParent();
      }

      const firstLineEnd = foldRoot.getLinesInfo()[0].to;
      root.replaceCursor(firstLineEnd);
    } else {
      root.replaceCursor(prev.getLastLineContentEnd());
    }
  }
}
