import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { MoveLeftOperation } from "src/root/MoveLeftOperation";
import { ObsidianUtils } from "src/obsidian_utils";
import { IFeature } from "../feature";
import { MoveRightOperation } from "src/root/MoveRightOperation";
import { MoveDownOperation } from "src/root/MoveDownOperation";
import { MoveUpOperation } from "src/root/MoveUpOperation";

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

  private moveListElementDown(editor: CodeMirror.Editor) {
    const { shouldStopPropagation } = this.listsUtils.performOperation(
      (root) => new MoveDownOperation(root),
      editor
    );
    return shouldStopPropagation;
  }

  private moveListElementUp(editor: CodeMirror.Editor) {
    const { shouldStopPropagation } = this.listsUtils.performOperation(
      (root) => new MoveUpOperation(root),
      editor
    );
    return shouldStopPropagation;
  }

  private moveListElementRight(editor: CodeMirror.Editor) {
    const { shouldStopPropagation } = this.listsUtils.performOperation(
      (root) =>
        new MoveRightOperation(root, this.listsUtils.getDefaultIndentChars()),
      editor
    );
    return shouldStopPropagation;
  }

  private moveListElementLeft(editor: CodeMirror.Editor) {
    const { shouldStopPropagation } = this.listsUtils.performOperation(
      (root) => new MoveLeftOperation(root),
      editor
    );
    return shouldStopPropagation;
  }
}
