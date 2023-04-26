import { Plugin_2 } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { CreateNewItem } from "../operations/CreateNewItem";
import { OutdentListIfItsEmpty } from "../operations/OutdentListIfItsEmpty";
import { IMEDetector } from "../services/IMEDetector";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class EnterBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private imeDetector: IMEDetector,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
    private operationPerformer: OperationPerformer
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "Enter",
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
    return this.settings.overrideEnterBehaviour && !this.imeDetector.isOpened();
  };

  private run = (editor: MyEditor) => {
    const root = this.parser.parse(editor);

    if (!root) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    {
      const res = this.operationPerformer.eval(
        root,
        new OutdentListIfItsEmpty(root),
        editor
      );

      if (res.shouldStopPropagation) {
        return res;
      }
    }

    {
      const defaultIndentChars = this.obsidianSettings.getDefaultIndentChars();
      const zoomRange = editor.getZoomRange();
      const getZoomRange = {
        getZoomRange: () => zoomRange,
      };

      const res = this.operationPerformer.eval(
        root,
        new CreateNewItem(root, defaultIndentChars, getZoomRange),
        editor
      );

      if (res.shouldUpdate && zoomRange) {
        editor.zoomIn(zoomRange.from.line);
      }

      return res;
    }
  };
}
