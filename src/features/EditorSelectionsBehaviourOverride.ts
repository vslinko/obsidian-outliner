import { Plugin_2 } from "obsidian";

import { EditorState, Transaction } from "@codemirror/state";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { EnsureCursorInListContentOperation } from "../operations/EnsureCursorInListContentOperation";
import { EnsureCursorIsInUnfoldedLineOperation } from "../operations/EnsureCursorIsInUnfoldedLineOperation";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class EditorSelectionsBehaviourOverride implements Feature {
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
    if (this.settings.stickCursor === "never" || !tr.selection) {
      return null;
    }

    const editor = this.obsidian.getEditorFromState(tr.startState);

    setTimeout(() => {
      this.handleSelectionsChanges(editor);
    }, 0);

    return null;
  };

  private handleSelectionsChanges = (editor: MyEditor) => {
    const root = this.parser.parse(editor);

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
