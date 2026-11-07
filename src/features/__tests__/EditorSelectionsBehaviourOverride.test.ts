import type { Plugin } from "obsidian";

import { EditorSelection, EditorState, Extension } from "@codemirror/state";

import { makeEditor, makeLogger } from "../../__mocks__";
import { MyEditor, getEditorFromState } from "../../editor";
import { ExpandSelectionToFullItems } from "../../operations/ExpandSelectionToFullItems";
import { KeepCursorOutsideFoldedLines } from "../../operations/KeepCursorOutsideFoldedLines";
import { KeepCursorWithinListContent } from "../../operations/KeepCursorWithinListContent";
import { Operation } from "../../operations/Operation";
import { Range, Root } from "../../root";
import { OperationPerformer } from "../../services/OperationPerformer";
import { Parser } from "../../services/Parser";
import { Settings } from "../../services/Settings";
import { EditorSelectionsBehaviourOverride } from "../EditorSelectionsBehaviourOverride";

jest.mock("../../editor", () => ({ getEditorFromState: jest.fn() }));

type SavedSettings = ReturnType<Settings["getValues"]>;

async function prepare(
  saved: Partial<SavedSettings>,
  range: Range = {
    anchor: { line: 0, ch: 4 },
    head: { line: 0, ch: 4 },
  },
  text = "- first\n- second\n- third",
) {
  const settings = new Settings({
    loadData: async () => saved as SavedSettings,
    saveData: jest.fn(),
  });
  await settings.load();
  const editor = makeEditor({ text, cursor: range.head });
  editor.listSelections = () => [range];
  jest.mocked(getEditorFromState).mockReturnValue(editor);
  const parser = new Parser(makeLogger(), settings);
  const parse = jest.spyOn(parser, "parse");
  const evaluate = jest.fn((root: Root, op: Operation, target: MyEditor) => {
    expect(target).toBe(editor);
    op.perform();
    return {
      shouldUpdate: op.shouldUpdate(),
      shouldStopPropagation: op.shouldStopPropagation(),
    };
  });
  const plugin = { registerEditorExtension: jest.fn() };
  const feature = new EditorSelectionsBehaviourOverride(
    plugin as unknown as Plugin,
    settings,
    parser,
    { eval: evaluate } as unknown as OperationPerformer,
  );
  await feature.load();
  expect(plugin.registerEditorExtension).toHaveBeenCalledTimes(1);
  const state = EditorState.create({
    doc: text,
    extensions: [plugin.registerEditorExtension.mock.calls[0][0] as Extension],
  });

  function changeSelection() {
    const toOffset = (pos: { line: number; ch: number }) =>
      state.doc.line(pos.line + 1).from + pos.ch;
    const transaction = state.update({
      selection: EditorSelection.single(
        toOffset(range.anchor),
        toOffset(range.head),
      ),
    });
    expect(transaction.selection).toBeDefined();
    return transaction;
  }

  return { state, settings, editor, parse, evaluate, changeSelection };
}

function operationTypes(
  evaluate: Awaited<ReturnType<typeof prepare>>["evaluate"],
) {
  return evaluate.mock.calls.map(([, op]) => op.constructor);
}

describe("EditorSelectionsBehaviourOverride", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.each([
    { expandSelection: false, stickCursor: "never" as const },
    { expandSelection: true, stickCursor: "never" as const },
    { expandSelection: false, stickCursor: "bullet-only" as const },
    { expandSelection: true, stickCursor: "bullet-only" as const },
    { expandSelection: false, stickCursor: "bullet-and-checkbox" as const },
    { expandSelection: true, stickCursor: "bullet-and-checkbox" as const },
  ])(
    "toggle=$expandSelection, cursor=$stickCursor schedules only enabled operations",
    async (saved) => {
      const fixture = await prepare(saved);
      fixture.changeSelection();
      const active = saved.expandSelection || saved.stickCursor !== "never";

      expect(jest.getTimerCount()).toBe(active ? 1 : 0);
      expect(fixture.parse).not.toHaveBeenCalled();
      expect(fixture.evaluate).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();

      expect(fixture.parse).toHaveBeenCalledTimes(active ? 1 : 0);
      const expected = [];
      if (saved.expandSelection) expected.push(ExpandSelectionToFullItems);
      if (saved.stickCursor !== "never") {
        expected.push(
          KeepCursorOutsideFoldedLines,
          KeepCursorWithinListContent,
        );
      }
      expect(operationTypes(fixture.evaluate)).toEqual(expected);
      for (const [root, op] of fixture.evaluate.mock.calls) {
        expect(root).toBe(fixture.parse.mock.results[0].value);
        expect(op.shouldUpdate()).toBe(false);
      }
      if (active) expect(fixture.parse).toHaveBeenCalledWith(fixture.editor);
    },
  );

  test.each([false, true])(
    "legacy stickCursor=false still permits toggle=%s",
    async (expandSelection) => {
      const fixture = await prepare({ expandSelection, stickCursor: false });
      expect(fixture.settings.keepCursorWithinContent).toBe("never");
      fixture.changeSelection();
      jest.runOnlyPendingTimers();
      expect(operationTypes(fixture.evaluate)).toEqual(
        expandSelection ? [ExpandSelectionToFullItems] : [],
      );
    },
  );

  test.each([false, true])(
    "transactions without explicit selection do not schedule (toggle=%s)",
    async (expandSelection) => {
      const fixture = await prepare({
        expandSelection,
        stickCursor: "bullet-and-checkbox",
      });
      const transaction = fixture.state.update({});
      expect(transaction.selection).toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
      jest.runOnlyPendingTimers();
      expect(getEditorFromState).not.toHaveBeenCalled();
      expect(fixture.parse).not.toHaveBeenCalled();
      expect(fixture.evaluate).not.toHaveBeenCalled();
    },
  );

  test.each(["never", "bullet-only", "bullet-and-checkbox"] as const)(
    "enabled expansion changes a cross-item selection with cursor=%s",
    async (stickCursor) => {
      const fixture = await prepare(
        { expandSelection: true, stickCursor },
        { anchor: { line: 0, ch: 4 }, head: { line: 1, ch: 5 } },
      );
      fixture.changeSelection();
      jest.runOnlyPendingTimers();
      expect(operationTypes(fixture.evaluate)).toEqual([
        ExpandSelectionToFullItems,
      ]);
      const root = fixture.parse.mock.results[0].value as Root;
      expect(root.getSelections()).toEqual([
        { anchor: { line: 0, ch: 2 }, head: { line: 1, ch: 8 } },
      ]);
      expect(fixture.evaluate.mock.results[0].value).toEqual({
        shouldUpdate: true,
        shouldStopPropagation: true,
      });
    },
  );

  test("disabled toggle does not expand a selection while cursor protection is on", async () => {
    const range = { anchor: { line: 0, ch: 4 }, head: { line: 1, ch: 5 } };
    const fixture = await prepare(
      { expandSelection: false, stickCursor: "bullet-and-checkbox" },
      range,
    );
    fixture.changeSelection();
    jest.runOnlyPendingTimers();
    expect(operationTypes(fixture.evaluate)).toEqual([
      KeepCursorOutsideFoldedLines,
      KeepCursorWithinListContent,
    ]);
    expect(fixture.parse.mock.results[0].value.getSelections()).toEqual([
      range,
    ]);
  });

  test.each([
    { mode: "never" as const, ch: 0 },
    { mode: "bullet-only" as const, ch: 2 },
    { mode: "bullet-and-checkbox" as const, ch: 6 },
  ])(
    "cursor handling remains independent when expansion is enabled: $mode",
    async ({ mode, ch }) => {
      const fixture = await prepare(
        { expandSelection: true, stickCursor: mode },
        { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } },
        "- [ ] first\n- second",
      );
      fixture.changeSelection();
      jest.runOnlyPendingTimers();
      expect(fixture.parse.mock.results[0].value.getCursor()).toEqual({
        line: 0,
        ch,
      });
      expect(operationTypes(fixture.evaluate)).toEqual(
        mode === "never"
          ? [ExpandSelectionToFullItems]
          : [
              ExpandSelectionToFullItems,
              KeepCursorOutsideFoldedLines,
              KeepCursorWithinListContent,
            ],
      );
    },
  );

  test("folded cursor protection stops before content protection", async () => {
    const fixture = await prepare({
      expandSelection: false,
      stickCursor: "bullet-and-checkbox",
    });
    fixture.evaluate.mockReturnValueOnce({
      shouldUpdate: true,
      shouldStopPropagation: true,
    });
    fixture.changeSelection();
    jest.runOnlyPendingTimers();
    expect(operationTypes(fixture.evaluate)).toEqual([
      KeepCursorOutsideFoldedLines,
    ]);
  });

  test("non-list text parses to null and performs no operations", async () => {
    const fixture = await prepare(
      { expandSelection: true, stickCursor: "never" },
      undefined,
      "plain text",
    );
    fixture.changeSelection();
    jest.runOnlyPendingTimers();
    expect(fixture.parse).toHaveBeenCalledTimes(1);
    expect(fixture.parse.mock.results[0].value).toBeNull();
    expect(fixture.evaluate).not.toHaveBeenCalled();
  });
});
