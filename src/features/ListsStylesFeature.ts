import { SettingsService } from "../services/SettingsService";
import { Plugin_2 } from "obsidian";
import { IFeature } from "./IFeature";
import { ObsidianService } from "../services/ObsidianService";

const text = (size: number) =>
  `Outliner styles doesn't work with ${size}-spaces-tabs. Please check your Obsidian settings.`;

export class ListsStylesFeature implements IFeature {
  private statusBarText: HTMLElement;
  private interval: number;

  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private obsidianService: ObsidianService
  ) {}

  async load() {
    if (this.settingsService.styleLists) {
      this.addListsStyles();
    }
    if (this.settingsService.zoomOnClick) {
      this.addZoomStyles();
    }

    this.settingsService.onChange("styleLists", this.onStyleListsSettingChange);
    this.settingsService.onChange(
      "zoomOnClick",
      this.onZoomOnClickSettingChange
    );

    this.addStatusBarText();
    this.startStatusBarInterval();
  }

  async unload() {
    clearInterval(this.interval);
    if (this.statusBarText.parentElement) {
      this.statusBarText.parentElement.removeChild(this.statusBarText);
    }
    this.settingsService.removeCallback(
      "zoomOnClick",
      this.onZoomOnClickSettingChange
    );
    this.settingsService.removeCallback(
      "styleLists",
      this.onStyleListsSettingChange
    );
    this.removeListsStyles();
  }

  private startStatusBarInterval() {
    let visible: number | null = null;

    this.interval = window.setInterval(() => {
      const { useTab, tabSize } =
        this.obsidianService.getObsidianTabsSettigns();

      const shouldBeVisible =
        this.settingsService.styleLists && useTab && tabSize !== 4;

      if (shouldBeVisible && visible !== tabSize) {
        this.statusBarText.style.display = "block";
        this.statusBarText.setText(text(tabSize));
        visible = tabSize;
      } else if (!shouldBeVisible && visible !== null) {
        this.statusBarText.style.display = "none";
        visible = null;
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

  private onZoomOnClickSettingChange = (zoomOnClick: boolean) => {
    if (zoomOnClick) {
      this.addZoomStyles();
    } else {
      this.removeZoomStyles();
    }
  };

  private addStatusBarText() {
    this.statusBarText = this.plugin.addStatusBarItem();
    this.statusBarText.style.color = "red";
    this.statusBarText.style.display = "none";
  }

  private addListsStyles() {
    document.body.classList.add("outliner-plugin-bls");
  }

  private removeListsStyles() {
    document.body.classList.remove("outliner-plugin-bls");
  }

  private addZoomStyles() {
    document.body.classList.add("outliner-plugin-bls-zoom");
  }

  private removeZoomStyles() {
    document.body.classList.remove("outliner-plugin-bls-zoom");
  }
}
