import { Plugin } from "obsidian";
import {
  ObsidianOutlinerPluginSettingTab,
  SettingsService,
} from "./services/SettingsService";
import { IFeature } from "./features/IFeature";
import { ObsidianService } from "./services/ObsidianService";
import { ListsService } from "./services/ListsService";
import { LoggerService } from "./services/LoggerService";
import { ListsStylesFeature } from "./features/ListsStylesFeature";
import { EnterOutdentIfLineIsEmptyFeature } from "./features/EnterOutdentIfLineIsEmptyFeature";
import { EnterShouldCreateNewItemFeature } from "./features/EnterShouldCreateNewItemOnChildLevelFeature";
import { MoveCursorToPreviousUnfoldedLineFeature } from "./features/MoveCursorToPreviousUnfoldedLineFeature";
import { EnsureCursorInListContentFeature } from "./features/EnsureCursorInListContentFeature";
import { DeleteShouldIgnoreBulletsFeature } from "./features/DeleteShouldIgnoreBulletsFeature";
import { SelectionShouldIgnoreBulletsFeature } from "./features/SelectionShouldIgnoreBulletsFeature";
import { ZoomFeature } from "./features/ZoomFeature";
import { FoldFeature } from "./features/FoldFeature";
import { SelectAllFeature } from "./features/SelectAllFeature";
import { MoveItemsFeature } from "./features/MoveItemsFeature";
import { ShiftEnterShouldCreateNoteFeature } from "./features/ShiftEnterShouldCreateNoteFeature";
import { IMEService } from "./services/IMEService";

export default class ObsidianOutlinerPlugin extends Plugin {
  private features: IFeature[];
  protected settingsService: SettingsService;
  private loggerService: LoggerService;
  private obsidianService: ObsidianService;
  private listsService: ListsService;
  private imeService: IMEService;

  async onload() {
    console.log(`Loading obsidian-outliner`);

    this.settingsService = new SettingsService(this);
    await this.settingsService.load();

    this.loggerService = new LoggerService(this.settingsService);

    this.obsidianService = new ObsidianService(this.app);
    this.listsService = new ListsService(
      this.loggerService,
      this.obsidianService
    );

    this.imeService = new IMEService();
    await this.imeService.load();

    this.addSettingTab(
      new ObsidianOutlinerPluginSettingTab(this.app, this, this.settingsService)
    );

    this.features = [
      new ListsStylesFeature(this, this.settingsService, this.obsidianService),
      new EnterOutdentIfLineIsEmptyFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
      new EnterShouldCreateNewItemFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
      new EnsureCursorInListContentFeature(
        this,
        this.settingsService,
        this.listsService
      ),
      new MoveCursorToPreviousUnfoldedLineFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
      new DeleteShouldIgnoreBulletsFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
      new SelectionShouldIgnoreBulletsFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
      new ZoomFeature(this, this.settingsService, this.imeService),
      new FoldFeature(this, this.obsidianService),
      new SelectAllFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
      new MoveItemsFeature(
        this,
        this.obsidianService,
        this.listsService,
        this.imeService
      ),
      new ShiftEnterShouldCreateNoteFeature(
        this,
        this.settingsService,
        this.listsService,
        this.imeService
      ),
    ];

    for (const feature of this.features) {
      await feature.load();
    }
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    await this.imeService.unload();

    for (const feature of this.features) {
      await feature.unload();
    }
  }
}
