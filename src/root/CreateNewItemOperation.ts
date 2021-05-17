import { List, Root } from ".";
import { IOperation } from "./IOperation";

export class CreateNewItemOperation implements IOperation {
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
    const lines = list.getLinesInfo();

    if (lines.length === 1 && lines[0].text === "") {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    const cursor = root.getCursor();

    const endPos = list.getLastLineContentEnd();
    const onChildLevel =
      !list.isEmpty() && cursor.line === endPos.line && cursor.ch === endPos.ch;

    const indent = onChildLevel
      ? list.getChildren()[0].getFirstLineIndent()
      : list.getFirstLineIndent();

    const bullet = onChildLevel
      ? list.getChildren()[0].getBullet()
      : list.getBullet();

    const { oldLines, newLines } = lines.reduce(
      (acc, line) => {
        if (cursor.line > line.from.line) {
          acc.oldLines.push(line.text);
        } else if (cursor.line === line.from.line) {
          const a = line.text.slice(0, cursor.ch - line.from.ch);
          const b = line.text.slice(cursor.ch - line.from.ch);
          acc.oldLines.push(a);
          acc.newLines.push(b);
        } else if (cursor.line < line.from.line) {
          acc.newLines.push(line.text);
        }

        return acc;
      },
      {
        oldLines: [],
        newLines: [],
      }
    );

    const newList = new List(
      list.getRoot(),
      indent,
      bullet,
      newLines.shift(),
      false
    );

    if (newLines.length > 0) {
      newList.setNotesIndent(list.getNotesIndent());
      for (const line of newLines) {
        newList.addLine(line);
      }
    }

    if (onChildLevel) {
      list.addBeforeAll(newList);
    } else {
      const children = list.getChildren();
      for (const child of children) {
        list.removeChild(child);
        newList.addAfterAll(child);
      }

      list.getParent().addAfter(list, newList);
    }

    list.replaceLines(oldLines);

    root.replaceCursor(newList.getFirstLineContentStart());
  }
}
