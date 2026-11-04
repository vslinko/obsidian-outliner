/* eslint-disable @typescript-eslint/no-explicit-any */
import { Notice } from "obsidian";

import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { Parser } from "../../services/Parser";
import { DragAndDrop } from "../DragAndDrop";

jest.mock("obsidian", () => ({ Notice: jest.fn() }), { virtual: true });

const originalText = "- one\n  - two\n- three";
const changedNotice =
  "The item cannot be moved. The page content changed during the move.";

function prepareDrop() {
  const parser = new Parser(makeLogger(), makeSettings());
  const editor = makeEditor({ text: originalText, cursor: { line: 0, ch: 0 } });
  const root = parser.parse(editor);
  const performer = { eval: jest.fn() };
  const feature = new DragAndDrop(
    {} as any,
    {} as any,
    { getDefaultIndentChars: () => "  " } as any,
    parser,
    performer as any,
  ) as any;
  const classes = new Set(["outliner-plugin-dragging"]);
  const context = {
    document: {
      body: { classList: { remove: (name: string) => classes.delete(name) } },
    },
    dropZone: { style: { display: "block" } },
  };
  const view = {
    dispatch: jest.fn(() => {
      // Ownership and visible DOM must already be released before dispatch.
      expect(feature.state).toBeNull();
      expect(feature.preStart).toBeNull();
      expect(classes.size).toBe(0);
      expect(context.dropZone.style.display).toBe("none");
    }),
  };
  const state = {
    editor,
    root,
    list: root.getListUnderLine(2),
    dropVariant: {
      placeToMove: root.getListUnderLine(0),
      whereToMove: "before",
    },
    context,
    view,
  };
  feature.state = state;
  feature.preStart = {};
  return { feature, state, parser, performer, view, classes, context };
}

beforeEach(() => jest.clearAllMocks());

test.each([
  ["deleted list", "plain text", true],
  ["mixed indentation", "- one\n  - two\n\t- three", true],
  ["changed valid list", "- one changed\n  - two\n- three", false],
])("drop safely cancels after %s (#625)", (_name, text, isNull) => {
  const drag = prepareDrop();
  drag.state.editor = makeEditor({ text, cursor: { line: 0, ch: 0 } });
  const reparsed = drag.parser.parse(
    drag.state.editor,
    drag.state.root.getContentStart(),
  );
  expect(reparsed === null).toBe(isNull);

  expect(() => drag.feature.stopDragging()).not.toThrow();
  expect(drag.view.dispatch).toHaveBeenCalledTimes(1);
  expect(drag.feature.state).toBeNull();
  expect(drag.feature.preStart).toBeNull();
  expect(drag.classes.size).toBe(0);
  expect(drag.context.dropZone.style.display).toBe("none");
  expect(drag.performer.eval).not.toHaveBeenCalled();
  expect(Notice).toHaveBeenCalledTimes(1);
  expect(Notice).toHaveBeenCalledWith(changedNotice, 5000);
});

test("unchanged root still reaches the move operation", () => {
  const drag = prepareDrop();
  expect(() => drag.feature.stopDragging()).not.toThrow();
  expect(drag.performer.eval).toHaveBeenCalledTimes(1);
  expect(Notice).not.toHaveBeenCalled();
});

test("release without a drop target does not parse or notify", () => {
  const drag = prepareDrop();
  drag.state.dropVariant = null;
  const parse = jest.spyOn(drag.parser, "parse");
  drag.feature.stopDragging();
  expect(parse).not.toHaveBeenCalled();
  expect(drag.performer.eval).not.toHaveBeenCalled();
  expect(Notice).not.toHaveBeenCalled();
});
