import { MarkdownRenderer, Modal, Plugin_2 } from "obsidian";

import { Feature } from "./Feature";

import { SettingsService } from "../services/SettingsService";

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

export class ReleaseNotesAnnouncement implements Feature {
  private modal: ReleaseNotesModal | null = null;

  constructor(private plugin: Plugin_2, private settings: SettingsService) {}

  async load() {
    this.plugin.addCommand({
      id: "show-release-notes",
      name: "Show Release Notes",
      callback: this.showModal,
    });

    const shouldShow =
      compareReleases(
        PLUGIN_VERSION,
        this.settings.previousRelease || "0.0.0"
      ) > 0;

    if (!shouldShow) {
      return;
    }

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
    const markdown = CHANGELOG_MD;
    const lines = markdown.split("\n");
    let lastLine = lines.length;
    if (previousRelease) {
      const lastLineFound = lines.findIndex(
        (line) => line.startsWith("#") && line.includes(previousRelease)
      );
      if (lastLineFound >= 0) {
        lastLine = lastLineFound;
      }
    }

    const modalTitle = `Welcome to Obsidian Outliner ${PLUGIN_VERSION}`;
    const modalContent = lines
      .slice(0, lastLine)
      .filter((l) => !/^#+\s+\d+\.\d+\.\d+$/.test(l))
      .join("\n")
      .trim();

    if (modalContent.length === 0) {
      return;
    }

    this.modal = new ReleaseNotesModal(
      this.plugin,
      modalTitle,
      modalContent,
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
