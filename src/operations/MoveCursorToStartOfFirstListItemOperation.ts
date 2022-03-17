import { Operation } from "./Operation";

import { Root, minPos } from "../root";

export class MoveCursorToStartOfFirstListItemOperation implements Operation {
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

    this.stopPropagation = true;
    this.updated = true;

    const selection = root.getSelections()[0];

    const list = root.getListUnderLine(
      minPos(selection.anchor, selection.head).line
    );

    root.replaceCursor(list.getFirstLineContentStart());
  }
}
