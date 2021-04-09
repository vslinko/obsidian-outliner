import { App } from "obsidian";

export interface IObsidianTabsSettigns {
  useTab: boolean;
  tabSize: number;
}

export class ObsidianUtils {
  constructor(private app: App) {}

  getObsidianTabsSettigns(): IObsidianTabsSettigns {
    return {
      useTab: true,
      tabSize: 4,
      ...(this.app.vault as any).config,
    };
  }
}
