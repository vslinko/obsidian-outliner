import { Operation } from "./Operation";

import { List, Position, Range, Root, maxPos, minPos } from "../root";

// Helper functions

function isSamePosition(a: Position, b: Position): boolean {
  return a.line === b.line && a.ch === b.ch;
}

function getChainUpwards(list: List): Set<List> {
  const chain: Set<List> = new Set<List>();
  while (list) {
    chain.add(list); // Must include original
    list = list.getParent();
  }
  return chain;
}

function getCommonLink(a: List, b: List): List | null {
  const aChain = getChainUpwards(a);
  const bChain = getChainUpwards(b);
  for (const link of aChain) {
    if (bChain.has(link)) return link;
  }
  return null;
}

export class SelectAllContent implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root) {}

  shouldStopPropagation(): boolean {
    return this.stopPropagation;
  }

  shouldUpdate(): boolean {
    return this.updated;
  }

  perform(): boolean {
    const { root } = this;
    if (!root.hasSingleSelection()) return false;

    const [rootStart, rootEnd]: [Position, Position] = root.getContentRange();
    const selection: Range = root.getSelection();
    const selectionFrom: Position = minPos(selection.anchor, selection.head);
    const selectionTo: Position = maxPos(selection.anchor, selection.head);

    const isSelectionOutOfRoot: boolean =
      selectionFrom.line < rootStart.line || selectionTo.line > rootEnd.line;
    const isRootSelected: boolean =
      isSamePosition(selectionFrom, rootStart) &&
      isSamePosition(selectionTo, rootEnd);
    if (isSelectionOutOfRoot || isRootSelected) return false;

    const listUnderSelectionFrom: List = root.getListUnderLine(
      selectionFrom.line,
    );
    const listUnderSelectionTo: List = root.getListUnderLine(selectionTo.line);
    const contentStart: Position =
      listUnderSelectionFrom.getFirstLineContentStartAfterCheckbox();
    const contentEnd: Position = listUnderSelectionFrom.getLastLineContentEnd();
    const listStart: Position = contentStart;
    const listEnd: Position =
      listUnderSelectionFrom.getContentEndIncludingChildren();

    this.stopPropagation = true;
    this.updated = true;

    const isMultilineSelection: boolean =
      selectionFrom.line !== selectionTo.line;
    const isOnlyContentSelected: boolean =
      isSamePosition(selectionFrom, contentStart) &&
      isSamePosition(selectionTo, contentEnd);
    const isOnlyListSelected: boolean =
      isSamePosition(selectionFrom, listStart) &&
      isSamePosition(selectionTo, listEnd);

    // Expand multiline selection to common link in upwards chain + descendants
    if (isMultilineSelection && !isOnlyListSelected) {
      const commonLink: List = getCommonLink(
        listUnderSelectionFrom,
        listUnderSelectionTo,
      );
      if (!commonLink) return false;
      const commonLinkListStart: Position =
        commonLink.getFirstLineContentStartAfterCheckbox();
      const commonLinkListEnd: Position =
        commonLink.getContentEndIncludingChildren();
      root.replaceSelections([
        {
          anchor: commonLinkListStart,
          head: commonLinkListEnd,
        },
      ]);
      return true;
    }

    // Select line content
    if (!isMultilineSelection && !isOnlyContentSelected) {
      root.replaceSelections([{ anchor: contentStart, head: contentEnd }]);
      return true;
    }

    // Select line content + descendants
    if (isOnlyContentSelected && !isOnlyListSelected) {
      // Adding `!isOnlyListSelected` enables walking from a line without descendants
      root.replaceSelections([{ anchor: listStart, head: listEnd }]);
      return true;
    }

    // Select parent content + descendants
    const parent: List = listUnderSelectionFrom.getParent();
    if (!parent) return false;
    const parentListStart: Position =
      parent.getFirstLineContentStartAfterCheckbox();
    const parentListEnd: Position = listEnd;
    root.replaceSelections([{ anchor: parentListStart, head: parentListEnd }]);
    return true;
  }
}
