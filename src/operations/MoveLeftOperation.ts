import { Operation } from "./Operation";

import { List, Root } from "../root";
import { recalculateNumericBullets } from "../root/recalculateNumericBullets";

export class MoveLeftOperation implements Operation {
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

    if (!root.hasSingleSelection()) {
      return;
    }

    this.stopPropagation = true;

    const lists = root.getListsUnderSelections();

    const minLevel = lists.reduce(
      (acc, list) => Math.min(acc, list.getLevel()),
      lists[0].getLevel()
    );
    const toOutdent = lists.filter((l) => l.getLevel() === minLevel);

    for (const list of toOutdent.reverse()) {
      this.outdentList(list);
    }

    recalculateNumericBullets(root);
  }

  private outdentList(list: List) {
    const { root } = this;

    this.stopPropagation = true;

    const parent = list.getParent();
    const grandParent = parent.getParent();

    if (!grandParent) {
      return;
    }

    this.updated = true;

    const listLinesRangeBefore = list.getListRangeWithChildren();
    const indentRmFrom = parent.getFirstLineIndent().length;
    const indentRmTill = list.getFirstLineIndent().length;

    parent.removeChild(list);
    grandParent.addAfter(parent, list);
    list.unindentContent(indentRmFrom, indentRmTill);

    const listLinesRangeAfter = list.getListRangeWithChildren();
    const lineDiff =
      listLinesRangeAfter.anchor.line - listLinesRangeBefore.anchor.line;
    const chDiff = indentRmTill - indentRmFrom;

    const selection = root.getSelections()[0];

    if (
      selection.anchor.line >= listLinesRangeBefore.anchor.line &&
      selection.anchor.line <= listLinesRangeBefore.head.line
    ) {
      selection.anchor.line += lineDiff;
      selection.anchor.ch = Math.max(0, selection.anchor.ch - chDiff);
    }

    if (
      selection.head.line >= listLinesRangeBefore.anchor.line &&
      selection.head.line <= listLinesRangeBefore.head.line
    ) {
      selection.head.line += lineDiff;
      selection.head.ch = Math.max(0, selection.head.ch - chDiff);
    }

    root.replaceSelections([selection]);
  }
}
