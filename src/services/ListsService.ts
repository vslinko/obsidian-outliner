import { LoggerService } from "./LoggerService";
import { ObsidianService } from "./ObsidianService";
import { List, Root } from "../root";
import { IOperation } from "../operations/IOperation";

const bulletSign = `(?:[-*+]|\\d+\\.)`;

const listItemWithoutSpacesRe = new RegExp(`^${bulletSign} `);
const listItemRe = new RegExp(`^[ \t]*${bulletSign} `);
const stringWithSpacesRe = new RegExp(`^[ \t]+`);
const parseListItemRe = new RegExp(`^([ \t]*)(${bulletSign}) (.*)$`);

export interface IApplyChangesList {
  isFoldRoot(): boolean;
}

export interface IApplyChangesRoot {
  getRange(): [CodeMirror.Position, CodeMirror.Position];
  getSelections(): { anchor: CodeMirror.Position; head: CodeMirror.Position }[];
  print(): string;
  getListUnderLine(l: number): IApplyChangesList;
}

interface IParseListList {
  getFirstLineIndent(): string;
  setNotesIndent(notesIndent: string): void;
  getNotesIndent(): string | null;
  addLine(text: string): void;
  getParent(): IParseListList | null;
  addAfterAll(list: IParseListList): void;
}

export class ListsService {
  constructor(
    private loggerService: LoggerService,
    private obsidianService: ObsidianService
  ) {}

  evalOperation(root: Root, op: IOperation, editor: CodeMirror.Editor) {
    op.perform();

    if (op.shouldUpdate()) {
      this.applyChanges(editor, root);
    }

    return {
      shouldUpdate: op.shouldUpdate(),
      shouldStopPropagation: op.shouldStopPropagation(),
    };
  }

  performOperation(
    cb: (root: Root) => IOperation,
    editor: CodeMirror.Editor,
    cursor = editor.getCursor()
  ) {
    const root = this.parseList(editor, cursor);

    if (!root) {
      return { shouldUpdate: false, shouldStopPropagation: false };
    }

    const op = cb(root);

    return this.evalOperation(root, op, editor);
  }

  parseList(
    editor: CodeMirror.Editor,
    cursor = editor.getCursor()
  ): Root | null {
    const d = this.loggerService.bind("parseList");
    const error = (msg: string): null => {
      d(msg);
      return null;
    };

    const line = editor.getLine(cursor.line);

    let listLookingPos: number | null = null;

    if (this.isListItem(line)) {
      listLookingPos = cursor.line;
    } else if (this.isLineWithIndent(line)) {
      let listLookingPosSearch = cursor.line - 1;
      while (listLookingPosSearch >= editor.firstLine()) {
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
    while (listStartLineLookup >= editor.firstLine()) {
      const line = editor.getLine(listStartLineLookup);
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
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
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
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
      editor.listSelections().map((r) => ({
        anchor: { line: r.anchor.line, ch: r.anchor.ch },
        head: { line: r.head.line, ch: r.head.ch },
      }))
    );

    let currentParent: IParseListList = root.getRootList();
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
            currentParent.getFirstLineIndent().length >= indent.length &&
            currentParent.getParent()
          ) {
            currentParent = currentParent.getParent();
          }
          currentIndent = indent;
        }

        const folded = !!(editor as any).isFolded({
          line: Math.min(l + 1, listEndLine),
          ch: 0,
        });

        currentList = new List(root, indent, bullet, content, folded);
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

  private applyChanges(editor: CodeMirror.Editor, root: IApplyChangesRoot) {
    const rootRange = root.getRange();
    const oldString = editor.getRange(rootRange[0], rootRange[1]);
    const newString = root.print();

    const fromLine = rootRange[0].line;
    const toLine = rootRange[1].line;

    for (let l = fromLine; l <= toLine; l++) {
      (editor as any).foldCode(l, null, "unfold");
    }

    let changeFrom = { ...rootRange[0] };
    let changeTo = { ...rootRange[1] };
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

    editor.setSelections(root.getSelections());

    // TODO: lines could be different because of deletetion
    for (let l = fromLine; l <= toLine; l++) {
      const line = root.getListUnderLine(l);
      if (line && line.isFoldRoot()) {
        (editor as any).foldCode(l);
      }
    }
  }

  getDefaultIndentChars() {
    const { useTab, tabSize } = this.obsidianService.getObsidianTabsSettigns();

    return useTab ? "\t" : new Array(tabSize).fill(" ").join("");
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
