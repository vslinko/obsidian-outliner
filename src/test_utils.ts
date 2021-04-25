import { Logger } from "./logger";
import { ObsidianUtils } from "./obsidian_utils";

export interface EditorMockParams {
  text: string;
  cursor: { line: number; ch: number };
}

export function makeEditor(params: EditorMockParams): CodeMirror.Editor {
  let text = params.text;
  let cursor = { ...params.cursor };

  const editor: any = {
    getCursor: () => cursor,
    getLine: (l: number) => text.split("\n")[l],
    firstLine: () => 0,
    lastLine: () => text.split("\n").length - 1,
    lineCount: () => text.split("\n").length,
    isFolded: (l: number) => false,
  };

  return editor;
}

export function makeObsidianUtils(
  options: { useTab?: boolean; tabSize?: number } = {}
): ObsidianUtils {
  const { useTab, tabSize } = {
    useTab: true,
    tabSize: 4,
    ...options,
  };

  const obsidianUtils: any = {
    getObsidianTabsSettigns: jest.fn().mockReturnValue({ useTab, tabSize }),
  };

  return obsidianUtils;
}

export function makeLogger(): Logger {
  const log = jest.fn();

  const logger: any = {
    log,
    bind: jest
      .fn()
      .mockImplementation((method: string) => log.bind(null, method)),
  };

  return logger;
}
