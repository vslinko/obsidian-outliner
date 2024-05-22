import { MarkdownView, Plugin } from "obsidian";

import { MyEditor } from "src/editor";
import { CreateNewItem } from "src/operations/CreateNewItem";
import { ObsidianSettings } from "src/services/ObsidianSettings";
import { OperationPerformer } from "src/services/OperationPerformer";
import { Parser } from "src/services/Parser";
import { Settings } from "src/services/Settings";

import { Feature } from "./Feature";

export class VimOBehaviourOverride implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vim = (window as any).CodeMirrorAdapter?.Vim;
    const plugin = this.plugin;
    const parser = this.parser;
    const obsidianSettings = this.obsidianSettings;
    const operationPerformer = this.operationPerformer;
    const settings = this.settings;

    vim.defineAction(
      "insertLineAfterBullet",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function (cm: any, operatorArgs: { after: boolean }) {
        // Move the cursor to the end of the line
        vim.handleEx(cm, "normal! A");

        const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = new MyEditor(view.editor);
        const root = parser.parse(editor);

        if (!settings.overrideVimOBehaviour) {
          if (operatorArgs.after) {
            vim.handleEx(cm, "normal! o");
          } else {
            vim.handleEx(cm, "normal! O");
          }
          vim.enterInsertMode(cm);
          return;
        }

        if (!root) {
          if (operatorArgs.after) {
            vim.handleEx(cm, "normal! o");
          } else {
            vim.handleEx(cm, "normal! O");
          }
          vim.enterInsertMode(cm);
          return {
            shouldUpdate: false,
            shouldStopPropagation: false,
          };
        }

        const defaultIndentChars = obsidianSettings.getDefaultIndentChars();
        const zoomRange = editor.getZoomRange();
        const getZoomRange = {
          getZoomRange: () => zoomRange,
        };

        const res = operationPerformer.eval(
          root,
          new CreateNewItem(
            root,
            defaultIndentChars,
            getZoomRange,
            operatorArgs.after,
          ),
          editor,
        );

        if (res.shouldUpdate && zoomRange) {
          editor.tryRefreshZoom(zoomRange.from.line);
        }

        // Ensure the editor is always left in insert mode
        vim.enterInsertMode(cm);
        return res;
      },
    );

    vim.mapCommand(
      "o",
      "action",
      "insertLineAfterBullet",
      {},
      {
        isEdit: true,
        context: "normal",
        interlaceInsertRepeat: true,
        actionArgs: { after: true },
      },
    );
    vim.mapCommand(
      "O",
      "action",
      "insertLineAfterBullet",
      {},
      {
        isEdit: true,
        context: "normal",
        interlaceInsertRepeat: true,
        actionArgs: { after: false },
      },
    );
  }

  async unload() {}
}
