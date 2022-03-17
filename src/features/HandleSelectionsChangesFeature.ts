import { Plugin_2 } from "obsidian";

import { EditorState, Transaction } from "@codemirror/state";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { EnsureCursorInListContentOperation } from "../operations/EnsureCursorInListContentOperation";
import { EnsureCursorIsInUnfoldedLineOperation } from "../operations/EnsureCursorIsInUnfoldedLineOperation";
import { EnsureMultilineSelectionSelectsWholeTreeOperation } from "../operations/EnsureMultilineSelectionSelectsWholeTreeOperation";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class HandleSelectionsChangesFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private obsidian: ObsidianService,
    private parser: ParserService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      EditorState.transactionExtender.of(this.transactionExtender)
    );
  }

  async unload() {}

  private transactionExtender = (tr: Transaction): null => {
    if (!this.settings.stickCursor || !tr.selection) {
      return null;
    }

    const editor = this.obsidian.getEditorFromState(tr.startState);

    setImmediate(() => {
      this.handleSelectionsChanges(editor);
    });

    return null;
  };

  private handleSelectionsChanges = (editor: MyEditor) => {
    const root = this.parser.parse(editor);

    if (!root) {
      return;
    }

    {
      const res = this.performOperation.evalOperation(
        root,
        new EnsureMultilineSelectionSelectsWholeTreeOperation(root),
        editor
      );

      if (res.shouldStopPropagation) {
        return;
      }
    }

    {
      const res = this.performOperation.evalOperation(
        root,
        new EnsureCursorIsInUnfoldedLineOperation(root),
        editor
      );

      if (res.shouldStopPropagation) {
        return;
      }
    }

    this.performOperation.evalOperation(
      root,
      new EnsureCursorInListContentOperation(root),
      editor
    );
  };
}
