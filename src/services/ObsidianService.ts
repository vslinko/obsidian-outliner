import { App, Editor, editorViewField } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { MyEditor } from "../MyEditor";

export interface ObsidianTabsSettings {
  useTab: boolean;
  tabSize: number;
}

export interface ObsidianFoldSettings {
  foldIndent: boolean;
}

export class ObsidianService {
  constructor(private app: App) {}

  isLegacyEditorEnabled() {
    const config: { legacyEditor: boolean } = {
      legacyEditor: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };

    return config.legacyEditor;
  }

  getObsidianTabsSettings(): ObsidianTabsSettings {
    return {
      useTab: true,
      tabSize: 4,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };
  }

  getObsidianFoldSettings(): ObsidianFoldSettings {
    return {
      foldIndent: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };
  }

  getDefaultIndentChars() {
    const { useTab, tabSize } = this.getObsidianTabsSettings();

    return useTab ? "\t" : new Array(tabSize).fill(" ").join("");
  }

  getEditorFromState(state: EditorState) {
    return new MyEditor(state.field(editorViewField).editor);
  }

  createKeymapRunCallback(config: {
    check?: (editor: MyEditor) => boolean;
    run: (editor: MyEditor) => {
      shouldUpdate: boolean;
      shouldStopPropagation: boolean;
    };
  }) {
    const check = config.check || (() => true);
    const { run } = config;

    return (view: EditorView): boolean => {
      const editor = this.getEditorFromState(view.state);

      if (!check(editor)) {
        return false;
      }

      const { shouldUpdate, shouldStopPropagation } = run(editor);

      return shouldUpdate || shouldStopPropagation;
    };
  }

  createEditorCallback(cb: (editor: MyEditor) => boolean) {
    return (editor: Editor) => {
      const myEditor = new MyEditor(editor);
      const shouldStopPropagation = cb(myEditor);

      if (
        !shouldStopPropagation &&
        window.event &&
        window.event.type === "keydown"
      ) {
        myEditor.triggerOnKeyDown(window.event as KeyboardEvent);
      }
    };
  }
}
