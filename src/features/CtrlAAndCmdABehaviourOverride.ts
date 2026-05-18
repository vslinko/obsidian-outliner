import { Plugin } from "obsidian";

import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { SelectAllContent } from "../operations/SelectAllContent";
import { IMEDetector } from "../services/IMEDetector";
import { OperationPerformer } from "../services/OperationPerformer";
import { Settings } from "../services/Settings";
import { createEditorCallback } from "../utils/createEditorCallback";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class CtrlAAndCmdABehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private imeDetector: IMEDetector,
    private operationPerformer: OperationPerformer,
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
      ]),
    );

    this.plugin.addCommand({
      id: "select-list-content",
      icon: "list",
      name: "Select list content",
      editorCallback: createEditorCallback(this.selectListContent),
      hotkeys: [],
    });
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
      editor,
    );
  };

  private selectListContent = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.run(editor);
    return shouldStopPropagation;
  };
}
