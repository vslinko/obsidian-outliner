import { Operation } from "./Operation";

import { Root } from "../root";

export class EnsureCursorInListContentOperation implements Operation {
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
    const contentStart = list.getFirstLineContentStart();
    const linePrefix =
      contentStart.line === cursor.line
        ? contentStart.ch
        : list.getNotesIndent().length;

    if (cursor.ch < linePrefix) {
      this.updated = true;
      root.replaceCursor({
        line: cursor.line,
        ch: linePrefix,
      });
    }
  }
}
