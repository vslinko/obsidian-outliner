import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { ObsidianUtils } from "src/obsidian_utils";
import { IFeature } from "../feature";

export class SelectAllFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private obsidianUtils: ObsidianUtils,
    private listsUtils: ListUtils
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "select-all",
      name: "Select a list item or the entire list",
      callback: this.obsidianUtils.createCommandCallback(
        this.selectAll.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "a",
        },
      ],
    });
  }

  async unload() {}

  private selectAll(editor: CodeMirror.Editor) {
    const selections = editor.listSelections();

    if (selections.length !== 1) {
      return false;
    }

    const selection = selections[0];

    if (selection.anchor.line !== selection.head.line) {
      return false;
    }

    const root = this.listsUtils.parseList(editor, selection.anchor);

    if (!root) {
      return false;
    }

    const list = root.getListUnderCursor();
    const startCh = list.getContentStartCh();
    const endCh = list.getContentEndCh();

    if (selection.from().ch === startCh && selection.to().ch === endCh) {
      // select all list
      editor.setSelection(
        root.getListStartPosition(),
        root.getListEndPosition()
      );
    } else {
      // select all line
      editor.setSelection(
        {
          line: selection.anchor.line,
          ch: startCh,
        },
        {
          line: selection.anchor.line,
          ch: endCh,
        }
      );
    }

    return true;
  }
}
