import { VimOBehaviourOverride } from "../VimOBehaviourOverride";

/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock(
  "obsidian",
  () => ({
    MarkdownView: class MarkdownView {},
    Notice: jest.fn(),
  }),
  { virtual: true },
);

function makePlainTextEditor(
  text: string,
  cursor: { line: number; ch: number },
) {
  let lines = text.split("\n");
  let currentCursor = { ...cursor };

  const posToOffset = (pos: { line: number; ch: number }) => {
    let offset = 0;
    for (let line = 0; line < pos.line; line++) {
      offset += lines[line].length + 1;
    }
    return offset + pos.ch;
  };

  const offsetToPos = (offset: number) => {
    let remaining = offset;
    for (let line = 0; line < lines.length; line++) {
      if (remaining <= lines[line].length) {
        return { line, ch: remaining };
      }
      remaining -= lines[line].length + 1;
    }
    return { line: lines.length - 1, ch: lines[lines.length - 1].length };
  };

  return {
    getCursor: () => ({ ...currentCursor }),
    getLine: (line: number) => lines[line],
    lastLine: () => lines.length - 1,
    lineCount: () => lines.length,
    listSelections: () => [
      { anchor: { ...currentCursor }, head: { ...currentCursor } },
    ],
    getAllFoldedLines: (): number[] => [],
    getValue: () => lines.join("\n"),
    replaceRange: (
      replacement: string,
      from: { line: number; ch: number },
      to = from,
    ) => {
      const value = lines.join("\n");
      const fromOffset = posToOffset(from);
      const toOffset = posToOffset(to);
      lines = (
        value.slice(0, fromOffset) +
        replacement +
        value.slice(toOffset)
      ).split("\n");
      currentCursor = offsetToPos(fromOffset + replacement.length);
    },
    setCursor: (pos: { line: number; ch: number } | number, ch?: number) => {
      currentCursor =
        typeof pos === "number" ? { line: pos, ch: ch || 0 } : { ...pos };
    },
  };
}

describe("VimOBehaviourOverride", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  test.each([
    {
      key: "o",
      command: "normal! o",
      expectedText: "plain text\n",
      expectedCursor: { line: 1, ch: 0 },
    },
    {
      key: "O",
      command: "normal! O",
      expectedText: "\nplain text",
      expectedCursor: { line: 0, ch: 0 },
    },
  ])(
    "$key opens a plain line on non-list text without recursing through Vim",
    async ({ key, command, expectedText, expectedCursor }) => {
      const cm = {};
      const actions: Record<
        string,
        (cm: object, args: { after: boolean }) => void
      > = {};
      const vim = {
        defineAction: jest.fn((name: string, fn: any) => {
          actions[name] = fn;
        }),
        handleEx: jest.fn(),
        enterInsertMode: jest.fn(),
        mapCommand: jest.fn(),
      };
      (globalThis as any).window = {
        CodeMirrorAdapter: { Vim: vim },
      };

      const editor = makePlainTextEditor("plain text", { line: 0, ch: 5 });
      const plugin = {
        app: {
          workspace: {
            getActiveViewOfType: jest.fn(() => ({ editor })),
          },
        },
      };
      const settings = {
        overrideVimOBehaviour: true,
        onChange: jest.fn(),
      };
      const obsidianSettings = { getDefaultIndentChars: jest.fn() };
      const parser = { parse: jest.fn((): null => null) };
      const operationPerformer = { eval: jest.fn() };

      const feature = new VimOBehaviourOverride(
        plugin as any,
        settings as any,
        obsidianSettings as any,
        parser as any,
        operationPerformer as any,
      );

      await feature.load();

      const mapCommandCall = vim.mapCommand.mock.calls.find(
        ([mappedKey]) => mappedKey === key,
      );
      expect(mapCommandCall).toBeTruthy();

      const [, , actionName, , extra] = mapCommandCall as any;
      actions[actionName](cm, extra.actionArgs);

      expect(vim.handleEx).not.toHaveBeenCalledWith(expect.anything(), command);
      expect(vim.enterInsertMode).toHaveBeenCalledWith(cm);
      expect(editor.getValue()).toBe(expectedText);
      expect(editor.getCursor()).toEqual(expectedCursor);
    },
  );
});
