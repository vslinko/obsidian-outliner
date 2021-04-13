import { App, MarkdownView } from "obsidian";

export interface IObsidianTabsSettigns {
  useTab: boolean;
  tabSize: number;
}

export interface IObsidianFoldSettigns {
  foldIndent: boolean;
}

export class ObsidianUtils {
  constructor(private app: App) {}

  getObsidianTabsSettigns(): IObsidianTabsSettigns {
    return {
      useTab: true,
      tabSize: 4,
      ...(this.app.vault as any).config,
    };
  }

  getObsidianFoldSettigns(): IObsidianFoldSettigns {
    return {
      foldIndent: false,
      ...(this.app.vault as any).config,
    };
  }

  getActiveLeafDisplayText() {
    return this.app.workspace.activeLeaf.getDisplayText();
  }

  createCommandCallback(cb: (editor: CodeMirror.Editor) => boolean) {
    return () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);

      if (!view) {
        return;
      }

      const editor = view.sourceMode.cmEditor;

      const worked = cb(editor);

      if (!worked && window.event && window.event.type === "keydown") {
        (editor as any).triggerOnKeyDown(window.event);
      }
    };
  }
}
