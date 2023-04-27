import { App } from "obsidian";

export interface ObsidianTabsSettings {
  useTab: boolean;
  tabSize: number;
}

export interface ObsidianFoldSettings {
  foldIndent: boolean;
}

function getHiddenObsidianConfig(app: App) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (app.vault as any).config;
}

export class ObsidianSettings {
  constructor(private app: App) {}

  isLegacyEditorEnabled() {
    const config: { legacyEditor: boolean } = {
      legacyEditor: false,
      ...getHiddenObsidianConfig(this.app),
    };

    return config.legacyEditor;
  }

  isDefaultThemeEnabled() {
    const config: { cssTheme: string } = {
      cssTheme: "",
      ...getHiddenObsidianConfig(this.app),
    };

    return config.cssTheme === "";
  }

  getTabsSettings(): ObsidianTabsSettings {
    return {
      useTab: true,
      tabSize: 4,
      ...getHiddenObsidianConfig(this.app),
    };
  }

  getFoldSettings(): ObsidianFoldSettings {
    return {
      foldIndent: true,
      ...getHiddenObsidianConfig(this.app),
    };
  }

  getDefaultIndentChars() {
    const { useTab, tabSize } = this.getTabsSettings();

    return useTab ? "\t" : new Array(tabSize).fill(" ").join("");
  }
}
