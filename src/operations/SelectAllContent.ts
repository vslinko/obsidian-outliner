import { Operation } from "./Operation";

import { Position, Root, cmpPos, maxPos, minPos } from "../root";

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

  perform(): boolean {
    this.stopPropagation = false;
    this.updated = false;

    const { root } = this;
    if (!root.hasSingleSelection()) {
      return false;
    }

    const { anchor, head } = root.getSelection();
    const from = minPos(anchor, head);
    const to = maxPos(anchor, head);
    const [rootStart, rootEnd] = root.getContentRange();

    if (cmpPos(from, rootStart) < 0 || cmpPos(to, rootEnd) > 0) {
      return false;
    }

    let list = root.getListUnderLine(from.line);
    if (!list) {
      return false;
    }

    const ranges: [Position, Position][] = [
      [
        list.getFirstLineContentStartAfterCheckbox(),
        list.getLastLineContentEnd(),
      ],
    ];

    // Ancestors also cover selections spanning several items. The synthetic
    // root has no List coordinates; its range comes from Root instead.
    while (list && list !== root.getRootList()) {
      ranges.push([
        list.getFirstLineContentStartAfterCheckbox(),
        list.getContentEndIncludingChildren(),
      ]);
      list = list.getParent();
    }
    ranges.push([rootStart, rootEnd]);

    // Skip equal or non-containing ranges, including those that would discard
    // an already selected bullet, indentation or checkbox.
    const nextRange = ranges.find(
      ([start, end]) =>
        cmpPos(start, from) <= 0 &&
        cmpPos(to, end) <= 0 &&
        (cmpPos(start, from) < 0 || cmpPos(to, end) < 0),
    );
    if (!nextRange) {
      return false;
    }

    root.replaceSelections([{ anchor: nextRange[0], head: nextRange[1] }]);
    this.stopPropagation = true;
    this.updated = true;
    return true;
  }
}
