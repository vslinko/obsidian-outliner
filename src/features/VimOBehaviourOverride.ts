import { type Editor, MarkdownView, Notice, Plugin } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { CreateNewItem } from "../operations/CreateNewItem";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";

declare global {
  type CM = object;

  interface Vim {
    defineAction<T>(name: string, fn: (cm: CM, args: T) => void): void;

    handleEx(cm: CM, command: string): void;

    enterInsertMode(cm: CM): void;

    mapCommand(
      keys: string,
      type: string,
      name: string,
      args: Record<string, unknown>,
      extra: Record<string, unknown>,
    ): void;
  }

  interface Window {
    CodeMirrorAdapter?: {
      Vim?: Vim;
    };
  }
}

export class VimOBehaviourOverride implements Feature {
  private inited = false;

  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.settings.onChange(this.handleSettingsChange);
    this.handleSettingsChange();
  }

  private moveCursorToLineEnd(editor: Editor) {
    const cursor = editor.getCursor();
    editor.setCursor({
      line: cursor.line,
      ch: editor.getLine(cursor.line).length,
    });
  }

  private getLineIndent(line: string) {
    return line.match(/^[ \t]*/)[0];
  }

  private openPlainLine(editor: Editor, after: boolean) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const indent = this.getLineIndent(line);

    if (after) {
      const insertAt = { line: cursor.line, ch: line.length };
      editor.replaceRange(`\n${indent}`, insertAt, insertAt);
      editor.setCursor({ line: cursor.line + 1, ch: indent.length });
    } else {
      const insertAt = { line: cursor.line, ch: 0 };
      editor.replaceRange(`${indent}\n`, insertAt, insertAt);
      editor.setCursor({ line: cursor.line, ch: indent.length });
    }
  }

  private handleSettingsChange = () => {
    if (this.inited || !this.settings.overrideVimOBehaviour) {
      return;
    }

    if (!window.CodeMirrorAdapter || !window.CodeMirrorAdapter.Vim) {
      console.error("Vim adapter not found");
      return;
    }

    const vim = window.CodeMirrorAdapter.Vim;
    const plugin = this.plugin;
    const parser = this.parser;
    const obsidianSettings = this.obsidianSettings;
    const operationPerformer = this.operationPerformer;
    const settings = this.settings;

    vim.defineAction(
      "insertLineAfterBullet",
      (cm, operatorArgs: { after: boolean }) => {
        const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
        const obsidianEditor = view?.editor;

        if (!obsidianEditor) {
          vim.enterInsertMode(cm);
          return;
        }

        this.moveCursorToLineEnd(obsidianEditor);

        if (!settings.overrideVimOBehaviour) {
          this.openPlainLine(obsidianEditor, operatorArgs.after);
          vim.enterInsertMode(cm);
          return;
        }

        const editor = new MyEditor(obsidianEditor);
        const root = parser.parse(editor);

        if (!root) {
          this.openPlainLine(obsidianEditor, operatorArgs.after);
          vim.enterInsertMode(cm);
          return;
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
            true, // For Vim mode, always use the default behavior (outdent enabled)
          ),
          editor,
        );

        if (res.shouldUpdate && zoomRange) {
          editor.tryRefreshZoom(zoomRange.from.line);
        }

        // Ensure the editor is always left in insert mode
        vim.enterInsertMode(cm);
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

    this.inited = true;
  };

  async unload() {
    if (!this.inited) {
      return;
    }

    new Notice(
      `To fully unload obsidian-outliner plugin, please restart the app`,
      5000,
    );
  }
}
