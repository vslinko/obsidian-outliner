import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { SelectTillLineStartOperation } from "../operations/SelectTillLineStartOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class SelectionShouldIgnoreBulletsFeature implements Feature {
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
          key: "m-s-ArrowLeft",
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
      (root) => new SelectTillLineStartOperation(root),
      editor
    );
  };
}
