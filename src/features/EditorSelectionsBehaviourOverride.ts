import { Plugin } from "obsidian";

import { EditorState, Transaction } from "@codemirror/state";

import { Feature } from "./Feature";

import { MyEditor, getEditorFromState } from "../editor";
import { ExpandSelectionToFullItems } from "../operations/ExpandSelectionToFullItems";
import { KeepCursorOutsideFoldedLines } from "../operations/KeepCursorOutsideFoldedLines";
import { KeepCursorWithinListContent } from "../operations/KeepCursorWithinListContent";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";

export class EditorSelectionsBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      EditorState.transactionExtender.of(this.transactionExtender),
    );
  }

  async unload() {}

  private transactionExtender = (tr: Transaction): null => {
    if (this.settings.keepCursorWithinContent === "never" || !tr.selection) {
      return null;
    }

    const editor = getEditorFromState(tr.startState);

    setTimeout(() => {
      this.handleSelectionsChanges(editor);
    }, 0);

    return null;
  };

  private handleSelectionsChanges = (editor: MyEditor) => {
    const root = this.parser.parse(editor);

    if (!root) {
      return;
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

    // Only try to expand selection if it spans multiple lines (actual selection, not cursor)
    if (this.settings.expandSelection) {
      const selections = root.getSelections();
      if (
        selections.length === 1 &&
        selections[0].anchor.line !== selections[0].head.line
      ) {
        const { shouldStopPropagation } = this.operationPerformer.eval(
          root,
          new ExpandSelectionToFullItems(root),
          editor,
        );

        if (shouldStopPropagation) {
          return;
        }
      }
    }

    this.operationPerformer.eval(
      root,
      new KeepCursorWithinListContent(root),
      editor,
    );
  };
}
