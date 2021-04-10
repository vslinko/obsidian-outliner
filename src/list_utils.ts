import { diffLines } from "diff";
import { Logger } from "./logger";
import { ObsidianUtils } from "./obsidian_utils";
import { IList, List, Root } from "./root";

export class ListUtils {
  constructor(private logger: Logger, private obsidianUtils: ObsidianUtils) {}

  getListLineInfo(line: string, indentSign: string) {
    const prefixRe = new RegExp(`^(?:${indentSign})*([-*]) `);
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
      prefixLength,
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

      const list = new List(indentSign, bullet, content);
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

    const diff = diffLines(oldString, newString);
    let l = root.getListStartPosition().line;
    for (const change of diff) {
      if (change.added) {
        editor.replaceRange(change.value, { line: l, ch: 0 });
        l += change.count;
      } else if (change.removed) {
        const withNewline = /\n$/.test(change.value);
        const tillLine = withNewline ? l + change.count : l + change.count - 1;
        const tillCh = withNewline ? 0 : editor.getLine(tillLine).length;
        editor.replaceRange(
          "",
          { line: l, ch: 0 },
          { line: tillLine, ch: tillCh }
        );
      } else {
        l += change.count;
      }
    }

    const oldCursor = editor.getCursor();
    const newCursor = root.getCursor();

    if (oldCursor.line != newCursor.line || oldCursor.ch != newCursor.ch) {
      editor.setCursor(newCursor);
    }
  }

  detectListIndentSign(editor: CodeMirror.Editor, cursor: CodeMirror.Position) {
    const d = this.logger.bind("ObsidianOutlinerPlugin::detectListIndentSign");

    const { useTab, tabSize } = this.obsidianUtils.getObsidianTabsSettigns();
    const defaultIndentSign = useTab
      ? "\t"
      : new Array(tabSize).fill(" ").join("");

    const line = editor.getLine(cursor.line);

    const withTabsRe = /^\t+[-*] /;
    const withSpacesRe = /^[ ]+[-*] /;
    const mayBeWithSpacesRe = /^[ ]*[-*] /;

    if (withTabsRe.test(line)) {
      d("detected tab on current line");
      return "\t";
    }

    if (withSpacesRe.test(line)) {
      d("detected whitespaces on current line, trying to count");
      const spacesA = line.length - line.trimLeft().length;

      let lineNo = cursor.line - 1;
      while (lineNo >= editor.firstLine()) {
        const line = editor.getLine(lineNo);
        if (!mayBeWithSpacesRe.test(line)) {
          break;
        }
        const spacesB = line.length - line.trimLeft().length;
        if (spacesB < spacesA) {
          const l = spacesA - spacesB;
          d(`detected ${l} whitespaces`);
          return new Array(l).fill(" ").join("");
        }

        lineNo--;
      }

      d("unable to detect");
      return null;
    }

    if (mayBeWithSpacesRe.test(line)) {
      d("detected nothing on current line, looking forward");
      const spacesA = line.length - line.trimLeft().length;

      let lineNo = cursor.line + 1;
      while (lineNo <= editor.lastLine()) {
        const line = editor.getLine(lineNo);
        if (withTabsRe.test(line)) {
          d("detected tab");
          return "\t";
        }
        if (!mayBeWithSpacesRe.test(line)) {
          break;
        }
        const spacesB = line.length - line.trimLeft().length;
        if (spacesB > spacesA) {
          const l = spacesB - spacesA;
          d(`detected ${l} whitespaces`);
          return new Array(l).fill(" ").join("");
        }

        lineNo++;
      }

      d(`detected nothing, using default useTab=${useTab} tabSize=${tabSize}`);
      return defaultIndentSign;
    }

    d("unable to detect");
    return null;
  }

  isCursorInList(editor: CodeMirror.Editor) {
    return this.detectListIndentSign(editor, editor.getCursor()) !== null;
  }
}
