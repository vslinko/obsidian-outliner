import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { DeleteTillNextLineContentStart } from "../operations/DeleteTillNextLineContentStart";
import { IMEDetector } from "../services/IMEDetector";
import { OperationPerformer } from "../services/OperationPerformer";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class DeleteBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private imeDetector: IMEDetector,
    private operationPerformer: OperationPerformer
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      keymap.of([
        {
          key: "Delete",
          run: createKeymapRunCallback({
            check: this.check,
            run: this.run,
          }),
        },
      ])
    );
  }

  async unload() {}

  private check = () => {
    return (
      this.settings.keepCursorWithinContent !== "never" &&
      !this.imeDetector.isOpened()
    );
  };

  private run = (editor: MyEditor) => {
    return this.operationPerformer.perform(
      (root) => new DeleteTillNextLineContentStart(root),
      editor
    );
  };
}
