import { Plugin_2 } from "obsidian";

import { Feature } from "./Feature";

import { ObsidianService } from "../services/ObsidianService";
import { SettingsService } from "../services/SettingsService";

const STATUS_BAR_TEXT = `Outliner styles only work with four-space tabs. Please check Obsidian settings.`;

export class ListsStylesFeature implements Feature {
  private statusBarText: HTMLElement;
  private interval: number;

  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private obsidian: ObsidianService
  ) {}

  async load() {
    if (this.settings.styleLists) {
      this.addListsStyles();
    }

    this.settings.onChange("styleLists", this.onStyleListsSettingChange);

    this.addStatusBarText();
    this.startStatusBarInterval();
  }

  async unload() {
    clearInterval(this.interval);
    if (this.statusBarText.parentElement) {
      this.statusBarText.parentElement.removeChild(this.statusBarText);
    }
    this.settings.removeCallback("styleLists", this.onStyleListsSettingChange);
    this.removeListsStyles();
  }

  private startStatusBarInterval() {
    let visible = false;

    this.interval = window.setInterval(() => {
      const { tabSize } = this.obsidian.getObsidianTabsSettings();

      const shouldBeVisible =
        this.settings.styleLists &&
        !(tabSize === 4) &&
        !this.settings.hideWarning;

      if (shouldBeVisible && !visible) {
        this.statusBarText.style.display = "block";
        visible = true;
      } else if (!shouldBeVisible && visible) {
        this.statusBarText.style.display = "none";
        visible = false;
      }
    }, 1000);
  }

  private onStyleListsSettingChange = (styleLists: boolean) => {
    if (styleLists) {
      this.addListsStyles();
    } else {
      this.removeListsStyles();
    }
  };

  private addStatusBarText() {
    this.statusBarText = this.plugin.addStatusBarItem();
    this.statusBarText.style.color = "red";
    this.statusBarText.style.display = "none";
    this.statusBarText.setText(STATUS_BAR_TEXT);
  }

  private addListsStyles() {
    document.body.classList.add("outliner-plugin-bls");
  }

  private removeListsStyles() {
    document.body.classList.remove("outliner-plugin-bls");
  }
}
