import { Plugin_2 } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { MoveRightOperation } from "../operations/MoveRightOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class OverrideTabBehaviourFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private ime: IMEService,
    private obsidian: ObsidianService,
    private settings: SettingsService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "Tab",
            run: this.obsidian.createKeymapRunCallback({
              check: this.check,
              run: this.run,
            }),
          },
        ])
      )
    );
  }

  async unload() {}

  private check = () => {
    return this.settings.betterTab && !this.ime.isIMEOpened();
  };

  private run = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) =>
        new MoveRightOperation(root, this.obsidian.getDefaultIndentChars()),
      editor
    );
  };
}
