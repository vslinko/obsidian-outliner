import { insertPlainLine } from "src/utils/insertPlainLine";

import { VimOBehaviourOverride } from "../VimOBehaviourOverride";

jest.mock(
  "obsidian",
  () => ({
    MarkdownView: class MarkdownView {},
    Notice: class Notice {},
    Plugin: class Plugin {},
  }),
  { virtual: true },
);

jest.mock(
  "src/editor",
  () => ({
    MyEditor: class MyEditor {
      public editor: unknown;

      constructor(editor: unknown) {
        this.editor = editor;
      }
    },
  }),
  { virtual: true },
);

jest.mock(
  "src/operations/CreateNewItem",
  () => ({
    CreateNewItem: class CreateNewItem {},
  }),
  { virtual: true },
);

jest.mock(
  "src/services/ObsidianSettings",
  () => ({
    ObsidianSettings: class ObsidianSettings {},
  }),
  { virtual: true },
);

jest.mock(
  "src/services/OperationPerformer",
  () => ({
    OperationPerformer: class OperationPerformer {},
  }),
  { virtual: true },
);

jest.mock(
  "src/services/Parser",
  () => ({
    Parser: class Parser {},
  }),
  { virtual: true },
);

jest.mock(
  "src/services/Settings",
  () => ({
    Settings: class Settings {},
  }),
  { virtual: true },
);

jest.mock(
  "src/utils/insertPlainLine",
  () => ({
    insertPlainLine: jest.fn(),
  }),
  { virtual: true },
);

describe("VimOBehaviourOverride outside lists", () => {
  const insertPlainLineMock = insertPlainLine as jest.MockedFunction<
    typeof insertPlainLine
  >;

  const originalWindow = global.window;

  beforeEach(() => {
    global.window = {
      CodeMirrorAdapter: {
        Vim: {
          defineAction: jest.fn(),
          enterInsertMode: jest.fn(),
          handleEx: jest.fn(),
          mapCommand: jest.fn(),
        },
      },
    } as never;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  test.each([
    ["o", true],
    ["O", false],
  ])(
    "should insert a plain line for Vim %s when the cursor is outside any list",
    async (_key, after) => {
      const plugin = {
        app: {
          workspace: {
            getActiveViewOfType: jest.fn().mockReturnValue({
              editor: {},
            }),
          },
        },
      } as never;
      const settings = {
        onChange: jest.fn(),
        overrideVimOBehaviour: true,
      } as never;
      const parser = {
        parse: jest.fn().mockReturnValue(null),
      };
      const feature = new VimOBehaviourOverride(
        plugin,
        settings,
        {} as never,
        parser as never,
        {} as never,
      );

      await feature.load();

      const vim = global.window.CodeMirrorAdapter.Vim;
      const action = (vim.defineAction as jest.Mock).mock.calls.find(
        ([name]) => name === "insertLineAfterBullet",
      )?.[1];

      expect(action).toBeDefined();

      const cm = {};
      action(cm, { after });

      expect(vim.handleEx).toHaveBeenCalledWith(cm, "normal! A");
      expect(parser.parse).toHaveBeenCalledTimes(1);
      expect(insertPlainLineMock).toHaveBeenCalledTimes(1);
      expect(insertPlainLineMock.mock.calls[0][1]).toBe(after);
      expect(vim.enterInsertMode).toHaveBeenCalledWith(cm);
    },
  );
});
