import { Plugin_2 } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { IndentList } from "../operations/IndentList";
import { MoveListDown } from "../operations/MoveListDown";
import { MoveListUp } from "../operations/MoveListUp";
import { OutdentList } from "../operations/OutdentList";
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
      editorCallback: this.obsidian.createEditorCallback(this.moveListUp),
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
      editorCallback: this.obsidian.createEditorCallback(this.moveListDown),
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
      editorCallback: this.obsidian.createEditorCallback(this.indentList),
      hotkeys: [],
    });

    this.plugin.addCommand({
      id: "outdent-list",
      icon: "outdent",
      name: "Outdent the list and sublists",
      editorCallback: this.obsidian.createEditorCallback(this.outdentList),
      hotkeys: [],
    });
  }

  async unload() {}

  private moveListDown = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new MoveListDown(root),
      editor
    );

    return shouldStopPropagation;
  };

  private moveListUp = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new MoveListUp(root),
      editor
    );

    return shouldStopPropagation;
  };

  private indentList = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new IndentList(root, this.obsidian.getDefaultIndentChars()),
      editor
    );

    return shouldStopPropagation;
  };

  private outdentList = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.performOperation.performOperation(
      (root) => new OutdentList(root),
      editor
    );

    return shouldStopPropagation;
  };
}
