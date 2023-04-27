import { Operation } from "./Operation";

import { Root, recalculateNumericBullets } from "../root";

export class MoveListDown implements Operation {
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

    const list = root.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();
    const next = parent.getNextSiblingOf(list);

    const listStartLineBefore = root.getContentLinesRangeOf(list)[0];

    if (!next && grandParent) {
      const newParent = grandParent.getNextSiblingOf(parent);

      if (newParent) {
        this.updated = true;
        parent.removeChild(list);
        newParent.addBeforeAll(list);
      }
    } else if (next) {
      this.updated = true;
      parent.removeChild(list);
      parent.addAfter(next, list);
    }

    if (!this.updated) {
      return;
    }

    const listStartLineAfter = root.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;

    const cursor = root.getCursor();
    root.replaceCursor({
      line: cursor.line + lineDiff,
      ch: cursor.ch,
    });

    recalculateNumericBullets(root);
  }
}
