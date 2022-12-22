import { Operation } from "./Operation";

import { Position, Root } from "../root";

export class SelectTillLineStartOperation implements Operation {
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
    this.updated = true;

    const cursor = root.getCursor();
    const list = root.getListUnderCursor();
    const lines = list.getLinesInfo();
    const lineNo = lines.findIndex((l) => l.from.line === cursor.line);
    const offset = lineNo === 0 ? list.getCheckboxLength() : 0;

    const newHead: Position = {
      ch: lines[lineNo].from.ch + offset,
      line: lines[lineNo].from.line,
    };

    root.replaceSelections([{ head: newHead, anchor: cursor }]);
  }
}
