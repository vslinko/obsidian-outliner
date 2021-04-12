import { Settings } from "../settings";
import { Plugin_2 } from "obsidian";
import { IFeature } from "../feature";
import { ObsidianUtils } from "../obsidian_utils";

const text = (size: number) =>
  `Outliner styles doesn't work with ${size}-spaces-tabs. Please check your Obsidian settings.`;

export class ListsStylesFeature implements IFeature {
  private statusBarText: HTMLElement;
  private interval: number;

  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private obsidianUtils: ObsidianUtils
  ) {}

  async load() {
    if (this.settings.styleLists) {
      this.addListsStyles();
    }

    this.settings.onChange("styleLists", this.onSettingsChange);

    this.addStatusBarText();
    this.startStatusBarInterval();
  }

  async unload() {
    clearInterval(this.interval);
    this.statusBarText.parentElement.removeChild(this.statusBarText);
    this.settings.removeCallback("styleLists", this.onSettingsChange);
    this.removeListsStyles();
  }

  private startStatusBarInterval() {
    let visible: number | null = null;

    this.interval = window.setInterval(() => {
      const { useTab, tabSize } = this.obsidianUtils.getObsidianTabsSettigns();

      const shouldBeVisible =
        this.settings.styleLists && useTab && tabSize !== 4;

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

  private onSettingsChange = (styleLists: boolean) => {
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
  }

  private addListsStyles() {
    document.body.classList.add("outliner-plugin-bls");
  }

  private removeListsStyles() {
    document.body.classList.remove("outliner-plugin-bls");
  }
}
