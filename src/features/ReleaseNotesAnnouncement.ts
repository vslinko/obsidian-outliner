import { MarkdownRenderer, Modal, Plugin_2 } from "obsidian";

import { Feature } from "./Feature";

import { Settings } from "../services/Settings";

class ReleaseNotesModal extends Modal {
  constructor(
    private plugin: Plugin_2,
    private title: string,
    private content: string,
    private cb: () => void
  ) {
    super(plugin.app);
  }

  async onOpen() {
    this.titleEl.setText(this.title);

    MarkdownRenderer.renderMarkdown(
      this.content,
      this.contentEl,
      "",
      this.plugin
    );
  }

  onClose() {
    this.cb();
  }
}

function compareReleases(a: string, b: string) {
  const [aMajor, aMinor, aPatch] = a.split(".", 3).map(Number);
  const [bMajor, bMinor, bPatch] = b.split(".", 3).map(Number);

  if (aMajor === bMajor) {
    if (aMinor === bMinor) {
      return aPatch - bPatch;
    }

    return aMinor - bMinor;
  }

  return aMajor - bMajor;
}

function parseChangelog() {
  const markdown = CHANGELOG_MD;
  const releaseNotes: [string, string][] = [];
  let version;
  let content = "";

  for (const line of markdown.split("\n")) {
    const versionHeaderMatches = /^#+\s+(\d+\.\d+\.\d+)$/.exec(line);
    if (versionHeaderMatches) {
      if (version && content.trim().length > 0) {
        releaseNotes.push([version, content]);
      }
      version = versionHeaderMatches[1];
      content = line;
      content += "\n";
    } else {
      content += line;
      content += "\n";
    }
  }

  if (version && content.trim().length > 0) {
    releaseNotes.push([version, content]);
  }

  return releaseNotes;
}

export class ReleaseNotesAnnouncement implements Feature {
  private modal: ReleaseNotesModal | null = null;

  constructor(private plugin: Plugin_2, private settings: Settings) {}

  async load() {
    this.plugin.addCommand({
      id: "show-release-notes",
      name: "Show Release Notes",
      callback: this.showModal,
    });

    this.showModal(this.settings.previousRelease);
  }

  async unload() {
    if (!this.modal) {
      return;
    }

    const modal = this.modal;
    this.modal = null;
    modal.close();
  }

  private showModal = (previousRelease: string | null = null) => {
    let releaseNotes = "";
    for (const [version, content] of parseChangelog()) {
      if (compareReleases(version, previousRelease || "0.0.0") > 0) {
        releaseNotes += content;
      }
    }

    if (releaseNotes.trim().length === 0) {
      return;
    }

    const modalTitle = `Welcome to Obsidian Outliner ${PLUGIN_VERSION}`;

    this.modal = new ReleaseNotesModal(
      this.plugin,
      modalTitle,
      releaseNotes,
      this.handleClose
    );
    this.modal.open();
  };

  private handleClose = async () => {
    if (!this.modal) {
      return;
    }

    this.settings.previousRelease = PLUGIN_VERSION;
    await this.settings.save();
  };
}
