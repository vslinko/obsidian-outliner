import { Notice, Plugin } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { createEditorCallback } from "../utils/createEditorCallback";

export class ListsFoldingCommands implements Feature {
  constructor(
    private plugin: Plugin,
    private obsidianSettings: ObsidianSettings,
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "fold",
      icon: "chevrons-down-up",
      name: "Fold the list",
      editorCallback: createEditorCallback(this.fold),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowUp",
        },
      ],
    });

    this.plugin.addCommand({
      id: "unfold",
      icon: "chevrons-up-down",
      name: "Unfold the list",
      editorCallback: createEditorCallback(this.unfold),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowDown",
        },
      ],
    });
  }

  async unload() {}

  private setFold(editor: MyEditor, type: "fold" | "unfold") {
    if (!this.obsidianSettings.getFoldSettings().foldIndent) {
      new Notice(
        `Unable to ${type} because folding is disabled. Please enable "Fold indent" in Obsidian settings.`,
        5000,
      );
      return true;
    }

    const cursor = editor.getCursor();

    if (type === "fold") {
      editor.fold(cursor.line);
    } else {
      editor.unfold(cursor.line);
    }

    return true;
  }

  private fold = (editor: MyEditor) => {
    return this.setFold(editor, "fold");
  };

  private unfold = (editor: MyEditor) => {
    return this.setFold(editor, "unfold");
  };
}
