import { SettingsService } from "./SettingsService";

export class LoggerService {
  constructor(private settingsService: SettingsService) {}

  log(method: string, ...args: any[]) {
    if (!this.settingsService.debug) {
      return;
    }

    console.info(method, ...args);
  }

  bind(method: string) {
    return (...args: any[]) => this.log(method, ...args);
  }
}
