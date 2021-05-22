import { LoggerService } from "./services/LoggerService";
import { ObsidianService } from "./services/ObsidianService";

export interface EditorMockParams {
  text: string;
  cursor: { line: number; ch: number };
}

export function makeEditor(params: EditorMockParams): CodeMirror.Editor {
  let text = params.text;
  let cursor = { ...params.cursor };

  const editor: any = {
    getCursor: () => cursor,
    listSelections: () => [{ anchor: cursor, head: cursor }],
    getLine: (l: number) => text.split("\n")[l],
    firstLine: () => 0,
    lastLine: () => text.split("\n").length - 1,
    lineCount: () => text.split("\n").length,
    isFolded: (l: number) => false,
  };

  return editor;
}

export function makeObsidianService(
  options: { useTab?: boolean; tabSize?: number } = {}
): ObsidianService {
  const { useTab, tabSize } = {
    useTab: true,
    tabSize: 4,
    ...options,
  };

  const obsidianService: any = {
    getObsidianTabsSettigns: jest.fn().mockReturnValue({ useTab, tabSize }),
  };

  return obsidianService;
}

export function makeLoggerService(): LoggerService {
  const log = jest.fn();

  const logger: any = {
    log,
    bind: jest
      .fn()
      .mockImplementation((method: string) => log.bind(null, method)),
  };

  return logger;
}
