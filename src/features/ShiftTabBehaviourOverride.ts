import { Plugin_2 } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { OutdentList } from "../operations/OutdentList";
import { IMEDetector } from "../services/IMEDetector";
import { OperationPerformer } from "../services/OperationPerformer";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class ShiftTabBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin_2,
    private imeDetector: IMEDetector,
    private settings: Settings,
    private operationPerformer: OperationPerformer
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "s-Tab",
            run: createKeymapRunCallback({
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
    return this.settings.overrideTabBehaviour && !this.imeDetector.isOpened();
  };

  private run = (editor: MyEditor) => {
    return this.operationPerformer.perform(
      (root) => new OutdentList(root),
      editor
    );
  };
}
