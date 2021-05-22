import { Root } from "../root";
import { IOperation } from "./IOperation";

export class MoveLeftOperation implements IOperation {
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

    const list = root.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();

    if (!grandParent) {
      return;
    }

    this.updated = true;

    const listStartLineBefore = root.getContentLinesRangeOf(list)[0];
    const indentRmFrom = parent.getFirstLineIndent().length;
    const indentRmTill = list.getFirstLineIndent().length;

    parent.removeChild(list);
    grandParent.addAfter(parent, list);
    list.unindentContent(indentRmFrom, indentRmTill);

    const listStartLineAfter = root.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;
    const chDiff = indentRmTill - indentRmFrom;

    const cursor = root.getCursor();
    root.replaceCursor({
      line: cursor.line + lineDiff,
      ch: cursor.ch - chDiff,
    });
  }
}
