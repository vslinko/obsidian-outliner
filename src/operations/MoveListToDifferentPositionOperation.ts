import { Operation } from "./Operation";

import { List, Root } from "../root";
import { recalculateNumericBullets } from "../root/recalculateNumericBullets";

export class MoveListToDifferentPositionOperation implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(
    private root: Root,
    private listToMove: List,
    private placeToMove: List,
    private whereToMove: "before" | "after"
  ) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    // handle move to itself and children
    if (this.listToMove === this.placeToMove) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    this.listToMove.getParent().removeChild(this.listToMove);

    if (this.whereToMove === "before") {
      this.placeToMove.getParent().addBefore(this.placeToMove, this.listToMove);
    } else {
      this.placeToMove.getParent().addAfter(this.placeToMove, this.listToMove);
    }

    this.listToMove.unindentContent(
      0,
      this.listToMove.getFirstLineIndent().length
    );
    this.listToMove.indentContent(0, this.placeToMove.getFirstLineIndent());

    // handle different indent levels
    // handle cursor
    // handle mouse cursor image
    // handle when list have fold/unfold
    // try to draw pretty box

    recalculateNumericBullets(this.root);
  }
}
