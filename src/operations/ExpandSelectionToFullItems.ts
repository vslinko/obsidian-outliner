import { Operation } from "./Operation";

import { Root, cmpPos, maxPos, minPos } from "../root";

export class ExpandSelectionToFullItems implements Operation {
  private updated = false;

  constructor(private root: Root) {}

  shouldStopPropagation() {
    return this.updated;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    this.updated = false;
    const { root } = this;
    if (!root.hasSingleSelection()) {
      return;
    }

    const { anchor, head } = root.getSelection();
    const from = minPos(anchor, head);
    const to = maxPos(anchor, head);
    const [rootStart, rootEnd] = root.getContentRange();
    if (cmpPos(from, rootStart) < 0 || cmpPos(to, rootEnd) > 0) {
      return;
    }

    // Selection ranges are half-open: column zero does not select that item.
    const lastSelectedLine = to.ch === 0 ? to.line - 1 : to.line;
    if (lastSelectedLine <= from.line) {
      return;
    }

    const first = root.getListUnderLine(from.line);
    const last = root.getListUnderLine(lastSelectedLine);
    if (!first || !last || first === last) {
      return;
    }

    const expandedStart = minPos(
      from,
      first.getFirstLineContentStartAfterCheckbox(),
    );
    let expandedEnd = maxPos(to, first.getContentEndIncludingChildren());

    // Any intervening item whose subtree extends past the last selected item
    // must be its ancestor. Include it only if its own content was touched.
    for (
      let item = last;
      item && item !== root.getRootList();
      item = item.getParent()
    ) {
      if (item.getLastLineContentEnd().line < from.line) {
        break;
      }
      expandedEnd = maxPos(expandedEnd, item.getContentEndIncludingChildren());
    }

    if (cmpPos(from, expandedStart) === 0 && cmpPos(to, expandedEnd) === 0) {
      return;
    }

    const forward = cmpPos(anchor, head) <= 0;
    root.replaceSelections([
      forward
        ? { anchor: expandedStart, head: expandedEnd }
        : { anchor: expandedEnd, head: expandedStart },
    ]);
    this.updated = true;
  }
}
