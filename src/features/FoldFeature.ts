import { Notice, Plugin_2 } from "obsidian";
import { ObsidianService } from "../services/ObsidianService";
import { IFeature } from "./IFeature";

export class FoldFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private obsidianService: ObsidianService
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "fold",
      name: "Fold the list",
      callback: this.obsidianService.createCommandCallback(
        this.fold.bind(this)
      ),
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
      callback: this.obsidianService.createCommandCallback(
        this.unfold.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowDown",
        },
      ],
    });
  }

  async unload() {}

  private setFold(editor: CodeMirror.Editor, type: "fold" | "unfold") {
    if (!this.obsidianService.getObsidianFoldSettigns().foldIndent) {
      new Notice(
        `Unable to ${type} because folding is disabled. Please enable "Fold indent" in Obsidian settings.`,
        5000
      );
      return true;
    }

    (editor as any).foldCode(editor.getCursor(), null, type);

    return true;
  }

  private fold(editor: CodeMirror.Editor) {
    return this.setFold(editor, "fold");
  }

  private unfold(editor: CodeMirror.Editor) {
    return this.setFold(editor, "unfold");
  }
}
