import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { DeleteAndMergeWithNextLineOperation } from "../operations/DeleteAndMergeWithNextLineOperation";
import { DeleteAndMergeWithPreviousLineOperation } from "../operations/DeleteAndMergeWithPreviousLineOperation";
import { DeleteTillLineStartOperation } from "../operations/DeleteTillLineStartOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class DeleteShouldIgnoreBulletsFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private ime: IMEService,
    private obsidian: ObsidianService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      keymap.of([
        {
          key: "Backspace",
          run: this.obsidian.createKeymapRunCallback({
            check: this.check,
            run: this.deleteAndMergeWithPreviousLine,
          }),
        },
        {
          key: "Delete",
          run: this.obsidian.createKeymapRunCallback({
            check: this.check,
            run: this.deleteAndMergeWithNextLine,
          }),
        },
        {
          mac: "m-Backspace",
          run: this.obsidian.createKeymapRunCallback({
            check: this.check,
            run: this.deleteTillLineStart,
          }),
        },
      ])
    );
  }

  async unload() {}

  private check = () => {
    return this.settings.stickCursor != "never" && !this.ime.isIMEOpened();
  };

  private deleteAndMergeWithPreviousLine = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) => new DeleteAndMergeWithPreviousLineOperation(root),
      editor
    );
  };

  private deleteTillLineStart = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) => new DeleteTillLineStartOperation(root),
      editor
    );
  };

  private deleteAndMergeWithNextLine = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) => new DeleteAndMergeWithNextLineOperation(root),
      editor
    );
  };
}
