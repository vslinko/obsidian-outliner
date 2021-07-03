import { Notice, Platform, Plugin_2 } from "obsidian";
import { IMEService } from "src/services/IMEService";
import { SettingsService } from "src/services/SettingsService";
import { IFeature } from "./IFeature";

function isCmdDotOrCmdShiftDot(e: KeyboardEvent) {
  return (
    (e.keyCode === 190 || e.code === "Period") &&
    e.metaKey === true &&
    e.altKey === false &&
    e.ctrlKey === false
  );
}

function isCtrlDotOrCtrlShiftDot(e: KeyboardEvent) {
  return (
    (e.keyCode === 190 || e.code === "Period") &&
    e.metaKey === false &&
    e.altKey === false &&
    e.ctrlKey === true
  );
}

function isModDotOrModShiftDot(e: KeyboardEvent) {
  return Platform.isMacOS
    ? isCmdDotOrCmdShiftDot(e)
    : isCtrlDotOrCtrlShiftDot(e);
}

export class ZoomFeature implements IFeature {
  constructor(
    private plugin: Plugin_2,
    private settingsService: SettingsService,
    private imeService: IMEService
  ) {}

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("keydown", this.onKeyDown);
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("keydown", this.onKeyDown);
    });
  }

  private onKeyDown = (cm: CodeMirror.Editor, e: KeyboardEvent) => {
    if (
      (window as any).ObsidianZoomPlugin ||
      this.settingsService.disableZoomNotification ||
      !isModDotOrModShiftDot(e) ||
      this.imeService.isIMEOpened()
    ) {
      return;
    }

    new Notice(
      `Zooming support has been removed from the Obsidian Outliner plugin. Please install the Obsidian Zoom plugin.`,
      5000
    );
  };
}
