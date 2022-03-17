import { Plugin_2 } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { MyEditor } from "../MyEditor";
import { Feature } from "../features/Feature";
import { CreateNewItemOperation } from "../operations/CreateNewItemOperation";
import { MoveCursorToStartOfFirstListItemOperation } from "../operations/MoveCursorToStartOfFirstListItemOperation";
import { OutdentIfLineIsEmptyOperation } from "../operations/OutdentIfLineIsEmptyOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class OverrideEnterBehaviourFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private ime: IMEService,
    private obsidian: ObsidianService,
    private parser: ParserService,
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
    const root = this.parser.parse(editor);

    if (!root) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    {
      const res = this.performOperation.evalOperation(
        root,
        new OutdentIfLineIsEmptyOperation(root),
        editor
      );

      if (res.shouldStopPropagation) {
        return res;
      }
    }

    {
      const res = this.performOperation.evalOperation(
        root,
        new MoveCursorToStartOfFirstListItemOperation(root),
        editor
      );

      if (res.shouldStopPropagation) {
        return res;
      }
    }

    {
      const zoomRange = editor.getZoomRange();

      const res = this.performOperation.evalOperation(
        root,
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
    }
  };
}
