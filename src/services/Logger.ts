import { Settings } from "./Settings";

export class Logger {
  constructor(private settings: Settings) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(method: string, ...args: any[]) {
    if (!this.settings.debug) {
      return;
    }

    console.info(method, ...args);
  }

  bind(method: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => this.log(method, ...args);
  }
}
