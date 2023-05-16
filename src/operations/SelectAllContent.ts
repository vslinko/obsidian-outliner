import { Operation } from "./Operation";

import { Root, maxPos, minPos } from "../root";

export class SelectAllContent implements Operation {
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
    const [rootStart, rootEnd] = root.getContentRange();

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
    const listUnderSelectionFrom = root.getListUnderLine(selectionFrom.line);
    const listStart = listUnderSelectionFrom.getFirstLineContentStartAfterCheckbox();
    const listEnd = listUnderSelectionFrom.getContentEndIncludingChildren();

    this.stopPropagation = true;
    this.updated = true;

    if (
      selectionFrom.line === contentStart.line &&
      selectionFrom.ch === contentStart.ch &&
      selectionTo.line === listEnd.line &&
      selectionTo.ch === listEnd.ch
    ) {
      if (list.children.length) {
        // select sub lists
        root.replaceSelections([{ anchor: contentStart, head: list.getContentEndIncludingChildren() }]);
      } else {
        // select whole list
        root.replaceSelections([{ anchor: rootStart, head: rootEnd }]);
      }
    } else if (listStart.ch == selectionFrom.ch && listEnd.line == selectionTo.line && listEnd.ch == selectionTo.ch) {
      // select whole list
      root.replaceSelections([{ anchor: rootStart, head: rootEnd }]);
    } else if ((selectionFrom.line > contentStart.line || (selectionFrom.line == contentStart.line && selectionFrom.ch >= contentStart.ch)) && (selectionTo.line < contentEnd.line || (selectionTo.line == contentEnd.line && selectionTo.ch <= contentEnd.ch))) {
      // select whole line
      root.replaceSelections([{ anchor: contentStart, head: contentEnd }]);
    } else {
      this.stopPropagation = false;
      this.updated = false;
      return false;
    }

    return true;
  }
}
