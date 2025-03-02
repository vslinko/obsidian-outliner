import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { DeleteTillCurrentLineContentStart } from "../DeleteTillCurrentLineContentStart";

test("should delete content from cursor to start of the line content and move cursor to content start", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 1, ch: 5 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillCurrentLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- m 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(2);
});

test("should delete all content when cursor is at the end of line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 1, ch: 8 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillCurrentLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- \n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(2);
});

test("should do nothing if cursor is already at the start of line content", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 1, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillCurrentLineContentStart(root);
  op.perform();

  expect(root.print()).toBe(
    "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3",
  );
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(2);
});

test("should not do anything if there are multiple selections", () => {
  const editor = makeEditor({
    text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
    cursor: { line: 1, ch: 5 },
  });

  // Mock multiple selections
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } },
    { anchor: { line: 1, ch: 5 }, head: { line: 1, ch: 5 } },
  ];

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new DeleteTillCurrentLineContentStart(root);
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
      cursor: { line: 1, ch: 5 },
    }),
    settings: makeSettings(),
  });

  const op = new DeleteTillCurrentLineContentStart(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});
