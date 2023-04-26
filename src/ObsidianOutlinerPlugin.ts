import { Plugin } from "obsidian";

import { ArrowLeftAndCtrlArrowLeftBehaviourOverride } from "./features/ArrowLeftAndCtrlArrowLeftBehaviourOverride";
import { BackspaceBehaviourOverride } from "./features/BackspaceBehaviourOverride";
import { BetterListsStyles } from "./features/BetterListsStyles";
import { CtrlAAndCmdABehaviourOverride } from "./features/CtrlAAndCmdABehaviourOverride";
import { DeleteBehaviourOverride } from "./features/DeleteBehaviourOverride";
import { DragAndDrop } from "./features/DragAndDrop";
import { EditorSelectionsBehaviourOverride } from "./features/EditorSelectionsBehaviourOverride";
import { EnterBehaviourOverride } from "./features/EnterBehaviourOverride";
import { Feature } from "./features/Feature";
import { ListsFoldingCommands } from "./features/ListsFoldingCommands";
import { ListsMovementCommands } from "./features/ListsMovementCommands";
import { MetaBackspaceBehaviourOverride } from "./features/MetaBackspaceBehaviourOverride";
import { ReleaseNotesAnnouncement } from "./features/ReleaseNotesAnnouncement";
import { SettingsTab } from "./features/SettingsTab";
import { ShiftEnterBehaviourOverride } from "./features/ShiftEnterBehaviourOverride";
import { ShiftTabBehaviourOverride } from "./features/ShiftTabBehaviourOverride";
import { TabBehaviourOverride } from "./features/TabBehaviourOverride";
import { VerticalLines } from "./features/VerticalLines";
import { ApplyChangesService } from "./services/ApplyChangesService";
import { IMEService } from "./services/IMEService";
import { LoggerService } from "./services/LoggerService";
import { ObsidianService } from "./services/ObsidianService";
import { ParserService } from "./services/ParserService";
import { PerformOperationService } from "./services/PerformOperationService";
import { SettingsService } from "./services/SettingsService";

declare global {
  const PLUGIN_VERSION: string;
  const CHANGELOG_MD: string;
}

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
      // service features
      new ReleaseNotesAnnouncement(this, this.settings),
      new SettingsTab(this, this.settings),

      // general features
      new ListsMovementCommands(this, this.obsidian, this.performOperation),
      new ListsFoldingCommands(this, this.obsidian),

      // features based on settings.stickCursor
      new EditorSelectionsBehaviourOverride(
        this,
        this.settings,
        this.obsidian,
        this.parser,
        this.performOperation
      ),
      new ArrowLeftAndCtrlArrowLeftBehaviourOverride(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new BackspaceBehaviourOverride(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new MetaBackspaceBehaviourOverride(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),
      new DeleteBehaviourOverride(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),

      // features based on settings.betterTab
      new TabBehaviourOverride(
        this,
        this.ime,
        this.obsidian,
        this.settings,
        this.performOperation
      ),
      new ShiftTabBehaviourOverride(
        this,
        this.ime,
        this.obsidian,
        this.settings,
        this.performOperation
      ),

      // features based on settings.betterEnter
      new EnterBehaviourOverride(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.parser,
        this.performOperation
      ),
      new ShiftEnterBehaviourOverride(
        this,
        this.obsidian,
        this.settings,
        this.ime,
        this.performOperation
      ),

      // features based on settings.selectAll
      new CtrlAAndCmdABehaviourOverride(
        this,
        this.settings,
        this.ime,
        this.obsidian,
        this.performOperation
      ),

      // features based on settings.styleLists
      new BetterListsStyles(this.settings, this.obsidian),

      // features based on settings.listLines
      new VerticalLines(this, this.settings, this.obsidian, this.parser),

      // features based on settings.dndExperiment
      new DragAndDrop(
        this,
        this.settings,
        this.obsidian,
        this.parser,
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
