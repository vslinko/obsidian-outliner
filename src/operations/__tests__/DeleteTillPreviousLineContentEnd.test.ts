import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { DeleteTillPreviousLineContentEnd } from "../DeleteTillPreviousLineContentEnd";

test("should merge current line with previous line when cursor is at start of line content", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 2, ch: 6 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- item 2item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(8);
});

test("should merge with previous note line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n  note for item 1\n  more notes\n- item 2\n",
      cursor: { line: 2, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  expect(root.print()).toBe("- item 1\n  note for item 1more notes\n- item 2");
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(17);
});

test("should merge empty bullets with previous bullet", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- \n- item 3\n",
      cursor: { line: 1, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  expect(root.print()).toBe("- item 1\n- item 3");
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(8);
});

test("should merge child bullet with parent if child is empty", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n    - \n- item 3\n",
      cursor: { line: 1, ch: 6 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  expect(root.print()).toBe("- item 1\n- item 3");
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(8);
});

test("should not do anything if there are multiple selections", () => {
  const editor = makeEditor({
    text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
    cursor: { line: 2, ch: 6 },
  });

  // Mock multiple selections
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } },
    { anchor: { line: 2, ch: 6 }, head: { line: 2, ch: 6 } },
  ];

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  // Should not change the text
  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
});

test("should not merge the first item if it's the only one in the document", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1",
      cursor: { line: 0, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  expect(root.print()).toBe("- item 1");
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(2);
});

test("should stop propagation and update editor when merging", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 2, ch: 6 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillPreviousLineContentEnd(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});
