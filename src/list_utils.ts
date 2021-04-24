import { Logger } from "./logger";
import { ObsidianUtils } from "./obsidian_utils";
import { IList, List, Root } from "./root";

const bulletSign = "-*+";

const listItemWithTabsRe = new RegExp(`^\t+[${bulletSign}] `);
const listItemWithSpacesRe = new RegExp(`^[ ]+[${bulletSign}] `);
const listItemMayBeWithSpacesRe = new RegExp(`^[ ]*[${bulletSign}] `);
const listItemWithoutSpacesRe = new RegExp(`^[${bulletSign}] `);
const listItemRe = new RegExp(`^[ \t]*[${bulletSign}] `);
const stringWithSpacesRe = new RegExp(`^[ \t]+`);

export class ListUtils {
  constructor(private logger: Logger, private obsidianUtils: ObsidianUtils) {}

  getListLinePrefixLength(line: string) {
    const prefixRe = new RegExp(`^[ \t]*[${bulletSign}] `);
    const matches = prefixRe.exec(line);

    if (!matches) {
      return null;
    }

    return matches[0].length;
  }

  private getListLineInfo(line: string, indentSign: string) {
    const prefixRe = new RegExp(`^(?:${indentSign})*([${bulletSign}]) `);
    const matches = prefixRe.exec(line);

    if (!matches) {
      return null;
    }

    const prefixLength = matches[0].length;
    const bullet = matches[1];
    const content = line.slice(prefixLength);
    const indentLevel = (prefixLength - 2) / indentSign.length;

    return {
      bullet,
      content,
      indentLevel,
    };
  }

  parseList(editor: CodeMirror.Editor, cursor = editor.getCursor()): Root {
    const cursorLine = cursor.line;
    const cursorCh = cursor.ch;
    const line = editor.getLine(cursorLine);

    const indentSign = this.detectListIndentSign(editor, cursor);

    if (indentSign === null) {
      return null;
    }

    let listStartLine = cursorLine;
    const listStartCh = 0;
    while (listStartLine >= 1) {
      const line = editor.getLine(listStartLine - 1);
      if (!this.getListLineInfo(line, indentSign)) {
        break;
      }
      listStartLine--;
    }

    let listEndLine = cursorLine;
    let listEndCh = line.length;
    while (listEndLine < editor.lineCount()) {
      const line = editor.getLine(listEndLine + 1);
      if (!this.getListLineInfo(line, indentSign)) {
        break;
      }
      listEndCh = line.length;
      listEndLine++;
    }

    const root = new Root(
      indentSign,
      { line: listStartLine, ch: listStartCh },
      { line: listEndLine, ch: listEndCh },
      { line: cursorLine, ch: cursorCh }
    );

    let currentLevel: IList = root;
    let lastList: IList = root;

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const { bullet, content, indentLevel } = this.getListLineInfo(
        line,
        indentSign
      );
      const folded = (editor as any).isFolded({
        line: l,
        ch: 0,
      });

      if (indentLevel === currentLevel.getLevel() + 1) {
        currentLevel = lastList;
      } else if (indentLevel < currentLevel.getLevel()) {
        while (indentLevel < currentLevel.getLevel()) {
          currentLevel = currentLevel.getParent();
        }
      } else if (indentLevel != currentLevel.getLevel()) {
        console.error(`Unable to parse list`);
        return null;
      }

      const list = new List(indentSign, bullet, content, folded);
      currentLevel.addAfterAll(list);
      lastList = list;
    }

    return root;
  }

  applyChanges(editor: CodeMirror.Editor, root: Root) {
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

  detectListIndentSign(
    editor: CodeMirror.Editor,
    cursor: CodeMirror.Position
  ): string | null {
    const d = this.logger.bind("ObsidianOutlinerPlugin::detectListIndentSign");

    const { useTab, tabSize } = this.obsidianUtils.getObsidianTabsSettigns();
    const defaultIndentSign = useTab
      ? "\t"
      : new Array(tabSize).fill(" ").join("");

    const line = editor.getLine(cursor.line);

    if (listItemWithTabsRe.test(line)) {
      d("detected tab on current line");
      return "\t";
    }

    if (listItemWithSpacesRe.test(line)) {
      d("detected whitespaces on current line, trying to count");
      const spacesA = line.length - line.trimLeft().length;

      let lineNo = cursor.line - 1;
      while (lineNo >= editor.firstLine()) {
        const line = editor.getLine(lineNo);

        if (listItemMayBeWithSpacesRe.test(line)) {
          const spacesB = line.length - line.trimLeft().length;

          if (spacesB < spacesA) {
            const l = spacesA - spacesB;
            d(`detected ${l} whitespaces`);
            return new Array(l).fill(" ").join("");
          }
        }

        if (line.trim().length > 0 && !stringWithSpacesRe.test(line)) {
          break;
        }

        lineNo--;
      }

      d("unable to detect");
      return null;
    }

    if (listItemWithoutSpacesRe.test(line)) {
      d("detected nothing on current line, looking forward");
      const spacesA = line.length - line.trimLeft().length;

      let lineNo = cursor.line + 1;
      while (lineNo <= editor.lastLine()) {
        const line = editor.getLine(lineNo);

        if (listItemWithTabsRe.test(line)) {
          d("detected tab");
          return "\t";
        }

        if (listItemMayBeWithSpacesRe.test(line)) {
          const spacesB = line.length - line.trimLeft().length;

          if (spacesB > spacesA) {
            const l = spacesB - spacesA;
            d(`detected ${l} whitespaces`);
            return new Array(l).fill(" ").join("");
          }
        }

        if (line.trim().length > 0 && !stringWithSpacesRe.test(line)) {
          break;
        }

        lineNo++;
      }

      d(`detected nothing, using default useTab=${useTab} tabSize=${tabSize}`);
      return defaultIndentSign;
    }

    if (stringWithSpacesRe.test(line)) {
      d(`detected notes, looking backward for list item`);
      let lineNo = cursor.line - 1;
      while (lineNo >= editor.firstLine()) {
        const line = editor.getLine(lineNo);

        if (listItemRe.test(line)) {
          d(`found list item on line ${lineNo}`);
          return this.detectListIndentSign(editor, {
            line: lineNo,
            ch: 0,
          });
        }

        if (line.trim().length > 0 && !stringWithSpacesRe.test(line)) {
          break;
        }

        lineNo--;
      }
    }

    d("unable to detect");
    return null;
  }

  isCursorInList(editor: CodeMirror.Editor) {
    return this.detectListIndentSign(editor, editor.getCursor()) !== null;
  }
}
