import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { DeleteTillNextLineContentStart } from "../DeleteTillNextLineContentStart";

test("should delete content from cursor to start of next line content when cursor is at end of a line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 0, ch: 8 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(8);
});

test("should not do anything if cursor is in the middle of a line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 0, ch: 5 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  // Since cursor is not at end of line, operation does nothing
  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(5);
});

test("should delete content from cursor to start of next sublist item content", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 1, ch: 8 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- item 2item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(8);
});

test("should delete content from cursor to start of next line when next line is at a different indent level", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 3, ch: 14 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2item 3",
  );
  expect(root.getCursor().line).toBe(3);
  expect(root.getCursor().ch).toBe(14);
});

test("should do nothing when cursor is at the end of the last line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
      cursor: { line: 4, ch: 8 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(4);
  expect(root.getCursor().ch).toBe(8);
});

test("should not do anything if the cursor is not at the end of a line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 1, ch: 5 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  // In this case, cursor is not at the end of the line, so the operation does nothing
  // according to the implementation that checks for cursor.ch === l.to.ch
  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(5);
});

test("should not do anything if there are multiple selections", () => {
  const editor = makeEditor({
    text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
    cursor: { line: 0, ch: 8 },
  });

  // Mock multiple selections
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 8 }, head: { line: 0, ch: 8 } },
    { anchor: { line: 1, ch: 8 }, head: { line: 1, ch: 8 } },
  ];

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  // Should not change the text
  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
});

test("should stop propagation and update editor", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 0, ch: 8 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillNextLineContentStart(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});
