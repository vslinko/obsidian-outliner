import { Plugin_2 } from "obsidian";
import { CreateNoteLineOperation } from "../operations/CreateNoteLineOperation";
import { IFeature } from "./IFeature";
import { ListsService } from "../services/ListsService";
import { SettingsService } from "../services/SettingsService";

function isShiftEnter(e: KeyboardEvent) {
  return (
    (e.keyCode === 13 || e.code === "Enter") &&
    e.shiftKey === true &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

export class ShiftEnterShouldCreateNoteFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private listsService: ListsService
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
    if (!this.settingsService.betterEnter || !isShiftEnter(e)) {
      return;
    }

    const { shouldStopPropagation } = this.listsService.performOperation(
      (root) =>
        new CreateNoteLineOperation(
          root,
          this.listsService.getDefaultIndentChars()
        ),
      cm
    );

    if (shouldStopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
}
