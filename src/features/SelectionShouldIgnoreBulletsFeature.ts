import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { IFeature } from "../feature";
import { Settings } from "../settings";

export class SelectionShouldIgnoreBulletsFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("beforeSelectionChange", this.handleBeforeSelectionChange);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeSelectionChange", this.handleBeforeSelectionChange);
    });
  }

  private handleBeforeSelectionChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorSelectionChange
  ) => {
    if (
      !this.settings.smartSelection ||
      changeObj.origin !== "+move" ||
      changeObj.ranges.length > 1
    ) {
      return;
    }

    const range = changeObj.ranges[0];

    if (
      range.anchor.line !== range.head.line ||
      range.anchor.ch === range.head.ch
    ) {
      return;
    }

    const root = this.listsUtils.parseList(cm);

    if (!root) {
      return;
    }

    const list = root.getListUnderCursor();
    const listContentStartCh = list.getContentStartCh();

    if (range.from().ch < listContentStartCh) {
      range.from().ch = listContentStartCh;
      changeObj.update([range]);
    }
  };
}
