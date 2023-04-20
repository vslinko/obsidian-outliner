import { Plugin } from "obsidian";

import { DeleteShouldIgnoreBulletsFeature } from "./features/DeleteShouldIgnoreBulletsFeature";
import { DragAndDropFeature } from "./features/DragAndDropFeature";
import { EnsureCursorInListContentFeature } from "./features/EnsureCursorInListContentFeature";
import { EnterOutdentIfLineIsEmptyFeature } from "./features/EnterOutdentIfLineIsEmptyFeature";
import { EnterShouldCreateNewItemFeature } from "./features/EnterShouldCreateNewItemOnChildLevelFeature";
import { Feature } from "./features/Feature";
import { FoldFeature } from "./features/FoldFeature";
import { LinesFeature } from "./features/LinesFeature";
import { ListsStylesFeature } from "./features/ListsStylesFeature";
import { MoveCursorToPreviousUnfoldedLineFeature } from "./features/MoveCursorToPreviousUnfoldedLineFeature";
import { MoveItemsFeature } from "./features/MoveItemsFeature";
import { SelectAllFeature } from "./features/SelectAllFeature";
import { SettingsTabFeature } from "./features/SettingsTabFeature";
import { ShiftEnterShouldCreateNoteFeature } from "./features/ShiftEnterShouldCreateNoteFeature";
import { ApplyChangesService } from "./services/ApplyChangesService";
import { IMEService } from "./services/IMEService";
import { LoggerService } from "./services/LoggerService";
import { ObsidianService } from "./services/ObsidianService";
import { ParserService } from "./services/ParserService";
import { PerformOperationService } from "./services/PerformOperationService";
import { SettingsService } from "./services/SettingsService";

export default class ObsidianOutlinerPlugin extends Plugin {
  private features: Feature[];
  protected settings: SettingsService;
  private logger: LoggerService;
  private obsidian: ObsidianService;
  private parser: ParserService;
  private applyChanges: ApplyChangesService;
  private performOperation: PerformOperationService;
  private ime: IMEService;

  async onload() {
    console.log(`Loading obsidian-outliner`);

    this.obsidian = new ObsidianService(this.app);

    this.settings = new SettingsService(this);
    await this.settings.load();

    this.logger = new LoggerService(this.settings);

    this.parser = new ParserService(this.logger, this.settings);
    this.applyChanges = new ApplyChangesService();
    this.performOperation = new PerformOperationService(
      this.parser,
      this.applyChanges
    );

    this.ime = new IMEService();
    await this.ime.load();

    this.features = [
      new DragAndDropFeature(
        this,
        this.settings,
        this.obsidian,
        this.parser,
        this.performOperation
      ),
      new SettingsTabFeature(this, this.settings),
      new ListsStylesFeature(this.settings, this.obsidian),
      new EnterOutdentIfLineIsEmptyFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new EnterShouldCreateNewItemFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new EnsureCursorInListContentFeature(
        this,
        this.settings,
        this.obsidian,
        this.performOperation
      ),
      new MoveCursorToPreviousUnfoldedLineFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new DeleteShouldIgnoreBulletsFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new FoldFeature(this, this.obsidian),
      new SelectAllFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new MoveItemsFeature(
        this,
        this.ime,
        this.obsidian,
        this.settings,
        this.performOperation
      ),
      new ShiftEnterShouldCreateNoteFeature(
        this,
        this.obsidian,
        this.settings,
        this.ime,
        this.performOperation
      ),
      new LinesFeature(this, this.settings, this.obsidian, this.parser),
    ];

    for (const feature of this.features) {
      await feature.load();
    }
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    await this.ime.unload();

    for (const feature of this.features) {
      await feature.unload();
    }
  }
}
