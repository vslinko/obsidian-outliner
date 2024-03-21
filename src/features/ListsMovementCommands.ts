import { Plugin } from "obsidian";

import { Feature } from "./Feature";

import { MyEditor } from "../editor";
import { IndentList } from "../operations/IndentList";
import { MoveListDown } from "../operations/MoveListDown";
import { MoveListUp } from "../operations/MoveListUp";
import { OutdentList } from "../operations/OutdentList";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { createEditorCallback } from "../utils/createEditorCallback";

export class ListsMovementCommands implements Feature {
  constructor(
    private plugin: Plugin,
    private obsidianSettings: ObsidianSettings,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "move-list-item-up",
      icon: "arrow-up",
      name: "Move list and sublists up",
      editorCallback: createEditorCallback(this.moveListUp),
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
      editorCallback: createEditorCallback(this.moveListDown),
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
      editorCallback: createEditorCallback(this.indentList),
      hotkeys: [],
    });

    this.plugin.addCommand({
      id: "outdent-list",
      icon: "outdent",
      name: "Outdent the list and sublists",
      editorCallback: createEditorCallback(this.outdentList),
      hotkeys: [],
    });
  }

  async unload() {}

  private moveListDown = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.operationPerformer.perform(
      (root) => new MoveListDown(root),
      editor,
    );

    return shouldStopPropagation;
  };

  private moveListUp = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.operationPerformer.perform(
      (root) => new MoveListUp(root),
      editor,
    );

    return shouldStopPropagation;
  };

  private indentList = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.operationPerformer.perform(
      (root) =>
        new IndentList(root, this.obsidianSettings.getDefaultIndentChars()),
      editor,
    );

    return shouldStopPropagation;
  };

  private outdentList = (editor: MyEditor) => {
    const { shouldStopPropagation } = this.operationPerformer.perform(
      (root) => new OutdentList(root),
      editor,
    );

    return shouldStopPropagation;
  };
}
