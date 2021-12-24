import { MoveLeftOperation } from "./MoveLeftOperation";
import { Operation } from "./Operation";

import { Root } from "../root";
import { isEmptyLineOrEmptyCheckbox } from "../utils/isEmptyLineOrEmptyCheckbox";

export class OutdentIfLineIsEmptyOperation implements Operation {
  private moveLeftOp: MoveLeftOperation;

  constructor(private root: Root) {
    this.moveLeftOp = new MoveLeftOperation(root);
  }

  shouldStopPropagation() {
    return this.moveLeftOp.shouldStopPropagation();
  }

  shouldUpdate() {
    return this.moveLeftOp.shouldUpdate();
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleCursor()) {
      return;
    }

    const list = root.getListUnderCursor();
    const lines = list.getLines();

    if (
      lines.length > 1 ||
      !isEmptyLineOrEmptyCheckbox(lines[0]) ||
      list.getLevel() === 1
    ) {
      return;
    }

    this.moveLeftOp.perform();
  }
}
