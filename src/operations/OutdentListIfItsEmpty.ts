import { Operation } from "./Operation";
import { OutdentList } from "./OutdentList";

import { List, Root } from "../root";
import { isEmptyLineOrEmptyCheckbox } from "../utils/isEmptyLineOrEmptyCheckbox";

export class OutdentListIfItsEmpty implements Operation {
  private outdentList: OutdentList;
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root) {
    this.outdentList = new OutdentList(root);
  }

  shouldStopPropagation() {
    return this.stopPropagation || this.outdentList.shouldStopPropagation();
  }

  shouldUpdate() {
    return this.updated || this.outdentList.shouldUpdate();
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleCursor()) {
      return;
    }

    const list = root.getListUnderCursor();
    const lines = list.getLines();

    if (lines.length > 1 || !isEmptyLineOrEmptyCheckbox(lines[0])) {
      return;
    }

    if (list.getLevel() === 1) {
      this.deleteListIfItIsTheLastAndHasNoChildren(list);
      return;
    }

    this.outdentList.perform();
  }

  private deleteListIfItIsTheLastAndHasNoChildren(list: List) {
    const { root } = this;
    const parent = list.getParent();
    const siblings = parent.getChildren();
    const cursor = root.getCursor();

    if (
      !list.isEmpty() ||
      siblings[siblings.length - 1] !== list ||
      cursor.ch !== list.getLastLineContentEnd().ch
    ) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    parent.removeChild(list);
    // Closing the list leaves an empty line behind. Root.print() strips
    // a single trailing newline, so an empty list item is needed to
    // represent that remaining empty line in the model.
    parent.addAfterAll(new List(root, "", "", "", "", "", false));

    root.replaceCursor({ line: cursor.line, ch: 0 });
  }
}
