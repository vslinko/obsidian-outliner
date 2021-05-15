import { Logger } from "./logger";
import { ObsidianUtils } from "./obsidian_utils";
import { List, Root } from "./root";

const bulletSign = "-*+";

const listItemWithoutSpacesRe = new RegExp(`^[${bulletSign}] `);
const listItemRe = new RegExp(`^[ \t]*[${bulletSign}] `);
const stringWithSpacesRe = new RegExp(`^[ \t]+`);
const parseListItemRe = new RegExp(`^([ \t]*)([${bulletSign}]) (.*)$`);

export interface IApplyChangesList {
  isFoldRoot(): boolean;
}

export interface IApplyChangesRoot {
  getListStartPosition(): CodeMirror.Position;
  getListEndPosition(): CodeMirror.Position;
  getCursor(): CodeMirror.Position;
  print(): string;
  getListUnderLine(l: number): IApplyChangesList;
}

interface IParseListList {
  getIndent(): string;
  appendContent(content: string): void;
  getParent(): IParseListList | null;
  addAfterAll(list: IParseListList): void;
}

export class ListUtils {
  constructor(private logger: Logger, private obsidianUtils: ObsidianUtils) {}

  getListItemBulletPrefixLength(line: string) {
    const prefixRe = new RegExp(`^[ \t]*[${bulletSign}] `);
    const matches = prefixRe.exec(line);

    if (!matches) {
      return null;
    }

    return matches[0].length;
  }

  isCursorInList(editor: CodeMirror.Editor, cursor = editor.getCursor()) {
    return !!this.parseList(editor, cursor);
  }

  parseList(
    editor: CodeMirror.Editor,
    cursor = editor.getCursor()
  ): Root | null {
    const d = this.logger.bind("parseList");
    const error = (msg: string): null => {
      d(msg);
      return null;
    };

    const line = editor.getLine(cursor.line);

    let listLookingPos: number | null = null;

    if (this.isListItem(line)) {
      listLookingPos = cursor.line;
    } else if (this.isEmptyLineOrNote(line)) {
      let listLookingPosSearch = cursor.line - 1;
      while (listLookingPosSearch >= editor.firstLine()) {
        const line = editor.getLine(listLookingPosSearch);
        if (this.isListItem(line)) {
          listLookingPos = listLookingPosSearch;
          break;
        } else if (this.isEmptyLineOrNote(line)) {
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
    while (listStartLineLookup >= editor.firstLine()) {
      const line = editor.getLine(listStartLineLookup);
      if (!this.isListItem(line) && !this.isEmptyLineOrNote(line)) {
        break;
      }
      if (this.isListItemWithoutSpaces(line)) {
        listStartLine = listStartLineLookup;
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
      if (!this.isListItem(line) && !this.isEmptyLineOrNote(line)) {
        break;
      }
      if (!this.isEmptyLine(line)) {
        listEndLine = listEndLineLookup;
      }
      listEndLineLookup++;
    }

    if (listStartLine > cursor.line || listEndLine < cursor.line) {
      return null;
    }

    const root = new Root(
      { line: listStartLine, ch: 0 },
      { line: listEndLine, ch: editor.getLine(listEndLine).length },
      { line: cursor.line, ch: cursor.ch },
      this.getDefaultIndentChars()
    );

    let currentParent: IParseListList = root;
    let currentList: IParseListList | null = null;
    let currentIndent = "";

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const matches = parseListItemRe.exec(line);

      if (matches) {
        const [_, indent, bullet, content] = matches;

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
            currentParent.getIndent().length >= indent.length &&
            currentParent.getParent()
          ) {
            currentParent = currentParent.getParent();
          }
          currentIndent = currentParent.getIndent();
        }

        const folded = (editor as any).isFolded({
          line: l,
          ch: 0,
        });

        currentList = new List(root, indent, bullet, content, folded);
        currentParent.addAfterAll(currentList);
      } else if (this.isEmptyLineOrNote(line)) {
        if (!currentList) {
          return error(
            `Unable to parse list: expected list item, got empty line`
          );
        }

        if (!this.isEmptyLine(line) && line.indexOf(currentIndent) !== 0) {
          const expected = currentIndent.replace(/ /g, "S").replace(/\t/g, "T");
          const got = line
            .match(/^[ \t]*/)[0]
            .replace(/ /g, "S")
            .replace(/\t/g, "T");

          return error(
            `Unable to parse list: expected indent "${expected}", got "${got}"`
          );
        }

        currentList.appendContent("\n" + line);
      } else {
        return error(
          `Unable to parse list: expected list item or empty line, got "${line}"`
        );
      }
    }

    return root;
  }

  applyChanges(editor: CodeMirror.Editor, root: IApplyChangesRoot) {
    const oldString = editor.getRange(
      root.getListStartPosition(),
      root.getListEndPosition()
    );
    const newString = root.print();

    const fromLine = root.getListStartPosition().line;
    const toLine = root.getListEndPosition().line;

    for (let l = fromLine; l <= toLine; l++) {
      (editor as any).foldCode(l, null, "unfold");
    }

    let changeFrom = root.getListStartPosition();
    let changeTo = root.getListEndPosition();
    let oldTmp = oldString;
    let newTmp = newString;

    while (true) {
      const nlIndex = oldTmp.indexOf("\n");
      if (nlIndex < 0) {
        break;
      }
      const oldLine = oldTmp.slice(0, nlIndex + 1);
      const newLine = newTmp.slice(0, oldLine.length);
      if (oldLine !== newLine) {
        break;
      }
      changeFrom.line++;
      oldTmp = oldTmp.slice(oldLine.length);
      newTmp = newTmp.slice(oldLine.length);
    }
    while (true) {
      const nlIndex = oldTmp.lastIndexOf("\n");
      if (nlIndex < 0) {
        break;
      }
      const oldLine = oldTmp.slice(nlIndex);
      const newLine = newTmp.slice(-oldLine.length);
      if (oldLine !== newLine) {
        break;
      }
      oldTmp = oldTmp.slice(0, -oldLine.length);
      newTmp = newTmp.slice(0, -oldLine.length);

      const nlIndex2 = oldTmp.lastIndexOf("\n");
      changeTo.ch =
        nlIndex2 >= 0 ? oldTmp.length - nlIndex2 - 1 : oldTmp.length;
      changeTo.line--;
    }

    if (oldTmp !== newTmp) {
      editor.replaceRange(newTmp, changeFrom, changeTo);
    }

    const oldCursor = editor.getCursor();
    const newCursor = root.getCursor();

    if (oldCursor.line != newCursor.line || oldCursor.ch != newCursor.ch) {
      editor.setCursor(newCursor);
    }

    for (let l = fromLine; l <= toLine; l++) {
      const line = root.getListUnderLine(l);
      if (line && line.isFoldRoot()) {
        // TODO: why working only with -1?
        (editor as any).foldCode(l - 1);
      }
    }
  }

  private getDefaultIndentChars() {
    const { useTab, tabSize } = this.obsidianUtils.getObsidianTabsSettigns();

    return useTab ? "\t" : new Array(tabSize).fill(" ").join("");
  }

  private isEmptyLine(line: string) {
    return line.trim().length === 0;
  }

  private isEmptyLineOrNote(line: string) {
    return this.isEmptyLine(line) || stringWithSpacesRe.test(line);
  }

  private isListItem(line: string) {
    return listItemRe.test(line);
  }

  private isListItemWithoutSpaces(line: string) {
    return listItemWithoutSpacesRe.test(line);
  }
}
