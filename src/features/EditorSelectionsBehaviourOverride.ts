import { Plugin } from "obsidian";

import { EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";

import {
  MyEditor,
  MyEditorPosition,
  getEditorFromState,
  getFoldedLinesFromState,
} from "../editor";
import { KeepCursorOutsideFoldedLines } from "../operations/KeepCursorOutsideFoldedLines";
import { RecoverCursorAfterFoldedNavigation } from "../operations/RecoverCursorAfterFoldedNavigation";
import { KeepCursorWithinListContent } from "../operations/KeepCursorWithinListContent";
import { RecoverCursorAfterArrowUp } from "../operations/RecoverCursorAfterArrowUp";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";

export function getTrackedNavigationKey(
  e: KeyboardEvent,
): "ArrowUp" | "ArrowDown" | null {
  if (shouldSkipSelectionAdjustmentsForKeydown(e)) {
    return null;
  }

  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    return e.key;
  }

  if (e.key === "j") {
    return "ArrowDown";
  }

  if (e.key === "k") {
    return "ArrowUp";
  }

  return null;
}

export function shouldSkipSelectionAdjustmentsForKeydown(e: KeyboardEvent) {
  return (
    (e.key === "ArrowUp" || e.key === "ArrowDown") &&
    (e.altKey || e.ctrlKey || e.metaKey)
  );
}

export class EditorSelectionsBehaviourOverride implements Feature {
  private lastKey: string | null = null;
  private skipSelectionAdjustments = false;

  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.plugin.registerEditorExtension([
      EditorView.domEventObservers({
        keydown: this.handleKeyDown,
      }),
      EditorState.transactionExtender.of(this.transactionExtender),
    ]);
  }

  async unload() {}

  private transactionExtender = (tr: Transaction): null => {
    if (this.settings.keepCursorWithinContent === "never" || !tr.selection) {
      return null;
    }

    const editor = getEditorFromState(tr.startState);
    const previousCursor = this.getSingleCursor(tr.startState);
    const previousFoldedLines = getFoldedLinesFromState(tr.startState);
    const pressedKey = this.lastKey;
    const shouldSkipSelectionAdjustments = this.skipSelectionAdjustments;
    this.skipSelectionAdjustments = false;

    if (shouldSkipSelectionAdjustments) {
      return null;
    }

    setTimeout(() => {
      this.handleSelectionsChanges(
        editor,
        previousCursor,
        previousFoldedLines,
        pressedKey,
      );
    }, 0);

    return null;
  };

  private handleSelectionsChanges = (
    editor: MyEditor,
    previousCursor: MyEditorPosition | null,
    previousFoldedLines: number[],
    pressedKey: string | null,
  ) => {
    const root = this.parser.parse(editor);

    if (!root) {
      return;
    }

    {
      const recovery = new RecoverCursorAfterFoldedNavigation(
        root,
        previousCursor,
        previousFoldedLines,
        pressedKey,
      );
      const { shouldStopPropagation } = this.operationPerformer.eval(
        root,
        recovery,
        editor,
      );

      if (shouldStopPropagation) {
        const refoldLine = recovery.getRefoldLine();

        if (refoldLine !== null) {
          editor.fold(refoldLine);
        }

        return;
      }
    }

    {
      const { shouldStopPropagation } = this.operationPerformer.eval(
        root,
        new KeepCursorOutsideFoldedLines(root),
        editor,
      );

      if (shouldStopPropagation) {
        return;
      }
    }

    if (pressedKey === "ArrowUp" && previousCursor) {
      const { shouldStopPropagation } = this.operationPerformer.eval(
        root,
        new RecoverCursorAfterArrowUp(root, previousCursor),
        editor,
      );

      if (shouldStopPropagation) {
        return;
      }
    }

    this.operationPerformer.eval(
      root,
      new KeepCursorWithinListContent(root),
      editor,
    );
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.skipSelectionAdjustments = shouldSkipSelectionAdjustmentsForKeydown(e);
    this.lastKey = getTrackedNavigationKey(e);
  };

  private getSingleCursor(state: EditorState): MyEditorPosition | null {
    const ranges = state.selection.ranges;

    if (ranges.length !== 1) {
      return null;
    }

    const { anchor, head } = ranges[0];

    if (anchor !== head) {
      return null;
    }

    return getEditorFromState(state).offsetToPos(head);
  }
}
