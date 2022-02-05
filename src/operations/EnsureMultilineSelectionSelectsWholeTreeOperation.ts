import { Operation } from "./Operation";

import { Root, cmpPos, isRangesEqual, maxPos } from "../root";

export class EnsureMultilineSelectionSelectsWholeTreeOperation
  implements Operation
{
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

    if (!root.hasSingleSelection() || root.hasSingleCursor()) {
      return;
    }

    const selection = root.getSelections()[0];
    const reverse = cmpPos(selection.anchor, selection.head) > 0;
    const selectionFrom = reverse ? selection.head : selection.anchor;
    const selectionTill = reverse ? selection.anchor : selection.head;

    const topList = root.getListUnderLine(selectionFrom.line);
    const bottomList = root.getListUnderLine(selectionTill.line);

    if (
      !topList ||
      !bottomList ||
      (topList === bottomList &&
        cmpPos(selectionFrom, topList.getFirstLineContentStart()) >= 0)
    ) {
      return;
    }

    const newSelection = {
      anchor: {
        line: topList.getFirstLineContentStart().line,
        ch: 0,
      },
      head: maxPos(
        bottomList.getLastLineContentEnd(),
        topList.getListRangeWithChildren().head
      ),
    };

    if (reverse) {
      const head = newSelection.anchor;
      newSelection.anchor = newSelection.head;
      newSelection.head = head;
    }

    if (isRangesEqual(selection, newSelection)) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;
    root.replaceSelections([newSelection]);
  }
}
