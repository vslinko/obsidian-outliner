import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { CreateNoteLineOperation } from "../operations/CreateNoteLineOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class OverrideShiftEnterBehaviourFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private obsidian: ObsidianService,
    private settings: SettingsService,
    private ime: IMEService,
    private parser: ParserService,
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
    const root = this.parser.parse(editor);

    if (!root) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    if (root.hasSingleSelection() && !root.hasSingleCursor()) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: true,
      };
    }

    return this.performOperation.evalOperation(
      root,
      new CreateNoteLineOperation(root),
      editor
    );
  };
}
