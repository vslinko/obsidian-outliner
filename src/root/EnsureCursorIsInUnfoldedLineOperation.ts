import { Root } from ".";
import { IOperation } from "./IOperation";

export class EnsureCursorIsInUnfoldedLineOperation implements IOperation {
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

    this.stopPropagation = true;

    const cursor = root.getCursor();

    const list = root.getListUnderCursor();
    if (!list.isFolded()) {
      return;
    }

    let foldRoot = list;
    while (!foldRoot.isFoldRoot()) {
      foldRoot = foldRoot.getParent();
    }

    const firstLineEnd = foldRoot.getLinesInfo()[0].to;

    if (cursor.line > firstLineEnd.line) {
      this.updated = true;
      root.replaceCursor(firstLineEnd);
    }
  }
}
