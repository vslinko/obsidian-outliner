import { Operation } from "./Operation";
import { OutdentList } from "./OutdentList";

import { Root } from "../root";
import { isEmptyLineOrEmptyCheckbox } from "../utils/isEmptyLineOrEmptyCheckbox";

export class OutdentListIfItsEmpty implements Operation {
  private outdentList: OutdentList;

  constructor(private root: Root) {
    this.outdentList = new OutdentList(root);
  }

  shouldStopPropagation() {
    return this.outdentList.shouldStopPropagation();
  }

  shouldUpdate() {
    return this.outdentList.shouldUpdate();
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

    this.outdentList.perform();
  }
}
