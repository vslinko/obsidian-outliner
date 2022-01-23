/* eslint-disable @typescript-eslint/no-explicit-any */
import { MyEditor } from "./MyEditor";
import { LoggerService } from "./services/LoggerService";
import { ParserService } from "./services/ParserService";

export interface EditorMockParams {
  text: string;
  cursor: { line: number; ch: number };
  getFirstLineOfFolding?: (n: number) => number | null;
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
    getFirstLineOfFolding: params.getFirstLineOfFolding || ((): null => null),
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

export function makeRoot(options: {
  editor: MyEditor;
  logger?: LoggerService;
}) {
  const { logger, editor } = {
    logger: makeLoggerService(),
    ...options,
  };

  return new ParserService(logger).parse(editor);
}
