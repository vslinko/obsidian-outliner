import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { RecoverCursorAfterArrowUp } from "../RecoverCursorAfterArrowUp";

test("should move cursor to the previous list item when ArrowUp gets stuck on a checkbox line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- [ ] one\n- [ ] two\n",
      cursor: { line: 1, ch: 1 },
    }),
    settings: makeSettings(),
  });

  const op = new RecoverCursorAfterArrowUp(root, { line: 1, ch: 6 });
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(9);
});

test("should do nothing when ArrowUp already moved to the previous line", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- [ ] one\n- [ ] two\n",
      cursor: { line: 0, ch: 6 },
    }),
    settings: makeSettings(),
  });

  const op = new RecoverCursorAfterArrowUp(root, { line: 1, ch: 6 });
  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(6);
});

test("should move cursor to the previous root item when ArrowUp gets stuck before list content", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n- two\n",
      cursor: { line: 1, ch: 1 },
    }),
    settings: makeSettings(),
  });

  const op = new RecoverCursorAfterArrowUp(root, { line: 1, ch: 5 });
  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(root.getCursor().line).toBe(0);
  expect(root.getCursor().ch).toBe(5);
});
