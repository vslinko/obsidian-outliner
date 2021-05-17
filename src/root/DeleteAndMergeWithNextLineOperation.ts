import { Root } from ".";
import { DeleteAndMergeWithPreviousLineOperation } from "./DeleteAndMergeWithPreviousLineOperation";
import { IOperation } from "./IOperation";

export class DeleteAndMergeWithNextLineOperation implements IOperation {
  private deleteAndMergeWithPrevious: DeleteAndMergeWithPreviousLineOperation;

  constructor(private root: Root) {
    this.deleteAndMergeWithPrevious =
      new DeleteAndMergeWithPreviousLineOperation(root);
  }

  shouldStopPropagation() {
    return this.deleteAndMergeWithPrevious.shouldStopPropagation();
  }

  shouldUpdate() {
    return this.deleteAndMergeWithPrevious.shouldUpdate();
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleCursor()) {
      return;
    }

    const list = root.getListUnderCursor();
    const cursor = root.getCursor();
    const contentEnd = list.getLastLineContentEnd();

    if (cursor.ch !== contentEnd.ch || cursor.line !== contentEnd.line) {
      return;
    }

    const nextLineNo = root.getCursor().line + 1;
    const nextList = root.getListUnderLine(nextLineNo);
    root.replaceCursor(nextList.getFirstLineContentStart());
    this.deleteAndMergeWithPrevious.perform();
  }
}
