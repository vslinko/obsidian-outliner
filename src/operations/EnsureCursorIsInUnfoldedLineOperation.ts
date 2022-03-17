import { Operation } from "./Operation";

import { Root } from "../root";

export class EnsureCursorIsInUnfoldedLineOperation implements Operation {
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

    const cursor = root.getCursor();

    const list = root.getListUnderCursor();
    if (!list.isFolded()) {
      return;
    }

    const foldRoot = list.getTopFoldRoot();
    const firstLineEnd = foldRoot.getLinesInfo()[0].to;

    if (cursor.line > firstLineEnd.line) {
      this.stopPropagation = true;
      this.updated = true;
      root.replaceCursor(firstLineEnd);
    }
  }
}
