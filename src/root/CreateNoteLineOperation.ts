import { Root } from ".";
import { IOperation } from "./IOperation";

export class CreateNoteLineOperation implements IOperation {
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
    this.stopPropagation = true;
    this.updated = true;

    const { root } = this;
    const cursor = root.getCursor();
    const list = root.getListUnderCursor();

    if (!list.getNotesIndent()) {
      const indent = list.isEmpty()
        ? list.getFirstLineIndent() + this.defaultIndentChars
        : list.getChildren()[0].getFirstLineIndent();

      list.setNotesIndent(indent);
    }

    const lines = list.getLinesInfo().reduce((acc, line) => {
      if (cursor.line === line.from.line) {
        acc.push(line.text.slice(0, cursor.ch - line.from.ch));
        acc.push(line.text.slice(cursor.ch - line.from.ch));
      } else {
        acc.push(line.text);
      }

      return acc;
    }, [] as string[]);

    list.replaceLines(lines);

    root.replaceCursor({
      line: cursor.line + 1,
      ch: list.getNotesIndent().length,
    });
  }
}
