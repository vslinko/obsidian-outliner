/* eslint-disable @typescript-eslint/no-explicit-any */
import { Settings } from "./Settings";

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
