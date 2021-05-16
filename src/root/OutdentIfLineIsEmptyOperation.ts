import { Root } from ".";
import { MoveLeftOperation } from "./MoveLeftOperation";
import { IOperation } from "./IOperation";

export class OutdentIfLineIsEmptyOperation implements IOperation {
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
    const list = this.root.getListUnderCursor();
    const lines = list.getLines();

    if (lines.length > 1 || lines[0].length > 0 || list.getLevel() === 1) {
      return;
    }

    this.moveLeftOp.perform();
  }
}
