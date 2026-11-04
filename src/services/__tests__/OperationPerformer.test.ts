import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { KeepCursorWithinListContent } from "../../operations/KeepCursorWithinListContent";
import { SelectAllContent } from "../../operations/SelectAllContent";
import { ChangesApplicator } from "../ChangesApplicator";
import { OperationPerformer } from "../OperationPerformer";
import { Parser } from "../Parser";

function prepare(text: string, line: number, ch: number) {
  const editor = makeEditor({ text, cursor: { line, ch } });
  editor.getRange = jest.fn(() => text);
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

describe("selection-only operations preserve text (#618)", () => {
  test.each([0, 3, 4])(
    "leaves unsupported ranges to the editor (cursor line %s)",
    (line) => {
      const { editor, performer } = prepare(
        "- parent\n  - child\n  \n- last\n- tail",
        line,
        2,
      );
      const createOperation = jest.fn((root) => new SelectAllContent(root));

      expect(performer.perform(createOperation, editor)).toEqual({
        shouldUpdate: false,
        shouldStopPropagation: false,
      });
      expect(createOperation).not.toHaveBeenCalled();
      expect(editor.getRange).not.toHaveBeenCalled();
      expect(editor.replaceRange).not.toHaveBeenCalled();
      expect(editor.setSelections).not.toHaveBeenCalled();
    },
  );

  test.each([0, 3])(
    "cursor normalization does not replace text around a rejected line (cursor line %s)",
    (line) => {
      const { editor, performer } = prepare(
        "- parent\n  - child\n  \n- last",
        line,
        0,
      );

      expect(
        performer.perform(
          (root) => new KeepCursorWithinListContent(root),
          editor,
        ),
      ).toEqual({ shouldUpdate: false, shouldStopPropagation: false });
      expect(editor.replaceRange).not.toHaveBeenCalled();
      expect(editor.setSelections).not.toHaveBeenCalled();
    },
  );

  test.each([0, 3])(
    "selects content without text replacement in a lossless range (cursor line %s)",
    (line) => {
      const { editor, performer } = prepare(
        "- parent\n  - child\n    \n- last",
        line,
        2,
      );

      expect(
        performer.perform((root) => new SelectAllContent(root), editor),
      ).toEqual({ shouldUpdate: true, shouldStopPropagation: true });
      expect(editor.replaceRange).not.toHaveBeenCalled();
      expect(editor.setSelections).toHaveBeenCalledWith([
        { anchor: { line, ch: 2 }, head: { line, ch: line === 0 ? 8 : 6 } },
      ]);
    },
  );
});
