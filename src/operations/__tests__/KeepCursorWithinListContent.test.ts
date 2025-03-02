import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { KeepCursorWithinListContent } from "../KeepCursorWithinListContent";

test("should move cursor to the start of content if cursor is before content start", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2",
      cursor: { line: 0, ch: 0 }, // Cursor before the bullet
    }),
    settings: makeSettings(),
  });

  const op = new KeepCursorWithinListContent(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(2); // At the start of content after bullet
});

test("should move cursor to the start of content if cursor is on the bullet", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2",
      cursor: { line: 0, ch: 1 }, // Cursor on the bullet
    }),
    settings: makeSettings(),
  });

  const op = new KeepCursorWithinListContent(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(2); // At the start of content after bullet
});

test("should mock getFirstLineContentStartAfterCheckbox appropriately", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- [ ] task with checkbox\n  - item 1.1\n  - item 1.2\n- item 2",
      cursor: { line: 0, ch: 3 }, // Cursor inside the checkbox
    }),
    settings: makeSettings(),
  });

  // Mock the getFirstLineContentStartAfterCheckbox method
  const listUnderCursor = root.getListUnderCursor();
  const originalMethod = listUnderCursor.getFirstLineContentStartAfterCheckbox;
  listUnderCursor.getFirstLineContentStartAfterCheckbox = jest
    .fn()
    .mockReturnValue({
      line: 0,
      ch: 6,
    });

  const op = new KeepCursorWithinListContent(root);
  op.perform();

  expect(
    listUnderCursor.getFirstLineContentStartAfterCheckbox,
  ).toHaveBeenCalled();
  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(6); // The mocked position after checkbox

  // Restore the original method
  listUnderCursor.getFirstLineContentStartAfterCheckbox = originalMethod;
});

test("should move cursor to the start of indented notes content if cursor is before note indent", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n  note line\n  another note\n- item 2",
      cursor: { line: 1, ch: 0 }, // Cursor before note indent
    }),
    settings: makeSettings(),
  });

  const op = new KeepCursorWithinListContent(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(1);
  expect(root.getCursor().ch).toBe(2); // At the start of note's indentation
});

test("should not do anything if cursor is already within content", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2",
      cursor: { line: 0, ch: 5 }, // Cursor within content
    }),
    settings: makeSettings(),
  });

  const op = new KeepCursorWithinListContent(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(5); // Unchanged
});

test("should not do anything if there are multiple cursors", () => {
  const editor = makeEditor({
    text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2",
    cursor: { line: 0, ch: 0 },
  });

  // Mock multiple cursors
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } },
    { anchor: { line: 1, ch: 0 }, head: { line: 1, ch: 0 } },
  ];

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new KeepCursorWithinListContent(root);
  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});
