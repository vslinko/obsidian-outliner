import { SettingsService } from "./SettingsService";

export class LoggerService {
  constructor(private settings: SettingsService) {}

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
