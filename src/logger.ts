import { Settings } from "./settings";

export class Logger {
  constructor(private settings: Settings) {}

  log(method: string, ...args: any[]) {
    if (!this.settings.debug) {
      return;
    }

    console.info(method, ...args);
  }

  bind(method: string) {
    return (...args: any[]) => this.log(method, ...args);
  }
}
