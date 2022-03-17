import { Notice, Plugin } from "obsidian";

import { Feature } from "./features/Feature";
import { FoldingCommandsFeature } from "./features/FoldingCommandsFeature";
import { HandleSelectionsChangesFeature } from "./features/HandleSelectionsChangesFeature";
import { LinesFeature } from "./features/LinesFeature";
import { ListsStylesFeature } from "./features/ListsStylesFeature";
import { MoveItemsCommandsFeature } from "./features/MoveItemsCommandsFeature";
import { OverrideArrowLeftBehaviourFeature } from "./features/OverrideArrowLeftBehaviourFeature";
import { OverrideBackspaceBehaviourFeature } from "./features/OverrideBackspaceBehaviourFeature";
import { OverrideCmdAFeature } from "./features/OverrideCmdAFeature";
import { OverrideCmdBackspaceBehaviourFeature } from "./features/OverrideCmdBackspaceBehaviourFeature";
import { OverrideCmdShiftArrowLeftBehaviourFeature } from "./features/OverrideCmdShiftArrowLeftBehaviourFeature";
import { OverrideDeleteBehaviourFeature } from "./features/OverrideDeleteBehaviourFeature";
import { OverrideEnterBehaviourFeature } from "./features/OverrideEnterBehaviourFeature";
import { OverrideShiftEnterBehaviourFeature } from "./features/OverrideShiftEnterBehaviourFeature";
import { OverrideShiftTabBehaviourFeature } from "./features/OverrideShiftTabBehaviourFeature";
import { OverrideTabBehaviourFeature } from "./features/OverrideTabBehaviourFeature";
import { SettingsTabFeature } from "./features/SettingsTabFeature";
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

    if (this.obsidian.isLegacyEditorEnabled()) {
      new Notice(
        `Outliner plugin does not support legacy editor mode starting from version 2.0. Please disable the "Use legacy editor" option or manually install version 1.0 of Outliner plugin.`,
        30000
      );
      return;
    }

    this.settings = new SettingsService(this);
    await this.settings.load();

    this.logger = new LoggerService(this.settings);

    this.parser = new ParserService(this.logger);
    this.applyChanges = new ApplyChangesService();
    this.performOperation = new PerformOperationService(
      this.parser,
      this.applyChanges
    );

    this.ime = new IMEService();
    await this.ime.load();

    this.features = [
      new SettingsTabFeature(this, this.settings),
      new FoldingCommandsFeature(this, this.obsidian),
      new MoveItemsCommandsFeature(
        this,
        this.ime,
        this.obsidian,
        this.performOperation
      ),

      // styleLists
      new ListsStylesFeature(this.settings, this.obsidian),

      // listLines
      new LinesFeature(this, this.settings, this.obsidian, this.parser),

      // stickCursor
      new HandleSelectionsChangesFeature(
        this,
        this.settings,
        this.obsidian,
        this.parser,
        this.performOperation
      ),
      new OverrideArrowLeftBehaviourFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new OverrideCmdShiftArrowLeftBehaviourFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new OverrideBackspaceBehaviourFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new OverrideCmdBackspaceBehaviourFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new OverrideDeleteBehaviourFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),

      // betterTab
      new OverrideTabBehaviourFeature(
        this,
        this.ime,
        this.obsidian,
        this.settings,
        this.performOperation
      ),
      new OverrideShiftTabBehaviourFeature(
        this,
        this.ime,
        this.obsidian,
        this.settings,
        this.performOperation
      ),

      // betterEnter
      new OverrideEnterBehaviourFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.parser,
        this.performOperation
      ),
      new OverrideShiftEnterBehaviourFeature(
        this,
        this.obsidian,
        this.settings,
        this.ime,
        this.parser,
        this.performOperation
      ),

      // selectAll
      new OverrideCmdAFeature(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
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
