import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { MoveCursorToPreviousUnfoldedLineOperation } from "../operations/MoveCursorToPreviousUnfoldedLineOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class OverrideArrowLeftBehaviourFeature implements Feature {
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
          key: "ArrowLeft",
          run: this.obsidian.createKeymapRunCallback({
            check: this.check,
            run: this.run,
          }),
        },
        {
          win: "c-ArrowLeft",
          linux: "c-ArrowLeft",
          run: this.obsidian.createKeymapRunCallback({
            check: this.check,
            run: this.run,
          }),
        },
      ])
    );
  }

  async unload() {}

  private check = () => {
    return this.settings.stickCursor && !this.ime.isIMEOpened();
  };

  private run = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) => new MoveCursorToPreviousUnfoldedLineOperation(root),
      editor
    );
  };
}
