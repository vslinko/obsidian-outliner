import { MarkdownView, Plugin } from "obsidian";

import { MyEditor } from "src/editor";
import { CreateNewItem } from "src/operations/CreateNewItem";
import { ObsidianSettings } from "src/services/ObsidianSettings";
import { OperationPerformer } from "src/services/OperationPerformer";
import { Parser } from "src/services/Parser";
import { Settings } from "src/services/Settings";

import { Feature } from "./Feature";

export class VimOBehaviourOverride implements Feature {
  static toggle(enabled: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vim = (window as any).CodeMirrorAdapter?.Vim;
    if (enabled && vim) {
      console.log("VimOBehaviourOverride enabled");
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
    } else {
      console.log("VimOBehaviourOverride disabled");
      vim.mapCommand(
        "o",
        "action",
        "newLineAndEnterInsertMode",
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
        "newLineAndEnterInsertMode",
        {},
        {
          isEdit: true,
          context: "normal",
          interlaceInsertRepeat: true,
          actionArgs: { after: false },
        },
      );
      // vim.unmap("o", "normal")
      // vim.unmap("O", "normal")
    }
  }

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

    VimOBehaviourOverride.toggle(this.settings.overrideVimOBehaviour);

    vim.defineAction(
      "insertLineAfterBullet",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function (cm: any, operatorArgs: { after: boolean }) {
        // vim.enterInsertMode(cm, {insertAt: 'charAfter'})
        // Sort of janky way to get into insert mode with cursor after the
        // character.  Ideally, this would call `enterInsertMode` with the
        // `actionArgs` but I haven't found an API for doing that.
        //
        // { keys: 'a', type: 'action', action: 'enterInsertMode', isEdit: true, actionArgs: { insertAt: 'charAfter' }, context: 'normal' },
        vim.handleKey(cm, "a");
        const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = new MyEditor(view.editor);
        const root = parser.parse(editor);

        if (!root) {
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

        return res;
      },
    );
  }

  async unload() {}
}
