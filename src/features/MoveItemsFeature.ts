import { Plugin_2 } from "obsidian";

import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";

import { MyEditor } from "../MyEditor";
import { Feature } from "../features/Feature";
import { MoveDownOperation } from "../operations/MoveDownOperation";
import { MoveLeftOperation } from "../operations/MoveLeftOperation";
import { MoveRightOperation } from "../operations/MoveRightOperation";
import { MoveUpOperation } from "../operations/MoveUpOperation";
import { IMEService } from "../services/IMEService";
import { ObsidianService } from "../services/ObsidianService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class MoveItemsFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private ime: IMEService,
    private obsidian: ObsidianService,
    private settings: SettingsService,
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

    this.plugin.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "Tab",
            run: this.obsidian.createKeymapRunCallback({
              check: this.check,
              run: this.moveListElementRight,
            }),
          },
          {
            key: "s-Tab",
            run: this.obsidian.createKeymapRunCallback({
              check: this.check,
              run: this.moveListElementLeft,
            }),
          },
        ])
      )
    );
  }

  async unload() {}

  private check = () => {
    return this.settings.betterTab && !this.ime.isIMEOpened();
  };

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
    console.log("moveListElementRightCommand", { ime: this.ime.isIMEOpened() });
    // if (this.ime.isIMEOpened()) {
    //   return true;
    // }

    return this.moveListElementRight(editor).shouldStopPropagation;
  };

  private moveListElementRight = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) =>
        new MoveRightOperation(root, this.obsidian.getDefaultIndentChars()),
      editor
    );
  };

  private moveListElementLeftCommand = (editor: MyEditor) => {
    console.log("moveListElementLeftCommand", { ime: this.ime.isIMEOpened() });
    // if (this.ime.isIMEOpened()) {
    //   return true;
    // }

    return this.moveListElementLeft(editor).shouldStopPropagation;
  };

  private moveListElementLeft = (editor: MyEditor) => {
    return this.performOperation.performOperation(
      (root) => new MoveLeftOperation(root),
      editor
    );
  };
}
