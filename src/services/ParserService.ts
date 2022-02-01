import { List, Root } from "../root";
import { LoggerService } from "../services/LoggerService";

const bulletSign = `(?:[-*+]|\\d+\\.)`;

const listItemWithoutSpacesRe = new RegExp(`^${bulletSign}( |\t)`);
const listItemRe = new RegExp(`^[ \t]*${bulletSign}( |\t)`);
const stringWithSpacesRe = new RegExp(`^[ \t]+`);
const parseListItemRe = new RegExp(`^([ \t]*)(${bulletSign})( |\t)(.*)$`);

export interface ReaderPosition {
  line: number;
  ch: number;
}

export interface ReaderSelection {
  anchor: ReaderPosition;
  head: ReaderPosition;
}

export interface Reader {
  getCursor(): ReaderPosition;
  getLine(n: number): string;
  lastLine(): number;
  listSelections(): ReaderSelection[];
  getAllFoldedLines(): number[];
}

interface ParseListList {
  getFirstLineIndent(): string;
  setNotesIndent(notesIndent: string): void;
  getNotesIndent(): string | null;
  addLine(text: string): void;
  getParent(): ParseListList | null;
  addAfterAll(list: ParseListList): void;
}

export class ParserService {
  constructor(private logger: LoggerService) {}

  parseRange(editor: Reader, fromLine = 0, toLine = editor.lastLine()): Root[] {
    const lists: Root[] = [];

    for (let i = fromLine; i <= toLine; i++) {
      const line = editor.getLine(i);

      if (i === fromLine || this.isListItem(line)) {
        const list = this.parseWithLimits(editor, i, fromLine, toLine);

        if (list) {
          lists.push(list);
          i = list.getRange()[1].line;
        }
      }
    }

    return lists;
  }

  parse(editor: Reader, cursor = editor.getCursor()): Root | null {
    return this.parseWithLimits(editor, cursor.line, 0, editor.lastLine());
  }

  private parseWithLimits(
    editor: Reader,
    parsingStartLine: number,
    limitFrom: number,
    limitTo: number
  ): Root | null {
    const d = this.logger.bind("parseList");
    const error = (msg: string): null => {
      d(msg);
      return null;
    };

    const line = editor.getLine(parsingStartLine);

    let listLookingPos: number | null = null;

    if (this.isListItem(line)) {
      listLookingPos = parsingStartLine;
    } else if (this.isLineWithIndent(line)) {
      let listLookingPosSearch = parsingStartLine - 1;
      while (listLookingPosSearch >= 0) {
        const line = editor.getLine(listLookingPosSearch);
        if (this.isListItem(line)) {
          listLookingPos = listLookingPosSearch;
          break;
        } else if (this.isLineWithIndent(line)) {
          listLookingPosSearch--;
        } else {
          break;
        }
      }
    }

    if (listLookingPos == null) {
      return null;
    }

    let listStartLine: number | null = null;
    let listStartLineLookup = listLookingPos;
    while (listStartLineLookup >= 0) {
      const line = editor.getLine(listStartLineLookup);
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
        break;
      }
      if (this.isListItemWithoutSpaces(line)) {
        listStartLine = listStartLineLookup;
        if (listStartLineLookup <= limitFrom) {
          break;
        }
      }
      listStartLineLookup--;
    }

    if (listStartLine === null) {
      return null;
    }

    let listEndLine = listLookingPos;
    let listEndLineLookup = listLookingPos;
    while (listEndLineLookup <= editor.lastLine()) {
      const line = editor.getLine(listEndLineLookup);
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
        break;
      }
      if (!this.isEmptyLine(line)) {
        listEndLine = listEndLineLookup;
      }
      if (listEndLineLookup >= limitTo) {
        listEndLine = limitTo;
        break;
      }
      listEndLineLookup++;
    }

    if (listStartLine > parsingStartLine || listEndLine < parsingStartLine) {
      return null;
    }

    const root = new Root(
      { line: listStartLine, ch: 0 },
      { line: listEndLine, ch: editor.getLine(listEndLine).length },
      editor.listSelections().map((r) => ({
        anchor: { line: r.anchor.line, ch: r.anchor.ch },
        head: { line: r.head.line, ch: r.head.ch },
      }))
    );

    let currentParent: ParseListList = root.getRootList();
    let currentList: ParseListList | null = null;
    let currentIndent = "";

    const foldedLines = editor.getAllFoldedLines();

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const matches = parseListItemRe.exec(line);

      if (matches) {
        const [, indent, bullet, spaceAfterBullet, content] = matches;

        const compareLength = Math.min(currentIndent.length, indent.length);
        const indentSlice = indent.slice(0, compareLength);
        const currentIndentSlice = currentIndent.slice(0, compareLength);

        if (indentSlice !== currentIndentSlice) {
          const expected = currentIndentSlice
            .replace(/ /g, "S")
            .replace(/\t/g, "T");
          const got = indentSlice.replace(/ /g, "S").replace(/\t/g, "T");

          return error(
            `Unable to parse list: expected indent "${expected}", got "${got}"`
          );
        }

        if (indent.length > currentIndent.length) {
          currentParent = currentList;
          currentIndent = indent;
        } else if (indent.length < currentIndent.length) {
          while (
            currentParent.getFirstLineIndent().length >= indent.length &&
            currentParent.getParent()
          ) {
            currentParent = currentParent.getParent();
          }
          currentIndent = indent;
        }

        const foldRoot = foldedLines.includes(l);

        currentList = new List(
          root,
          indent,
          bullet,
          spaceAfterBullet,
          content,
          foldRoot
        );
        currentParent.addAfterAll(currentList);
      } else if (this.isLineWithIndent(line)) {
        if (!currentList) {
          return error(
            `Unable to parse list: expected list item, got empty line`
          );
        }

        const indentToCheck = currentList.getNotesIndent() || currentIndent;

        if (line.indexOf(indentToCheck) !== 0) {
          const expected = indentToCheck.replace(/ /g, "S").replace(/\t/g, "T");
          const got = line
            .match(/^[ \t]*/)[0]
            .replace(/ /g, "S")
            .replace(/\t/g, "T");

          return error(
            `Unable to parse list: expected indent "${expected}", got "${got}"`
          );
        }

        if (!currentList.getNotesIndent()) {
          const matches = line.match(/^[ \t]+/);

          if (!matches || matches[0].length <= currentIndent.length) {
            if (/^\s+$/.test(line)) {
              continue;
            }

            return error(
              `Unable to parse list: expected some indent, got no indent`
            );
          }

          currentList.setNotesIndent(matches[0]);
        }

        currentList.addLine(line.slice(currentList.getNotesIndent().length));
      } else {
        return error(
          `Unable to parse list: expected list item or note, got "${line}"`
        );
      }
    }

    return root;
  }

  private isEmptyLine(line: string) {
    return line.length === 0;
  }

  private isLineWithIndent(line: string) {
    return stringWithSpacesRe.test(line);
  }

  private isListItem(line: string) {
    return listItemRe.test(line);
  }

  private isListItemWithoutSpaces(line: string) {
    return listItemWithoutSpacesRe.test(line);
  }
}
