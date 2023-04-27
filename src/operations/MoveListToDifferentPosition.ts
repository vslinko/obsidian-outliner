import { Operation } from "./Operation";

import { List, Root, recalculateNumericBullets } from "../root";

interface CursorAnchor {
  cursorList: List;
  lineDiff: number;
  chDiff: number;
}

export class MoveListToDifferentPosition implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(
    private root: Root,
    private listToMove: List,
    private placeToMove: List,
    private whereToMove: "before" | "after" | "inside",
    private defaultIndentChars: string
  ) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    if (this.listToMove === this.placeToMove) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    const cursorAnchor = this.calculateCursorAnchor();
    this.moveList();
    this.changeIndent();
    this.restoreCursor(cursorAnchor);
    recalculateNumericBullets(this.root);
  }

  private calculateCursorAnchor(): CursorAnchor {
    const cursorLine = this.root.getCursor().line;

    const lines = [
      this.listToMove.getFirstLineContentStart().line,
      this.listToMove.getLastLineContentEnd().line,
      this.placeToMove.getFirstLineContentStart().line,
      this.placeToMove.getLastLineContentEnd().line,
    ];
    const listStartLine = Math.min(...lines);
    const listEndLine = Math.max(...lines);

    if (cursorLine < listStartLine || cursorLine > listEndLine) {
      return null;
    }

    const cursor = this.root.getCursor();
    const cursorList = this.root.getListUnderLine(cursor.line);
    const cursorListStart = cursorList.getFirstLineContentStart();
    const lineDiff = cursor.line - cursorListStart.line;
    const chDiff = cursor.ch - cursorListStart.ch;

    return { cursorList, lineDiff, chDiff };
  }

  private moveList() {
    this.listToMove.getParent().removeChild(this.listToMove);

    switch (this.whereToMove) {
      case "before":
        this.placeToMove
          .getParent()
          .addBefore(this.placeToMove, this.listToMove);
        break;

      case "after":
        this.placeToMove
          .getParent()
          .addAfter(this.placeToMove, this.listToMove);
        break;

      case "inside":
        this.placeToMove.addBeforeAll(this.listToMove);
        break;
    }
  }

  private changeIndent() {
    const oldIndent = this.listToMove.getFirstLineIndent();
    const newIndent =
      this.whereToMove === "inside"
        ? this.placeToMove.getFirstLineIndent() + this.defaultIndentChars
        : this.placeToMove.getFirstLineIndent();
    this.listToMove.unindentContent(0, oldIndent.length);
    this.listToMove.indentContent(0, newIndent);
  }

  private restoreCursor(cursorAnchor: CursorAnchor) {
    if (cursorAnchor) {
      const cursorListStart =
        cursorAnchor.cursorList.getFirstLineContentStart();

      this.root.replaceCursor({
        line: cursorListStart.line + cursorAnchor.lineDiff,
        ch: cursorListStart.ch + cursorAnchor.chDiff,
      });
    } else {
      // When you move a list, the screen scrolls to the cursor.
      // It is better to move the cursor into the viewport than let the screen scroll.
      this.root.replaceCursor(this.listToMove.getLastLineContentEnd());
    }
  }
}
