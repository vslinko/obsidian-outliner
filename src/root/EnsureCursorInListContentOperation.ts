import { Root } from ".";
import { IOperation } from "./IOperation";

export class EnsureCursorInListContentOperation implements IOperation {
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
    this.stopPropagation = true;

    const { root } = this;
    const cursor = root.getCursor();
    const list = root.getListUnderCursor();
    const contentStart = list.getFirstLineContentStart();
    const linePrefix =
      contentStart.line === cursor.line
        ? contentStart.ch
        : list.getNotesIndent().length;

    if (cursor.ch < linePrefix) {
      this.updated = true;
      root.replaceCursor({
        line: cursor.line,
        ch: linePrefix,
      });
    }
  }
}
