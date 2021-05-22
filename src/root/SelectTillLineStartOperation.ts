import { Root } from ".";
import { IOperation } from "./IOperation";

export class SelectTillLineStartOperation implements IOperation {
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

    root.replaceSelections([{ head: lines[lineNo].from, anchor: cursor }]);
  }
}
