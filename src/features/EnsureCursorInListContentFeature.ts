import { Plugin_2 } from "obsidian";
import { IFeature } from "./IFeature";
import { ListsService } from "../services/ListsService";
import { EnsureCursorInListContentOperation } from "../operations/EnsureCursorInListContentOperation";
import { EnsureCursorIsInUnfoldedLineOperation } from "../operations/EnsureCursorIsInUnfoldedLineOperation";
import { SettingsService } from "../services/SettingsService";

export class EnsureCursorInListContentFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private listsService: ListsService
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("cursorActivity", this.handleCursorActivity);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("cursorActivity", this.handleCursorActivity);
    });
  }

  private handleCursorActivity = (cm: CodeMirror.Editor) => {
    if (!this.settingsService.stickCursor) {
      return;
    }

    this.listsService.performOperation(
      (root) => new EnsureCursorIsInUnfoldedLineOperation(root),
      cm
    );

    this.listsService.performOperation(
      (root) => new EnsureCursorInListContentOperation(root),
      cm
    );
  };
}
