/* eslint-disable @typescript-eslint/no-explicit-any */
import { MyEditor } from "./MyEditor";
import { LoggerService } from "./services/LoggerService";
import { ParserService } from "./services/ParserService";
import { SettingsService } from "./services/SettingsService";

export interface EditorMockParams {
  text: string;
  cursor: { line: number; ch: number };
  getAllFoldedLines?: () => number[];
}

export function makeEditor(params: EditorMockParams): MyEditor {
  const text = params.text;
  const cursor = { ...params.cursor };

  const editor: any = {
    getCursor: () => cursor,
    listSelections: () => [{ anchor: cursor, head: cursor }],
    getLine: (l: number) => text.split("\n")[l],
    lastLine: () => text.split("\n").length - 1,
    lineCount: () => text.split("\n").length,
    getAllFoldedLines: params.getAllFoldedLines || (() => []),
  };

  return editor;
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

export function makeSettingsService(): SettingsService {
  const settings: any = {
    stickCursor: "bullet-and-checkbox",
  };
  return settings;
}

export function makeRoot(options: {
  editor: MyEditor;
  settings?: SettingsService;
  logger?: LoggerService;
}) {
  const { logger, editor, settings } = {
    logger: makeLoggerService(),
    settings: makeSettingsService(),
    ...options,
  };

  return new ParserService(logger, settings).parse(editor);
}
