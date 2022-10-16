import { Operation } from "./Operation";

import { List, Position, Root } from "../root";
import { recalculateNumericBullets } from "../root/recalculateNumericBullets";
import { isEmptyLineOrEmptyCheckbox } from "../utils/isEmptyLineOrEmptyCheckbox";

export interface GetZoomRange {
  getZoomRange(): { from: Position; to: Position } | null;
}

export class CreateNewItemOperation implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(
    private root: Root,
    private defaultIndentChars: string,
    private getZoomRange: GetZoomRange
  ) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleSelection()) {
      return;
    }

    const selection = root.getSelection();
    if (!selection || selection.anchor.line !== selection.head.line) {
      return;
    }

    const list = root.getListUnderCursor();
    const lines = list.getLinesInfo();

    if (lines.length === 1 && isEmptyLineOrEmptyCheckbox(lines[0].text)) {
      return;
    }

    const cursor = root.getCursor();
    const lineUnderCursor = lines.find((l) => l.from.line === cursor.line);

    if (cursor.ch < lineUnderCursor.from.ch) {
      return;
    }

    const { oldLines, newLines } = lines.reduce(
      (acc, line) => {
        if (cursor.line > line.from.line) {
          acc.oldLines.push(line.text);
        } else if (cursor.line === line.from.line) {
          const left = line.text.slice(0, selection.from - line.from.ch);
          const right = line.text.slice(selection.to - line.from.ch);
          acc.oldLines.push(left);
          acc.newLines.push(right);
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

    const codeBlockBacticks = oldLines.join("\n").split("```").length - 1;
    const isInsideCodeblock =
      codeBlockBacticks > 0 && codeBlockBacticks % 2 !== 0;

    if (isInsideCodeblock) {
      return;
    }

    this.stopPropagation = true;
    this.updated = true;

    const zoomRange = this.getZoomRange.getZoomRange();
    const listIsZoomingRoot = Boolean(
      zoomRange &&
        list.getFirstLineContentStart().line >= zoomRange.from.line &&
        list.getLastLineContentEnd().line <= zoomRange.from.line
    );

    const hasChildren = !list.isEmpty();
    const childIsFolded = list.isFoldRoot();
    const endPos = list.getLastLineContentEnd();
    const endOfLine = cursor.line === endPos.line && cursor.ch === endPos.ch;

    const onChildLevel =
      listIsZoomingRoot || (hasChildren && !childIsFolded && endOfLine);

    const indent = onChildLevel
      ? hasChildren
        ? list.getChildren()[0].getFirstLineIndent()
        : list.getFirstLineIndent() + this.defaultIndentChars
      : list.getFirstLineIndent();

    const bullet =
      onChildLevel && hasChildren
        ? list.getChildren()[0].getBullet()
        : list.getBullet();

    const spaceAfterBullet =
      onChildLevel && hasChildren
        ? list.getChildren()[0].getSpaceAfterBullet()
        : list.getSpaceAfterBullet();

    const prefix = oldLines[0].match(/^\[.\]/) ? "[ ] " : "";

    const newList = new List(
      list.getRoot(),
      indent,
      bullet,
      spaceAfterBullet,
      prefix + newLines.shift(),
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
      if (!childIsFolded || !endOfLine) {
        const children = list.getChildren();
        for (const child of children) {
          list.removeChild(child);
          newList.addAfterAll(child);
        }
      }

      list.getParent().addAfter(list, newList);
    }

    list.replaceLines(oldLines);

    const newListStart = newList.getFirstLineContentStart();
    root.replaceCursor({
      line: newListStart.line,
      ch: newListStart.ch + prefix.length,
    });

    recalculateNumericBullets(root);
  }
}
