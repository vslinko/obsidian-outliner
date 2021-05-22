import { IListLine, List, Root } from ".";
import { IOperation } from "./IOperation";

export class DeleteAndMergeWithPreviousLineOperation implements IOperation {
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

    if (!root.hasSingleCursor()) {
      return;
    }

    const list = root.getListUnderCursor();
    const cursor = root.getCursor();
    const lines = list.getLinesInfo();

    const lineNo = lines.findIndex(
      (l) => cursor.ch === l.from.ch && cursor.line === l.from.line
    );

    if (lineNo === 0) {
      this.mergeWithPreviousItem(root, cursor, list);
    } else if (lineNo > 0) {
      this.mergeNotes(root, cursor, list, lines, lineNo);
    }
  }

  private mergeNotes(
    root: Root,
    cursor: IPosition,
    list: List,
    lines: IListLine[],
    lineNo: number
  ) {
    this.stopPropagation = true;
    this.updated = true;

    const prevLineNo = lineNo - 1;

    root.replaceCursor({
      line: cursor.line - 1,
      ch: lines[prevLineNo].text.length + lines[prevLineNo].from.ch,
    });

    lines[prevLineNo].text += lines[lineNo].text;
    lines.splice(lineNo, 1);

    list.replaceLines(lines.map((l) => l.text));
  }

  private mergeWithPreviousItem(root: Root, cursor: IPosition, list: List) {
    if (root.getChildren()[0] === list && list.getChildren().length === 0) {
      return;
    }

    this.stopPropagation = true;

    const prev = root.getListUnderLine(cursor.line - 1);

    if (!prev) {
      return;
    }

    const bothAreEmpty = prev.isEmpty() && list.isEmpty();
    const prevIsEmptyAndSameLevel =
      prev.isEmpty() && !list.isEmpty() && prev.getLevel() == list.getLevel();
    const listIsEmptyAndPrevIsParent =
      list.isEmpty() && prev.getLevel() == list.getLevel() - 1;

    if (bothAreEmpty || prevIsEmptyAndSameLevel || listIsEmptyAndPrevIsParent) {
      this.updated = true;

      const parent = list.getParent();
      const prevEnd = prev.getLastLineContentEnd();

      if (!prev.getNotesIndent() && list.getNotesIndent()) {
        prev.setNotesIndent(
          prev.getFirstLineIndent() +
            list.getNotesIndent().slice(list.getFirstLineIndent().length)
        );
      }

      const oldLines = prev.getLines();
      const newLines = list.getLines();
      oldLines[oldLines.length - 1] += newLines[0];
      const resultLines = oldLines.concat(newLines.slice(1));

      prev.replaceLines(resultLines);
      parent.removeChild(list);

      for (const c of list.getChildren()) {
        list.removeChild(c);
        prev.addAfterAll(c);
      }

      root.replaceCursor(prevEnd);
    }
  }
}
