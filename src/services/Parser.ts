import { Logger } from "./Logger";
import { Settings } from "./Settings";

import { List, Root } from "../root";
import { checkboxRe } from "../utils/checkboxRe";

const bulletSignRe = `(?:[-*+]|\\d+\\.)`;
const optionalCheckboxRe = `(?:${checkboxRe})?`;
const defaultTabSize = 4;

const listItemRe = new RegExp(`^[ \t]*${bulletSignRe}( |\t)`);
const stringWithSpacesRe = new RegExp(`^[ \t]+`);
const parseListItemRe = new RegExp(
  `^([ \t]*)(${bulletSignRe})( |\t)(${optionalCheckboxRe})(.*)$`,
);

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

export class Parser {
  constructor(
    private logger: Logger,
    private settings: Settings,
  ) {}

  parseRange(editor: Reader, fromLine = 0, toLine = editor.lastLine()): Root[] {
    const lists: Root[] = [];

    for (let i = fromLine; i <= toLine; i++) {
      const line = editor.getLine(i);

      if (i === fromLine || this.isListItem(line)) {
        const list = this.parseWithLimits(editor, i, fromLine, toLine);

        if (list) {
          lists.push(list);
          i = list.getContentEnd().line;
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
    limitTo: number,
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

    if (listLookingPos === null) {
      return null;
    }

    let listStartLine: number | null = null;
    let listStartLineLookup = listLookingPos;
    while (listStartLineLookup >= 0) {
      const line = editor.getLine(listStartLineLookup);
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
        break;
      }
      if (this.isListItem(line)) {
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

    // if the last line contains only spaces and that's incorrect indent, then ignore the last line
    // https://github.com/vslinko/obsidian-outliner/issues/368
    if (listEndLine > listStartLine) {
      const lastLine = editor.getLine(listEndLine);
      if (lastLine.trim().length === 0) {
        const prevLine = editor.getLine(listEndLine - 1);
        const [, prevLineIndent] = /^(\s*)/.exec(prevLine);
        if (!lastLine.startsWith(prevLineIndent)) {
          listEndLine--;
        }
      }
    }

    const root = new Root(
      { line: listStartLine, ch: 0 },
      { line: listEndLine, ch: editor.getLine(listEndLine).length },
      editor.listSelections().map((r) => ({
        anchor: { line: r.anchor.line, ch: r.anchor.ch },
        head: { line: r.head.line, ch: r.head.ch },
      })),
    );

    const firstListItem = parseListItemRe.exec(editor.getLine(listStartLine));
    const baseIndentWidth = firstListItem
      ? this.getIndentWidth(firstListItem[1])
      : 0;
    const indentWidths = new WeakMap<ParseListList, number>();

    let currentParent: ParseListList = root.getRootList();
    indentWidths.set(currentParent, 0);
    let currentList: ParseListList | null = null;
    let currentIndentWidth = 0;

    const foldedLines = editor.getAllFoldedLines();

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const matches = parseListItemRe.exec(line);

      if (matches) {
        const [, indent, bullet, spaceAfterBullet] = matches;
        let [, , , , optionalCheckbox, content] = matches;

        content = optionalCheckbox + content;
        if (this.settings.keepCursorWithinContent !== "bullet-and-checkbox") {
          optionalCheckbox = "";
        }

        const indentWidth = this.getIndentWidth(indent) - baseIndentWidth;

        if (indentWidth < 0) {
          return error(
            `Unable to parse list: negative indent after base shift`,
          );
        }

        if (indentWidth > currentIndentWidth) {
          currentParent = currentList;
          currentIndentWidth = indentWidth;
        } else if (indentWidth < currentIndentWidth) {
          while (
            indentWidths.get(currentParent) >= indentWidth &&
            currentParent.getParent()
          ) {
            currentParent = currentParent.getParent();
          }
          currentIndentWidth = indentWidth;
        }

        const foldRoot = foldedLines.includes(l);

        currentList = new List(
          root,
          indent,
          bullet,
          optionalCheckbox,
          spaceAfterBullet,
          content,
          foldRoot,
        );
        currentParent.addAfterAll(currentList);
        indentWidths.set(currentList, indentWidth);
      } else if (this.isLineWithIndent(line)) {
        if (!currentList) {
          return error(
            `Unable to parse list: expected list item, got empty line`,
          );
        }

        const noteIndentRaw = line.match(/^[ \t]*/)?.[0] || "";
        const noteIndentWidth =
          this.getIndentWidth(noteIndentRaw) - baseIndentWidth;
        const listIndentWidth = indentWidths.get(currentList);
        const expectedNoteIndent = currentList.getNotesIndent();
        const expectedNoteIndentWidth = expectedNoteIndent
          ? this.getIndentWidth(expectedNoteIndent) - baseIndentWidth
          : null;

        if (
          expectedNoteIndentWidth !== null &&
          noteIndentWidth !== expectedNoteIndentWidth
        ) {
          const expected = expectedNoteIndent
            .replace(/ /g, "S")
            .replace(/\t/g, "T");
          const got = noteIndentRaw.replace(/ /g, "S").replace(/\t/g, "T");

          return error(
            `Unable to parse list: expected indent "${expected}", got "${got}"`,
          );
        }

        if (!currentList.getNotesIndent()) {
          if (!noteIndentRaw || noteIndentWidth <= listIndentWidth) {
            if (/^\s+$/.test(line)) {
              continue;
            }

            return error(
              `Unable to parse list: expected some indent, got no indent`,
            );
          }

          currentList.setNotesIndent(noteIndentRaw);
        }

        currentList.addLine(line.slice(noteIndentRaw.length));
      } else {
        return error(
          `Unable to parse list: expected list item or note, got "${line}"`,
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

  private getIndentWidth(indent: string) {
    let width = 0;

    for (const char of indent) {
      if (char === "\t") {
        width += defaultTabSize;
      } else {
        width++;
      }
    }

    return width;
  }
}
