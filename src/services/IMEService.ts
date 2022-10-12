import { Platform } from "obsidian";

export class IMEService {
  private composition = false;

  async load() {
    document.addEventListener("compositionstart", this.onCompositionStart);
    document.addEventListener("compositionend", this.onCompositionEnd);
  }

  async unload() {
    document.removeEventListener("compositionend", this.onCompositionEnd);
    document.removeEventListener("compositionstart", this.onCompositionStart);
  }

  isIMEOpened() {
    return this.composition && Platform.isDesktop;
  }

  private onCompositionStart = () => {
    this.composition = true;
  };

  private onCompositionEnd = () => {
    this.composition = false;
  };
}
