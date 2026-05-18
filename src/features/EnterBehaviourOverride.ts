import { Plugin } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { CreateNewItem } from "../operations/CreateNewItem";
import { InsertNewLineWithoutBullet } from "../operations/InsertNewLineWithoutBullet";
import { OutdentListIfItsEmpty } from "../operations/OutdentListIfItsEmpty";
import { IMEDetector } from "../services/IMEDetector";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";
import { createEditorCallback } from "../utils/createEditorCallback";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class EnterBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private imeDetector: IMEDetector,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "Shift-Enter",
            run: createKeymapRunCallback({
              check: this.check,
              run: this.runShiftEnter,
            }),
          },
          {
            key: "Enter",
            run: createKeymapRunCallback({
              check: this.check,
              run: this.run,
            }),
          },
        ]),
      ),
    );

    this.plugin.addCommand({
      id: "insert-note-line",
      icon: "list-plus",
      name: "Insert note line",
      editorCallback: createEditorCallback(this.insertNoteLine),
      hotkeys: [],
    });
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

    const currentList = root.getListUnderCursor();
    const orderedList = /^\d+\.$/.test(currentList.getBullet());
    if (orderedList && !this.obsidianSettings.isSmartIndentListEnabled()) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    {
      const res = this.operationPerformer.eval(
        root,
        new OutdentListIfItsEmpty(
          root,
          this.obsidianSettings.isSmartIndentListEnabled(),
        ),
        editor,
      );

      if (res.shouldStopPropagation) {
        return res;
      }
    }

    {
      const defaultIndentChars = this.obsidianSettings.getDefaultIndentChars();
      const zoomRange = editor.getZoomRange();
      const documentPrefixBeforeRoot = editor.getRange(
        { line: 0, ch: 0 },
        { line: root.getContentStart().line, ch: 0 },
      );
      const getZoomRange = {
        getZoomRange: () => zoomRange,
      };

      const res = this.operationPerformer.eval(
        root,
        new CreateNewItem(
          root,
          defaultIndentChars,
          getZoomRange,
          this.obsidianSettings.isSmartIndentListEnabled(),
          true,
          documentPrefixBeforeRoot,
        ),
        editor,
      );

      if (res.shouldUpdate && zoomRange) {
        editor.tryRefreshZoom(zoomRange.from.line);
      }

      return res;
    }
  };

  private runShiftEnter = (editor: MyEditor) => {
    const root = this.parser.parse(editor);

    if (!root) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    return this.operationPerformer.eval(
      root,
      new InsertNewLineWithoutBullet(root),
      editor,
    );
  };

  private insertNoteLine = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.runShiftEnter(editor);
    return shouldStopPropagation;
  };
}
