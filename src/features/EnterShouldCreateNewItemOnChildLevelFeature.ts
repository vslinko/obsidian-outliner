import { Plugin_2 } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { MyEditor } from "../MyEditor";
import { Feature } from "../features/Feature";
import { CreateNewItemOperation } from "../operations/CreateNewItemOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class EnterShouldCreateNewItemFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private ime: IMEService,
    private obsidian: ObsidianService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "Enter",
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
    return this.settings.betterEnter && !this.ime.isIMEOpened();
  };

  private run = (editor: MyEditor) => {
    const zoomRange = editor.getZoomRange();

    const res = this.performOperation.performOperation(
      (root) =>
        new CreateNewItemOperation(
          root,
          this.obsidian.getDefaultIndentChars(),
          {
            getZoomRange: () => zoomRange,
          }
        ),
      editor
    );

    if (res.shouldUpdate && zoomRange) {
      editor.zoomIn(zoomRange.from.line);
    }

    return res;
  };
}
