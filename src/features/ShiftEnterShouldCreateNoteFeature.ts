import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { CreateNoteLineOperation } from "../operations/CreateNoteLineOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class ShiftEnterShouldCreateNoteFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private obsidian: ObsidianService,
    private settings: SettingsService,
    private ime: IMEService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      keymap.of([
        {
          key: "s-Enter",
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
    return this.settings.betterEnter && !this.ime.isIMEOpened();
  };

  private run = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) => new CreateNoteLineOperation(root),
      editor
    );
  };
}
