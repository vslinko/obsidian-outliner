import { Plugin } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { OutdentList } from "../operations/OutdentList";
import { IMEDetector } from "../services/IMEDetector";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class ShiftTabBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private imeDetector: IMEDetector,
    private obsidianSettings: ObsidianSettings,
    private settings: Settings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
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
        ]),
      ),
    );
  }

  async unload() {}

  private check = () => {
    return this.settings.overrideTabBehaviour && !this.imeDetector.isOpened();
  };

  private run = (editor: MyEditor) => {
    const root = this.parser.parse(editor);

    if (!root) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    const currentList = root.getListUnderCursor();
    const orderedList = /^\d+\.$/.test(currentList.getBullet());
    if (orderedList && !this.obsidianSettings.isSmartIndentListEnabled()) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    return this.operationPerformer.eval(
      root,
      new OutdentList(root, this.obsidianSettings.isSmartIndentListEnabled()),
      editor,
    );
  };
}
