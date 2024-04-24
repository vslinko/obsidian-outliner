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
// import { ReleaseNotesAnnouncement } from "./features/ReleaseNotesAnnouncement";
import { SettingsTab } from "./features/SettingsTab";
import { ShiftTabBehaviourOverride } from "./features/ShiftTabBehaviourOverride";
import { SystemInfo } from "./features/SystemInfo";
import { TabBehaviourOverride } from "./features/TabBehaviourOverride";
import { VerticalLines } from "./features/VerticalLines";
import { VimOBehaviourOverride } from "./features/VimOBehaviourOverride";
import { ChangesApplicator } from "./services/ChangesApplicator";
import { IMEDetector } from "./services/IMEDetector";
import { Logger } from "./services/Logger";
import { ObsidianSettings } from "./services/ObsidianSettings";
import { OperationPerformer } from "./services/OperationPerformer";
import { Parser } from "./services/Parser";
import { Settings } from "./services/Settings";

declare global {
  const PLUGIN_VERSION: string;
  const CHANGELOG_MD: string;
}

export default class ObsidianOutlinerPlugin extends Plugin {
  private features: Feature[];
  protected settings: Settings;
  private logger: Logger;
  private obsidianSettings: ObsidianSettings;
  private parser: Parser;
  private changesApplicator: ChangesApplicator;
  private operationPerformer: OperationPerformer;
  private imeDetector: IMEDetector;

  async onload() {
    console.log(`Loading obsidian-outliner`);

    await this.prepareSettings();

    this.obsidianSettings = new ObsidianSettings(this.app);
    this.logger = new Logger(this.settings);
    this.parser = new Parser(this.logger, this.settings);
    this.changesApplicator = new ChangesApplicator();
    this.operationPerformer = new OperationPerformer(
      this.parser,
      this.changesApplicator,
    );

    this.imeDetector = new IMEDetector();
    await this.imeDetector.load();

    this.features = [
      // service features
      // new ReleaseNotesAnnouncement(this, this.settings),
      new SettingsTab(this, this.settings),
      new SystemInfo(this, this.settings),

      // general features
      new ListsMovementCommands(
        this,
        this.obsidianSettings,
        this.operationPerformer,
      ),
      new ListsFoldingCommands(this, this.obsidianSettings),

      // features based on settings.keepCursorWithinContent
      new EditorSelectionsBehaviourOverride(
        this,
        this.settings,
        this.parser,
        this.operationPerformer,
      ),
      new ArrowLeftAndCtrlArrowLeftBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),
      new BackspaceBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),
      new MetaBackspaceBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),
      new DeleteBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),

      // features based on settings.overrideTabBehaviour
      new TabBehaviourOverride(
        this,
        this.imeDetector,
        this.obsidianSettings,
        this.settings,
        this.operationPerformer,
      ),
      new ShiftTabBehaviourOverride(
        this,
        this.imeDetector,
        this.settings,
        this.operationPerformer,
      ),

      // features based on settings.overrideEnterBehaviour
      new EnterBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.obsidianSettings,
        this.parser,
        this.operationPerformer,
      ),

      new VimOBehaviourOverride(
        this,
        this.settings,
        this.obsidianSettings,
        this.parser,
        this.operationPerformer,
      ),

      // features based on settings.overrideSelectAllBehaviour
      new CtrlAAndCmdABehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),

      // features based on settings.betterListsStyles
      new BetterListsStyles(this.settings, this.obsidianSettings),

      // features based on settings.verticalLines
      new VerticalLines(
        this,
        this.settings,
        this.obsidianSettings,
        this.parser,
      ),

      // features based on settings.dragAndDrop
      new DragAndDrop(
        this,
        this.settings,
        this.obsidianSettings,
        this.parser,
        this.operationPerformer,
      ),
    ];

    for (const feature of this.features) {
      await feature.load();
    }
  }

  async onunload() {
    console.log(`Unloading obsidian-outliner`);

    await this.imeDetector.unload();

    for (const feature of this.features) {
      await feature.unload();
    }
  }

  protected async prepareSettings() {
    this.settings = new Settings(this);
    await this.settings.load();
  }
}
