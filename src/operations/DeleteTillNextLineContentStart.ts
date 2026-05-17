import { DeleteTillPreviousLineContentEnd } from "./DeleteTillPreviousLineContentEnd";
import { Operation } from "./Operation";

import { Root } from "../root";

export class DeleteTillNextLineContentStart implements Operation {
  private deleteTillPreviousLineContentEnd: DeleteTillPreviousLineContentEnd;

  constructor(
    private root: Root,
    private numericBulletsEnabled: boolean,
  ) {
    this.deleteTillPreviousLineContentEnd =
      new DeleteTillPreviousLineContentEnd(root, numericBulletsEnabled);
  }

  shouldStopPropagation() {
    return this.deleteTillPreviousLineContentEnd.shouldStopPropagation();
  }

  shouldUpdate() {
    return this.deleteTillPreviousLineContentEnd.shouldUpdate();
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
      (l) => cursor.ch === l.to.ch && cursor.line === l.to.line,
    );

    if (lineNo === lines.length - 1) {
      const nextLine = lines[lineNo].to.line + 1;
      const nextList = root.getListUnderLine(nextLine);
      if (!nextList) {
        return;
      }
      root.replaceCursor(nextList.getFirstLineContentStart());
      this.deleteTillPreviousLineContentEnd.perform();
    } else if (lineNo >= 0) {
      root.replaceCursor(lines[lineNo + 1].from);
      this.deleteTillPreviousLineContentEnd.perform();
    }
  }
}
