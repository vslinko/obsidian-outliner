import { Editor, EditorCommandName, Plugin } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { IndentList } from "../operations/IndentList";
import { OutdentList } from "../operations/OutdentList";
import { IMEDetector } from "../services/IMEDetector";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";
import { createKeymapRunCallback } from "../utils/createKeymapRunCallback";

export class TabBehaviourOverride implements Feature {
  private editorExecRestore: (() => void) | null = null;

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
            key: "Tab",
            run: createKeymapRunCallback({
              check: this.check,
              run: this.run,
            }),
          },
        ]),
      ),
    );

    this.patchEditorExec();
  }

  async unload() {
    this.editorExecRestore?.();
    this.editorExecRestore = null;
  }

  private check = () => {
    return this.settings.overrideTabBehaviour && !this.imeDetector.isOpened();
  };

  private run = (editor: MyEditor) => {
    return this.runIndent(editor);
  };

  private runIndent(editor: MyEditor) {
    const root = this.parser.parse(editor);

    if (
      !root ||
      !this.shouldHandleListEditing(root.getListUnderCursor().getBullet())
    ) {
      return {
        shouldUpdate: false,
        shouldStopPropagation: false,
      };
    }

    return this.operationPerformer.eval(
      root,
      new IndentList(
        root,
        this.obsidianSettings.getDefaultIndentChars(),
        this.obsidianSettings.isSmartIndentListEnabled(),
      ),
      editor,
    );
  }

  private runOutdent(editor: MyEditor) {
    const root = this.parser.parse(editor);

    if (
      !root ||
      !this.shouldHandleListEditing(root.getListUnderCursor().getBullet())
    ) {
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
  }

  private shouldHandleListEditing(bullet: string) {
    const orderedList = /^\d+\.$/.test(bullet);

    return !orderedList || this.obsidianSettings.isSmartIndentListEnabled();
  }

  private patchEditorExec() {
    if (this.editorExecRestore) {
      return;
    }

    const feature = this;
    const originalExec = Editor.prototype.exec;

    Editor.prototype.exec = function (command: EditorCommandName) {
      if (feature.handleEditorCommand(this, command)) {
        return;
      }

      return originalExec.call(this, command);
    };

    this.editorExecRestore = () => {
      Editor.prototype.exec = originalExec;
    };
  }

  private handleEditorCommand(editor: Editor, command: EditorCommandName) {
    if (!this.settings.overrideTabBehaviour || this.imeDetector.isOpened()) {
      return false;
    }

    if (command === "indentMore") {
      const result = this.runIndent(new MyEditor(editor));
      return result.shouldUpdate || result.shouldStopPropagation;
    }

    if (command === "indentLess") {
      const result = this.runOutdent(new MyEditor(editor));
      return result.shouldUpdate || result.shouldStopPropagation;
    }

    return false;
  }
}
