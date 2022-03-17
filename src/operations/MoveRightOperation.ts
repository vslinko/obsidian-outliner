import { Operation } from "./Operation";

import { List, Root } from "../root";
import { recalculateNumericBullets } from "../root/recalculateNumericBullets";

export class MoveRightOperation implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root, private defaultIndentChars: string) {}

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
    const toIndent = lists.filter((l) => l.getLevel() === minLevel);

    for (let i = 0; i < toIndent.length; i++) {
      this.indentList(toIndent[i]);

      if (i === 0 && !this.updated) {
        break;
      }
    }

    recalculateNumericBullets(this.root);
  }

  private indentList(list: List) {
    const { root } = this;

    const parent = list.getParent();
    const prev = parent.getPrevSiblingOf(list);

    if (!prev) {
      return;
    }

    this.updated = true;

    const listLinesRangeBefore = list.getListRangeWithChildren();

    const indentPos = list.getFirstLineIndent().length;
    let indentChars = "";

    if (indentChars === "" && !prev.isEmpty()) {
      indentChars = prev
        .getChildren()[0]
        .getFirstLineIndent()
        .slice(prev.getFirstLineIndent().length);
    }

    if (indentChars === "") {
      indentChars = list
        .getFirstLineIndent()
        .slice(parent.getFirstLineIndent().length);
    }

    if (indentChars === "" && !list.isEmpty()) {
      indentChars = list.getChildren()[0].getFirstLineIndent();
    }

    if (indentChars === "") {
      indentChars = this.defaultIndentChars;
    }

    parent.removeChild(list);
    prev.addAfterAll(list);
    list.indentContent(indentPos, indentChars);

    const listLinesRangeAfter = list.getListRangeWithChildren();
    const lineDiff =
      listLinesRangeAfter.anchor.line - listLinesRangeBefore.anchor.line;

    const selection = root.getSelections()[0];

    if (
      selection.anchor.line >= listLinesRangeBefore.anchor.line &&
      selection.anchor.line <= listLinesRangeBefore.head.line
    ) {
      selection.anchor.line += lineDiff;

      if (selection.anchor.ch > 0) {
        selection.anchor.ch += indentChars.length;
      }
    }

    if (
      selection.head.line >= listLinesRangeBefore.anchor.line &&
      selection.head.line <= listLinesRangeBefore.head.line
    ) {
      selection.head.line += lineDiff;
      selection.head.ch += indentChars.length;
    }

    root.replaceSelections([selection]);
  }
}
