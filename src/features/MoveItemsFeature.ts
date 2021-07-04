import { Plugin_2 } from "obsidian";
import { ListsService } from "../services/ListsService";
import { MoveLeftOperation } from "../operations/MoveLeftOperation";
import { ObsidianService } from "../services/ObsidianService";
import { IFeature } from "./IFeature";
import { MoveRightOperation } from "../operations/MoveRightOperation";
import { MoveDownOperation } from "../operations/MoveDownOperation";
import { MoveUpOperation } from "../operations/MoveUpOperation";
import { IMEService } from "src/services/IMEService";

export class MoveItemsFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private obsidianService: ObsidianService,
    private listsService: ListsService,
    private imeService: IMEService
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "move-list-item-up",
      name: "Move list and sublists up",
      callback: this.obsidianService.createCommandCallback(
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
      callback: this.obsidianService.createCommandCallback(
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
      callback: this.obsidianService.createCommandCallback(
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
      callback: this.obsidianService.createCommandCallback(
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
    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) => new MoveDownOperation(root),
      editor
    );
    return shouldStopPropagation;
  }

  private moveListElementUp(editor: CodeMirror.Editor) {
    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) => new MoveUpOperation(root),
      editor
    );
    return shouldStopPropagation;
  }

  private moveListElementRight(editor: CodeMirror.Editor) {
    if (this.imeService.isIMEOpened()) {
      return true;
    }

    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) =>
        new MoveRightOperation(root, this.listsService.getDefaultIndentChars()),
      editor
    );
    return shouldStopPropagation;
  }

  private moveListElementLeft(editor: CodeMirror.Editor) {
    if (this.imeService.isIMEOpened()) {
      return true;
    }

    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) => new MoveLeftOperation(root),
      editor
    );
    return shouldStopPropagation;
  }
}
