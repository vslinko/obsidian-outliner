import { App, Modal, Plugin } from "obsidian";

import { Feature } from "./Feature";

import { Settings } from "../services/Settings";

interface AppHiddenProps {
  internalPlugins: {
    config: { [key: string]: boolean };
  };
  isMobile: boolean;
  plugins: {
    enabledPlugins: Set<string>;
    manifests: { [key: string]: { version: string } };
  };
  vault: {
    config: object;
  };
}

class SystemInfoModal extends Modal {
  constructor(
    app: App,
    private settings: Settings,
  ) {
    super(app);
  }

  async onOpen() {
    this.titleEl.setText("System Information");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = this.app as any as AppHiddenProps;

    const data = {
      process: {
        arch: process.arch,
        platform: process.platform,
      },
      app: {
        internalPlugins: {
          config: app.internalPlugins.config,
        },
        isMobile: app.isMobile,
        plugins: {
          enabledPlugins: Array.from(app.plugins.enabledPlugins),
          manifests: Object.keys(app.plugins.manifests).reduce(
            (acc, key) => {
              acc[key] = {
                version: app.plugins.manifests[key].version,
              };
              return acc;
            },
            {} as { [key: string]: { version: string } },
          ),
        },
        vault: {
          config: app.vault.config,
        },
      },
      plugin: {
        settings: { values: this.settings.getValues() },
      },
    };

    const text = JSON.stringify(data, null, 2);

    const pre = this.contentEl.createEl("pre");
    pre.setText(text);
    pre.setCssStyles({
      overflow: "scroll",
      maxHeight: "300px",
    });

    const button = this.contentEl.createEl("button");
    button.setText("Copy and Close");
    button.onClickEvent(() => {
      navigator.clipboard.writeText("```json\n" + text + "\n```");
      this.close();
    });
  }
}

export class SystemInfo implements Feature {
  constructor(
    private plugin: Plugin,
    private settings: Settings,
  ) {}

  async load() {
    this.plugin.addCommand({
      id: "system-info",
      name: "Show System Info",
      callback: this.callback,
      hotkeys: [
        {
          modifiers: ["Mod", "Shift", "Alt"],
          key: "I",
        },
      ],
    });
  }

  async unload() {}

  private callback = () => {
    const modal = new SystemInfoModal(this.plugin.app, this.settings);
    modal.open();
  };
}
