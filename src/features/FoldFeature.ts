import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { ObsidianUtils } from "src/obsidian_utils";
import { IFeature } from "../feature";

export class FoldFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private obsidianUtils: ObsidianUtils,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "fold",
      name: "Fold the list",
      callback: this.obsidianUtils.createCommandCallback(this.fold.bind(this)),
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
      callback: this.obsidianUtils.createCommandCallback(
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
    if (!this.listsUtils.isCursorInList(editor)) {
      return false;
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
