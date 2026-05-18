import { Editor, Plugin } from "obsidian";

import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { OperationPerformer } from "../../services/OperationPerformer";
import { TabBehaviourOverride } from "../TabBehaviourOverride";

jest.mock(
  "obsidian",
  () => ({
    Editor: class {
      cm = {};
      execCalls: string[] = [];
      exec(command: string) {
        this.execCalls.push(command);
      }
    },
    Plugin: class {},
    editorInfoField: {},
  }),
  { virtual: true },
);

type MockEditor = Editor & {
  cm: Record<string, never>;
  execCalls: string[];
  getCursor: () => { line: number; ch: number };
  getLine: (line: number) => string;
  lastLine: () => number;
  listSelections: () => Array<{
    anchor: { line: number; ch: number };
    head: { line: number; ch: number };
  }>;
  getAllFoldedLines: () => number[];
};

function makeRawEditor(
  text: string,
  cursor: { line: number; ch: number },
): MockEditor {
  const lines = text.split("\n");
  const editor = Object.create(Editor.prototype) as MockEditor;
  editor.cm = {};
  editor.execCalls = [];

  editor.getCursor = () => cursor;
  editor.getLine = (line: number) => lines[line];
  editor.lastLine = () => lines.length - 1;
  editor.listSelections = () => [{ anchor: cursor, head: cursor }];
  editor.getAllFoldedLines = () => [];

  return editor;
}

describe("TabBehaviourOverride", () => {
  const registerEditorExtension = jest.fn();
  const plugin = {
    registerEditorExtension,
  } as unknown as Plugin;
  const settings = {
    overrideTabBehaviour: true,
  } as ConstructorParameters<typeof TabBehaviourOverride>[3];
  const imeDetector = {
    isOpened: () => false,
  } as ConstructorParameters<typeof TabBehaviourOverride>[1];
  const obsidianSettings = {
    getDefaultIndentChars: () => "  ",
    isSmartIndentListEnabled: () => true,
  } as ConstructorParameters<typeof TabBehaviourOverride>[2];

  beforeEach(() => {
    registerEditorExtension.mockReset();
  });

  test("should handle editor indentMore commands from toolbar actions", async () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- one\n- two",
        cursor: { line: 1, ch: 5 },
      }),
      settings: makeSettings(),
    });
    const parser = {
      parse: jest.fn().mockReturnValue(root),
    } as unknown as ConstructorParameters<typeof TabBehaviourOverride>[4];
    const changesApplicator = {
      apply: jest.fn(),
    };
    const operationPerformer = new OperationPerformer(
      {} as ConstructorParameters<typeof OperationPerformer>[0],
      changesApplicator as unknown as ConstructorParameters<
        typeof OperationPerformer
      >[1],
    );
    const feature = new TabBehaviourOverride(
      plugin,
      imeDetector,
      obsidianSettings,
      settings,
      parser,
      operationPerformer,
    );
    const editor = makeRawEditor("- one\n- two", { line: 1, ch: 5 });

    await feature.load();
    editor.exec("indentMore");

    expect(changesApplicator.apply).toHaveBeenCalled();
    expect(editor.execCalls).toEqual([]);
    await feature.unload();
  });

  test("should handle editor indentLess commands from toolbar actions", async () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- one\n  - two",
        cursor: { line: 1, ch: 7 },
      }),
      settings: makeSettings(),
    });
    const parser = {
      parse: jest.fn().mockReturnValue(root),
    } as unknown as ConstructorParameters<typeof TabBehaviourOverride>[4];
    const changesApplicator = {
      apply: jest.fn(),
    };
    const operationPerformer = new OperationPerformer(
      {} as ConstructorParameters<typeof OperationPerformer>[0],
      changesApplicator as unknown as ConstructorParameters<
        typeof OperationPerformer
      >[1],
    );
    const feature = new TabBehaviourOverride(
      plugin,
      imeDetector,
      obsidianSettings,
      settings,
      parser,
      operationPerformer,
    );
    const editor = makeRawEditor("- one\n  - two", {
      line: 1,
      ch: 7,
    });

    await feature.load();
    editor.exec("indentLess");

    expect(changesApplicator.apply).toHaveBeenCalled();
    expect(editor.execCalls).toEqual([]);
    await feature.unload();
  });
});
