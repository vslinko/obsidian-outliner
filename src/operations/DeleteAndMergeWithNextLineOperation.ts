import { DeleteAndMergeWithPreviousLineOperation } from "./DeleteAndMergeWithPreviousLineOperation";
import { Operation } from "./Operation";

import { Root } from "../root";

export class DeleteAndMergeWithNextLineOperation implements Operation {
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
    const lines = list.getLinesInfo();

    const lineNo = lines.findIndex(
      (l) => cursor.ch === l.to.ch && cursor.line === l.to.line
    );

    if (lineNo === lines.length - 1) {
      const nextLine = lines[lineNo].to.line + 1;
      const nextList = root.getListUnderLine(nextLine);
      if (!nextList) {
        return;
      }
      root.replaceCursor(nextList.getFirstLineContentStart());
      this.deleteAndMergeWithPrevious.perform();
    } else if (lineNo >= 0) {
      root.replaceCursor(lines[lineNo + 1].from);
      this.deleteAndMergeWithPrevious.perform();
    }
  }
}
