import { App } from "obsidian";

export interface ObsidianTabsSettings {
  useTab: boolean;
  tabSize: number;
}

export interface ObsidianFoldSettings {
  foldIndent: boolean;
}

export class ObsidianSettings {
  constructor(private app: App) {}

  isLegacyEditorEnabled() {
    const config: { legacyEditor: boolean } = {
      legacyEditor: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };

    return config.legacyEditor;
  }

  isDefaultThemeEnabled() {
    const config: { cssTheme: string } = {
      cssTheme: "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };

    return config.cssTheme === "";
  }

  getTabsSettings(): ObsidianTabsSettings {
    return {
      useTab: true,
      tabSize: 4,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };
  }

  getFoldSettings(): ObsidianFoldSettings {
    return {
      foldIndent: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(this.app.vault as any).config,
    };
  }

  getDefaultIndentChars() {
    const { useTab, tabSize } = this.getTabsSettings();

    return useTab ? "\t" : new Array(tabSize).fill(" ").join("");
  }
}
