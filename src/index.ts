import { Plugin } from "obsidian";
import { ObsidianOutlinerPluginSettingTab, Settings } from "./settings";
import { IFeature } from "./feature";
import { ObsidianUtils } from "./obsidian_utils";
import { EditorUtils } from "./editor_utils";
import { ListUtils } from "./list_utils";
import { Logger } from "./logger";
import { ListsStylesFeature } from "./features/ListsStylesFeature";
import { EnterOutdentIfLineIsEmptyFeature } from "./features/EnterOutdentIfLineIsEmptyFeature";
import { EnterShouldCreateNewlineOnChildLevelFeature } from "./features/EnterShouldCreateNewlineOnChildLevelFeature";
import { MoveCursorToPreviousUnfoldedLineFeature } from "./features/MoveCursorToPreviousUnfoldedLineFeature";
import { EnsureCursorInListContentFeature } from "./features/EnsureCursorInListContentFeature";
import { DeleteShouldIgnoreBulletsFeature } from "./features/DeleteShouldIgnoreBulletsFeature";
import { SelectionShouldIgnoreBulletsFeature } from "./features/SelectionShouldIgnoreBulletsFeature";
import { ZoomFeature } from "./features/ZoomFeature";
import { FoldFeature } from "./features/FoldFeature";
import { SelectAllFeature } from "./features/SelectAllFeature";
import { MoveItemsFeature } from "./features/MoveItemsFeature";

export default class ObsidianOutlinerPlugin extends Plugin {
  private features: IFeature[];
  private settings: Settings;
  private logger: Logger;
  private obsidianUtils: ObsidianUtils;
  private editorUtils: EditorUtils;
  private listsUtils: ListUtils;

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
        this.editorUtils,
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
      new ZoomFeature(this, this.settings, this.obsidianUtils, this.listsUtils),
      new FoldFeature(this, this.obsidianUtils, this.listsUtils),
      new SelectAllFeature(this, this.settings, this.listsUtils),
      new MoveItemsFeature(this, this.obsidianUtils, this.listsUtils),
    ];

    for (const feature of this.features) {
      await feature.load();
    }
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    for (const feature of this.features) {
      await feature.unload();
    }
  }
}
