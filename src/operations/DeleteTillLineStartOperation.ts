import { Operation } from "./Operation";

import { Root } from "../root";

export class DeleteTillLineStartOperation implements Operation {
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

    lines[lineNo].text = lines[lineNo].text.slice(
      cursor.ch - lines[lineNo].from.ch
    );

    list.replaceLines(lines.map((l) => l.text));
    root.replaceCursor(lines[lineNo].from);
  }
}
