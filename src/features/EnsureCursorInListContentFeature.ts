import { Plugin_2 } from "obsidian";

import { EditorState, Transaction } from "@codemirror/state";

import { MyEditor } from "../MyEditor";
import { Feature } from "../features/Feature";
import { EnsureCursorInListContentOperation } from "../operations/EnsureCursorInListContentOperation";
import { EnsureCursorIsInUnfoldedLineOperation } from "../operations/EnsureCursorIsInUnfoldedLineOperation";
import { EnsureMultilineSelectionSelectsWholeTreeOperation } from "../operations/EnsureMultilineSelectionSelectsWholeTreeOperation";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class EnsureCursorInListContentFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private obsidian: ObsidianService,
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
      this.handleCursorActivity(editor);
    });

    return null;
  };

  private handleCursorActivity = (editor: MyEditor) => {
    this.performOperation.performOperation(
      (root) => new EnsureMultilineSelectionSelectsWholeTreeOperation(root),
      editor
    );

    this.performOperation.performOperation(
      (root) => new EnsureCursorIsInUnfoldedLineOperation(root),
      editor
    );

    this.performOperation.performOperation(
      (root) => new EnsureCursorInListContentOperation(root),
      editor
    );
  };
}
