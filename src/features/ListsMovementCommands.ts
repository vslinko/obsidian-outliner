import { Plugin_2 } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { MoveDownOperation } from "../operations/MoveDownOperation";
import { MoveLeftOperation } from "../operations/MoveLeftOperation";
import { MoveRightOperation } from "../operations/MoveRightOperation";
import { MoveUpOperation } from "../operations/MoveUpOperation";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";

export class ListsMovementCommands implements Feature {
  constructor(
    private plugin: Plugin_2,
    private obsidian: ObsidianService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "move-list-item-up",
      icon: "arrow-up",
      name: "Move list and sublists up",
      editorCallback: this.obsidian.createEditorCallback(
        this.moveListElementUpCommand
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
      icon: "arrow-down",
      name: "Move list and sublists down",
      editorCallback: this.obsidian.createEditorCallback(
        this.moveListElementDownCommand
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
      icon: "indent",
      name: "Indent the list and sublists",
      editorCallback: this.obsidian.createEditorCallback(
        this.moveListElementRightCommand
      ),
      hotkeys: [],
    });

    this.plugin.addCommand({
      id: "outdent-list",
      icon: "outdent",
      name: "Outdent the list and sublists",
      editorCallback: this.obsidian.createEditorCallback(
        this.moveListElementLeftCommand
      ),
      hotkeys: [],
    });
  }

  async unload() {}

  private moveListElementDownCommand = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new MoveDownOperation(root),
      editor
    );

    return shouldStopPropagation;
  };

  private moveListElementUpCommand = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new MoveUpOperation(root),
      editor
    );

    return shouldStopPropagation;
  };

  private moveListElementRightCommand = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) =>
        new MoveRightOperation(root, this.obsidian.getDefaultIndentChars()),
      editor
    );

    return shouldStopPropagation;
  };

  private moveListElementLeftCommand = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new MoveLeftOperation(root),
      editor
    );

    return shouldStopPropagation;
  };
}
