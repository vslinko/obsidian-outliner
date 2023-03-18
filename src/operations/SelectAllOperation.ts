import { Operation } from "./Operation";

import { Root, maxPos, minPos } from "../root";

export class SelectAllOperation implements Operation {
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

    const selection = root.getSelections()[0];
    const [rootStart, rootEnd] = root.getRange();

    const selectionFrom = minPos(selection.anchor, selection.head);
    const selectionTo = maxPos(selection.anchor, selection.head);

    if (
      selectionFrom.line < rootStart.line ||
      selectionTo.line > rootEnd.line
    ) {
      return false;
    }

    if (
      selectionFrom.line === rootStart.line &&
      selectionFrom.ch === rootStart.ch &&
      selectionTo.line === rootEnd.line &&
      selectionTo.ch === rootEnd.ch
    ) {
      return false;
    }

    const list = root.getListUnderCursor();
    const contentStart = list.getFirstLineContentStartAfterCheckbox();
    const contentEnd = list.getLastLineContentEnd();

    if (
      selectionFrom.line < contentStart.line ||
      selectionTo.line > contentEnd.line
    ) {
      return false;
    }

    this.stopPropagation = true;
    this.updated = true;

    if (
      selectionFrom.line === contentStart.line &&
      selectionFrom.ch === contentStart.ch &&
      selectionTo.line === contentEnd.line &&
      selectionTo.ch === contentEnd.ch
    ) {
      // select whole list
      root.replaceSelections([{ anchor: rootStart, head: rootEnd }]);
    } else {
      // select whole line
      root.replaceSelections([{ anchor: contentStart, head: contentEnd }]);
    }

    return true;
  }
}
