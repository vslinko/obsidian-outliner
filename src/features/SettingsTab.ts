import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

import { Feature } from "./Feature";

import {
  KeepCursorWithinContent,
  Settings,
  VerticalLinesAction,
} from "../services/Settings";

class ObsidianOutlinerPluginSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private settings: Settings,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Stick the cursor to the content")
      .setDesc("Don't let the cursor move to the bullet position.")
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            never: "Never",
            "bullet-only": "Stick cursor out of bullets",
            "bullet-and-checkbox": "Stick cursor out of bullets and checkboxes",
          } as { [key in KeepCursorWithinContent]: string })
          .setValue(this.settings.keepCursorWithinContent)
          .onChange(async (value: KeepCursorWithinContent) => {
            this.settings.keepCursorWithinContent = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Enhance the Tab key")
      .setDesc("Make Tab and Shift-Tab behave the same as other outliners.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.overrideTabBehaviour)
          .onChange(async (value) => {
            this.settings.overrideTabBehaviour = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Enhance the Enter key")
      .setDesc("Make the Enter key behave the same as other outliners.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.overrideEnterBehaviour)
          .onChange(async (value) => {
            this.settings.overrideEnterBehaviour = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Vim-mode o/O inserts bullets")
      .setDesc("Create a bullet when pressing o or O in Vim mode.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.overrideVimOBehaviour)
          .onChange(async (value) => {
            this.settings.overrideVimOBehaviour = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Enhance the Ctrl+A or Cmd+A behavior")
      .setDesc(
        "Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list.",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.overrideSelectAllBehaviour)
          .onChange(async (value) => {
            this.settings.overrideSelectAllBehaviour = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Improve the style of your lists")
      .setDesc(
        "Styles are only compatible with built-in Obsidian themes and may not be compatible with other themes.",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.settings.betterListsStyles)
          .onChange(async (value) => {
            this.settings.betterListsStyles = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName("Draw vertical indentation lines")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.verticalLines).onChange(async (value) => {
          this.settings.verticalLines = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Vertical indentation line click action")
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            none: "None",
            "zoom-in": "Zoom In",
            "toggle-folding": "Toggle Folding",
          } as { [key in VerticalLinesAction]: string })
          .setValue(this.settings.verticalLinesAction)
          .onChange(async (value: VerticalLinesAction) => {
            this.settings.verticalLinesAction = value;
            await this.settings.save();
          });
      });

    new Setting(containerEl).setName("Drag-and-Drop").addToggle((toggle) => {
      toggle.setValue(this.settings.dragAndDrop).onChange(async (value) => {
        this.settings.dragAndDrop = value;
        await this.settings.save();
      });
    });

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc(
        "Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.",
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.debug).onChange(async (value) => {
          this.settings.debug = value;
          await this.settings.save();
        });
      });
  }
}

export class SettingsTab implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
  ) {}

  async load() {
    this.plugin.addSettingTab(
      new ObsidianOutlinerPluginSettingTab(
        this.plugin.app,
        this.plugin,
        this.settings,
      ),
    );
  }

  async unload() {}
}
