import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { MoveCursorToPreviousUnfoldedLine } from "../MoveCursorToPreviousUnfoldedLine";

test("should move cursor to end of previous note line in the same list", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n  note for item 1\n  more notes\n- item 2\n",
      cursor: { line: 2, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new MoveCursorToPreviousUnfoldedLine(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(17);
});

test("should move cursor to end of previous list item", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 1, ch: 2 },
    }),
    settings: makeSettings(),
  });

  // Make sure cursor is at content start + checkbox length
  root.getListUnderCursor().getCheckboxLength = () => 0;

  const op = new MoveCursorToPreviousUnfoldedLine(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(8);
});

test("should move cursor to end of first line in previous folded list", () => {
  const editor = makeEditor({
    text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2\n",
    cursor: { line: 3, ch: 2 },
    getAllFoldedLines: () => [0],
  });

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  // Setup previous list as folded
  const prevList = root.getListUnderLine(0);
  prevList.isFolded = () => true;

  const foldRoot = prevList;
  foldRoot.getLinesInfo = () => [{ to: { line: 0, ch: 8 } }];

  prevList.getTopFoldRoot = () => foldRoot;

  // Setup current list for correct cursor check
  root.getListUnderCursor().getCheckboxLength = () => 0;

  const op = new MoveCursorToPreviousUnfoldedLine(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(8);
});

test("should do nothing when cursor is not at the beginning of content", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 1, ch: 5 },
    }),
    settings: makeSettings(),
  });

  const op = new MoveCursorToPreviousUnfoldedLine(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(5);
});

test("should do nothing when there is no previous line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 0, ch: 2 },
    }),
    settings: makeSettings(),
  });

  root.getListUnderCursor().getCheckboxLength = () => 0;

  const op = new MoveCursorToPreviousUnfoldedLine(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(2);
});

test("should do nothing when there are multiple selections", () => {
  const editor = makeEditor({
    text: "- item 1\n- item 2\n- item 3\n",
    cursor: { line: 1, ch: 2 },
  });

  // Mock multiple selections
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } },
    { anchor: { line: 1, ch: 2 }, head: { line: 1, ch: 2 } },
  ];

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  root.getListUnderCursor().getCheckboxLength = () => 0;

  const op = new MoveCursorToPreviousUnfoldedLine(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});
