import { Plugin_2 } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { SelectAllContent } from "../operations/SelectAllContent";
import { IMEDetector } from "../services/IMEDetector";
import { OperationPerformer } from "../services/OperationPerformer";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class CtrlAAndCmdABehaviourOverride implements Feature {
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
          key: "c-a",
          mac: "m-a",
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
      this.settings.overrideSelectAllBehaviour && !this.imeDetector.isOpened()
    );
  };

  private run = (editor: MyEditor) => {
    return this.operationPerformer.perform(
      (root) => new SelectAllContent(root),
      editor
    );
  };
}
