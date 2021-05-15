import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { ObsidianUtils } from "src/obsidian_utils";
import { Root } from "src/root";
import { IFeature } from "../feature";

export class MoveItemsFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private obsidianUtils: ObsidianUtils,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "move-list-item-up",
      name: "Move list and sublists up",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementUp.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "ArrowUp",
        },
      ],
    });

    this.plugin.addCommand({
      id: "move-list-item-down",
      name: "Move list and sublists down",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementDown.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "ArrowDown",
        },
      ],
    });

    this.plugin.addCommand({
      id: "indent-list",
      name: "Indent the list and sublists",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementRight.bind(this)
      ),
      hotkeys: [
        {
          modifiers: [],
          key: "Tab",
        },
      ],
    });

    this.plugin.addCommand({
      id: "outdent-list",
      name: "Outdent the list and sublists",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementLeft.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Shift"],
          key: "Tab",
        },
      ],
    });
  }

  async unload() {}

  private execute(
    editor: CodeMirror.Editor,
    cb: (root: Root) => boolean
  ): boolean {
    const root = this.listsUtils.parseList(editor);

    if (!root) {
      return false;
    }

    const result = cb(root);

    if (result) {
      this.listsUtils.applyChanges(editor, root);
    }

    return result;
  }

  private moveListElementDown(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveDown());
  }

  private moveListElementUp(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveUp());
  }

  private moveListElementRight(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveRight());
  }

  private moveListElementLeft(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveLeft());
  }
}
