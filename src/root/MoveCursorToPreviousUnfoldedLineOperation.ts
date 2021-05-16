import { Root } from ".";
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

    const list = this.root.getListUnderCursor();
    const cursor = this.root.getCursor();
    const contentStart = list.getFirstLineContentStart();

    if (cursor.line !== contentStart.line || cursor.ch !== contentStart.ch) {
      return;
    }

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
