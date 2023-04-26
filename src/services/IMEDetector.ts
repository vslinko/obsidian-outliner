import { Platform } from "obsidian";

export class IMEDetector {
  private composition = false;

  async load() {
    document.addEventListener("compositionstart", this.onCompositionStart);
    document.addEventListener("compositionend", this.onCompositionEnd);
  }

  async unload() {
    document.removeEventListener("compositionend", this.onCompositionEnd);
    document.removeEventListener("compositionstart", this.onCompositionStart);
  }

  isOpened() {
    return this.composition && Platform.isDesktop;
  }

  private onCompositionStart = () => {
    this.composition = true;
  };

  private onCompositionEnd = () => {
    this.composition = false;
  };
}
