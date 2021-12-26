import { App, PluginSettingTab, Plugin_2, Setting } from "obsidian";

import { Feature } from "./Feature";

import { SettingsService } from "../services/SettingsService";

class ObsidianOutlinerPluginSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin_2, private settings: SettingsService) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Improve the style of your lists")
      .setDesc(
        "Styles are only compatible with built-in Obsidian themes and may not be compatible with other themes. Styles only work well with tab size 4."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.styleLists).onChange(async (value) => {
          this.settings.styleLists = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Stick the cursor to the content")
      .setDesc("Don't let the cursor move to the bullet position.")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.stickCursor).onChange(async (value) => {
          this.settings.stickCursor = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Enhance the Enter key")
      .setDesc("Make the Enter key behave the same as other outliners.")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.betterEnter).onChange(async (value) => {
          this.settings.betterEnter = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Enhance the Ctrl+A or Cmd+A behavior")
      .setDesc(
        "Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.selectAll).onChange(async (value) => {
          this.settings.selectAll = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Hide the warning about four-space tabs")
      .addToggle((toggle) => {
        toggle.setValue(this.settings.hideWarning).onChange(async (value) => {
          this.settings.hideWarning = value;
          await this.settings.save();
        });
      });

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc(
        "Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs."
      )
      .addToggle((toggle) => {
        toggle.setValue(this.settings.debug).onChange(async (value) => {
          this.settings.debug = value;
          await this.settings.save();
        });
      });
  }
}

export class SettingsTabFeature implements Feature {
  constructor(private plugin: Plugin_2, private settings: SettingsService) {}

  async load() {
    this.plugin.addSettingTab(
      new ObsidianOutlinerPluginSettingTab(
        this.plugin.app,
        this.plugin,
        this.settings
      )
    );
  }

  async unload() {}
}
