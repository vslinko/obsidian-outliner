import { Plugin_2 } from "obsidian";
import { CreateNewItemOperation } from "../operations/CreateNewItemOperation";
import { IFeature } from "./IFeature";
import { ListsService } from "../services/ListsService";
import { SettingsService } from "../services/SettingsService";
import { IMEService } from "src/services/IMEService";

function isEnter(e: KeyboardEvent) {
  return (
    (e.keyCode === 13 || e.code === "Enter") &&
    e.shiftKey === false &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class EnterShouldCreateNewItemFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private listsService: ListsService,
    private imeService: IMEService
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("keydown", this.onKeyDown);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("keydown", this.onKeyDown);
    });
  }

  private onKeyDown = (cm: CodeMirror.Editor, e: KeyboardEvent) => {
    if (
      !this.settingsService.betterEnter ||
      !isEnter(e) ||
      this.imeService.isIMEOpened()
    ) {
      return;
    }

    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) => new CreateNewItemOperation(root),
      cm
    );

    if (shouldStopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
}
