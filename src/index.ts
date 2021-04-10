import { Plugin } from "obsidian";
import { ObsidianOutlinerPluginSettingTab, Settings } from "./settings";
import { IFeature } from "./feature";
import { ObsidianUtils } from "./obsidian_utils";
import { EditorUtils } from "./editor_utils";
import { ListUtils } from "./list_utils";
import { Root } from "./root";
import { Logger } from "./logger";
import { ListsStylesFeature } from "./features/ListsStylesFeature";
import { EnterOutdentIfLineIsEmptyFeature } from "./features/EnterOutdentIfLineIsEmptyFeature";
import { EnterShouldCreateNewlineOnChildLevelFeature } from "./features/EnterShouldCreateNewlineOnChildLevelFeature";
import { MoveCursorToPreviousUnfoldedLineFeature } from "./features/MoveCursorToPreviousUnfoldedLineFeature";
import { EnsureCursorInListContentFeature } from "./features/EnsureCursorInListContentFeature";
import { DeleteShouldIgnoreBulletsFeature } from "./features/DeleteShouldIgnoreBulletsFeature";
import { SelectionShouldIgnoreBulletsFeature } from "./features/SelectionShouldIgnoreBulletsFeature";
import { ZoomFeature } from "./features/ZoomFeature";

export default class ObsidianOutlinerPlugin extends Plugin {
  private features: IFeature[];
  private settings: Settings;
  private logger: Logger;
  private obsidianUtils: ObsidianUtils;
  private editorUtils: EditorUtils;
  private listsUtils: ListUtils;

  execute(editor: CodeMirror.Editor, cb: (root: Root) => boolean): boolean {
    const root = this.listsUtils.parseList(editor, editor.getCursor());

    if (!root) {
      return false;
    }

    const result = cb(root);

    if (result) {
      this.listsUtils.applyChanges(editor, root);
    }

    return result;
  }

  moveListElementDown(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveDown());
  }

  moveListElementUp(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveUp());
  }

  moveListElementRight(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveRight());
  }

  moveListElementLeft(editor: CodeMirror.Editor) {
    return this.execute(editor, (root) => root.moveLeft());
  }

  setFold(editor: CodeMirror.Editor, type: "fold" | "unfold") {
    if (!this.listsUtils.isCursorInList(editor)) {
      return false;
    }

    (editor as any).foldCode(editor.getCursor(), null, type);

    return true;
  }

  fold(editor: CodeMirror.Editor) {
    return this.setFold(editor, "fold");
  }

  unfold(editor: CodeMirror.Editor) {
    return this.setFold(editor, "unfold");
  }

  selectAll(editor: CodeMirror.Editor) {
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

  async onload() {
    console.log(`Loading obsidian-outliner`);

    this.settings = new Settings(this);
    await this.settings.load();

    this.logger = new Logger(this.settings);

    this.obsidianUtils = new ObsidianUtils(this.app);
    this.editorUtils = new EditorUtils();
    this.listsUtils = new ListUtils(this.logger, this.obsidianUtils);

    this.addSettingTab(
      new ObsidianOutlinerPluginSettingTab(this.app, this, this.settings)
    );

    this.features = [
      new ListsStylesFeature(this, this.settings, this.obsidianUtils),
      new EnterOutdentIfLineIsEmptyFeature(
        this,
        this.settings,
        this.editorUtils,
        this.listsUtils
      ),
      new EnterShouldCreateNewlineOnChildLevelFeature(
        this,
        this.settings,
        this.listsUtils
      ),
      new EnsureCursorInListContentFeature(
        this,
        this.settings,
        this.editorUtils,
        this.listsUtils
      ),
      new MoveCursorToPreviousUnfoldedLineFeature(
        this,
        this.settings,
        this.listsUtils
      ),
      new DeleteShouldIgnoreBulletsFeature(
        this,
        this.settings,
        this.editorUtils,
        this.listsUtils
      ),
      new SelectionShouldIgnoreBulletsFeature(
        this,
        this.settings,
        this.listsUtils
      ),
      new ZoomFeature(this, this.obsidianUtils, this.listsUtils),
    ];

    for (const feature of this.features) {
      await feature.load();
    }

    this.addCommand({
      id: "move-list-item-up",
      name: "Move list item up",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementUp.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "ArrowUp",
        },
      ],
    });

    this.addCommand({
      id: "move-list-item-down",
      name: "Move list item down",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementDown.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: "ArrowDown",
        },
      ],
    });

    this.addCommand({
      id: "indent-list",
      name: "Indent list",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementRight.bind(this)
      ),
      hotkeys: [
        {
          modifiers: [],
          key: "Tab",
        },
      ],
    });

    this.addCommand({
      id: "select-all",
      name: "Select list item or whole list",
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

    this.addCommand({
      id: "fold",
      name: "Fold list",
      callback: this.obsidianUtils.createCommandCallback(this.fold.bind(this)),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowUp",
        },
      ],
    });

    this.addCommand({
      id: "unfold",
      name: "Unfold list",
      callback: this.obsidianUtils.createCommandCallback(
        this.unfold.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: "ArrowDown",
        },
      ],
    });

    this.addCommand({
      id: "outdent-list",
      name: "Outdent list",
      callback: this.obsidianUtils.createCommandCallback(
        this.moveListElementLeft.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Shift"],
          key: "Tab",
        },
      ],
    });
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    for (const feature of this.features) {
      await feature.unload();
    }
  }
}
