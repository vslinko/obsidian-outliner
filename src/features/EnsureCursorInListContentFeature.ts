import { Plugin_2 } from "obsidian";
import { EditorUtils } from "src/editor_utils";
import { IFeature } from "src/feature";
import { ListUtils } from "src/list_utils";
import { EnsureCursorInListContentOperation } from "src/root/EnsureCursorInListContentOperation";
import { EnsureCursorIsInUnfoldedLineOperation } from "src/root/EnsureCursorIsInUnfoldedLineOperation";
import { Settings } from "src/settings";

export class EnsureCursorInListContentFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private editorUtils: EditorUtils,
    private listsUtils: ListUtils
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
    if (
      !this.settings.stickCursor ||
      !this.editorUtils.containsSingleCursor(cm)
    ) {
      return;
    }

    this.listsUtils.performOperation(
      (root) => new EnsureCursorIsInUnfoldedLineOperation(root),
      cm
    );

    this.listsUtils.performOperation(
      (root) => new EnsureCursorInListContentOperation(root),
      cm
    );
  };
}
