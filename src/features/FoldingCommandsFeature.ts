import { Notice, Plugin_2 } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { maxPos, minPos } from "../root";
import { ObsidianService } from "../services/ObsidianService";

export class FoldingCommandsFeature implements Feature {
  constructor(private plugin: Plugin_2, private obsidian: ObsidianService) {}

  async load() {
    this.plugin.addCommand({
      id: "fold",
      name: "Fold the list",
      editorCallback: this.obsidian.createEditorCallback(this.fold),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowUp",
        },
      ],
    });

    this.plugin.addCommand({
      id: "unfold",
      name: "Unfold the list",
      editorCallback: this.obsidian.createEditorCallback(this.unfold),
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
    if (!this.obsidian.getObsidianFoldSettings().foldIndent) {
      new Notice(
        `Unable to ${type} because folding is disabled. Please enable "Fold indent" in Obsidian settings.`,
        5000
      );
      return true;
    }

    const selections = editor.listSelections();

    if (selections.length > 1) {
      return true;
    }

    const selection = selections[0];
    const selectionFrom = minPos(selection.anchor, selection.head);
    const selectionTill = maxPos(selection.anchor, selection.head);

    if (type === "fold") {
      const toFold = editor.getAllPossibleLinesToFold(
        selectionFrom.line,
        selectionTill.line
      );
      for (const l of toFold.reverse()) {
        editor.fold(l);
      }
    } else {
      const folded = editor.getAllFoldedLines(
        selectionFrom.line,
        selectionTill.line
      );
      for (const l of folded) {
        editor.unfold(l);
      }
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
