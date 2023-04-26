import { Feature } from "./Feature";

import { ObsidianService } from "../services/ObsidianService";
import { SettingsService } from "../services/SettingsService";

const BETTER_LISTS_BODY_CLASS = "outliner-plugin-better-lists";

export class BetterListsStyles implements Feature {
  private updateBodyClassInterval: number;

  constructor(
    private settings: SettingsService,
    private obsidian: ObsidianService
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
      this.obsidian.isDefaultThemeEnabled() && this.settings.styleLists;
    const exists = document.body.classList.contains(BETTER_LISTS_BODY_CLASS);

    if (shouldExists && !exists) {
      document.body.classList.add(BETTER_LISTS_BODY_CLASS);
    }

    if (!shouldExists && exists) {
      document.body.classList.remove(BETTER_LISTS_BODY_CLASS);
    }
  };
}
