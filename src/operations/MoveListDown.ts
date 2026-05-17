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

    if (!root.hasSingleSelection()) {
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

    root.replaceSelections(
      root.getSelections().map((selection) => ({
        anchor: {
          line: selection.anchor.line + lineDiff,
          ch: selection.anchor.ch,
        },
        head: {
          line: selection.head.line + lineDiff,
          ch: selection.head.ch,
        },
      })),
    );

    recalculateNumericBullets(root);
  }
}
