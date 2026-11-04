import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { KeepCursorWithinListContent } from "../../operations/KeepCursorWithinListContent";
import { SelectAllContent } from "../../operations/SelectAllContent";
import { ChangesApplicator } from "../ChangesApplicator";
import { OperationPerformer } from "../OperationPerformer";
import { Parser } from "../Parser";

function prepare(text: string, line: number, ch: number) {
  const editor = makeEditor({ text, cursor: { line, ch } });
  editor.getRange = jest.fn((from, to) => {
    const lines = text.split("\n");
    const offset = (pos: { line: number; ch: number }) =>
      lines.slice(0, pos.line).reduce((n, line) => n + line.length + 1, 0) +
      pos.ch;
    return text.slice(offset(from), offset(to));
  });
  editor.replaceRange = jest.fn();
  editor.setSelections = jest.fn();
  const settings = makeSettings();
  settings.keepCursorWithinContent = "bullet-and-checkbox";
  const performer = new OperationPerformer(
    new Parser(makeLogger(), settings),
    new ChangesApplicator(),
  );
  return { editor, performer };
}

const text = "- parent\n  - child\n  \n- last\n- tail";

describe("selection-only operations preserve text (#618)", () => {
  test("leaves the separator itself to the editor", () => {
    const { editor, performer } = prepare(text, 2, 2);
    const createOperation = jest.fn((root) => new SelectAllContent(root));

    expect(performer.perform(createOperation, editor)).toEqual({
      shouldUpdate: false,
      shouldStopPropagation: false,
    });
    expect(createOperation).not.toHaveBeenCalled();
    expect(editor.getRange).not.toHaveBeenCalled();
    expect(editor.replaceRange).not.toHaveBeenCalled();
    expect(editor.setSelections).not.toHaveBeenCalled();
  });

  test.each([0, 3, 4])(
    "selects the correct item without replacing text (cursor line %s)",
    (line) => {
      const { editor, performer } = prepare(text, line, 2);
      expect(
        performer.perform((root) => new SelectAllContent(root), editor),
      ).toEqual({ shouldUpdate: true, shouldStopPropagation: true });
      expect(editor.replaceRange).not.toHaveBeenCalled();
      expect(editor.setSelections).toHaveBeenCalledWith([
        { anchor: { line, ch: 2 }, head: { line, ch: line === 0 ? 8 : 6 } },
      ]);
    },
  );

  test.each([0, 3, 4])(
    "normalizes the cursor without replacing text (cursor line %s)",
    (line) => {
      const { editor, performer } = prepare(text, line, 0);
      expect(
        performer.perform(
          (root) => new KeepCursorWithinListContent(root),
          editor,
        ),
      ).toEqual({ shouldUpdate: true, shouldStopPropagation: true });
      expect(editor.replaceRange).not.toHaveBeenCalled();
      expect(editor.setSelections).toHaveBeenCalledWith([
        { anchor: { line, ch: 2 }, head: { line, ch: 2 } },
      ]);
    },
  );

  test("does not intercept a selection spanning both lists", () => {
    const { editor, performer } = prepare(text, 4, 6);
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 0 }, head: { line: 4, ch: 6 } },
    ];
    expect(
      performer.perform((root) => new SelectAllContent(root), editor),
    ).toEqual({ shouldUpdate: false, shouldStopPropagation: false });
    expect(editor.replaceRange).not.toHaveBeenCalled();
    expect(editor.setSelections).not.toHaveBeenCalled();
  });
});
