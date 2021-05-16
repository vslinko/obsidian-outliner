import { Root } from ".";
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
    this.stopPropagation = true;

    const list = this.root.getListUnderCursor();
    const parent = list.getParent();
    const grandParent = parent.getParent();

    if (!grandParent) {
      return;
    }

    this.updated = true;

    const listStartLineBefore = this.root.getContentLinesRangeOf(list)[0];
    const indentRmFrom = parent.getFirstLineIndent().length;
    const indentRmTill = list.getFirstLineIndent().length;

    parent.removeChild(list);
    grandParent.addAfter(parent, list);
    list.unindentContent(indentRmFrom, indentRmTill);

    const listStartLineAfter = this.root.getContentLinesRangeOf(list)[0];
    const lineDiff = listStartLineAfter - listStartLineBefore;
    const chDiff = indentRmTill - indentRmFrom;

    const cursor = this.root.getCursor();
    this.root.replaceCursor({
      line: cursor.line + lineDiff,
      ch: cursor.ch - chDiff,
    });
  }
}
