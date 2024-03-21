import { Feature } from "./Feature";

import { ObsidianSettings } from "../services/ObsidianSettings";
import { Settings } from "../services/Settings";

const BETTER_LISTS_BODY_CLASS = "outliner-plugin-better-lists";

export class BetterListsStyles implements Feature {
  private updateBodyClassInterval: number;

  constructor(
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
  ) {}

  async load() {
    this.updateBodyClass();
    this.updateBodyClassInterval = window.setInterval(() => {
      this.updateBodyClass();
    }, 1000);
  }

  async unload() {
    clearInterval(this.updateBodyClassInterval);
    document.body.classList.remove(BETTER_LISTS_BODY_CLASS);
  }

  private updateBodyClass = () => {
    const shouldExists =
      this.obsidianSettings.isDefaultThemeEnabled() &&
      this.settings.betterListsStyles;
    const exists = document.body.classList.contains(BETTER_LISTS_BODY_CLASS);

    if (shouldExists && !exists) {
      document.body.classList.add(BETTER_LISTS_BODY_CLASS);
    }

    if (!shouldExists && exists) {
      document.body.classList.remove(BETTER_LISTS_BODY_CLASS);
    }
  };
}
