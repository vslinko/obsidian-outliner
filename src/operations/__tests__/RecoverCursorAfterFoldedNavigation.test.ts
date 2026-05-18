import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { RecoverCursorAfterFoldedNavigation } from "../RecoverCursorAfterFoldedNavigation";

test("should move cursor to the next visible sibling after moving down from a folded list", () => {
  const editor = makeEditor({
    text: "- parent\n  - hidden child\n- next",
    cursor: { line: 1, ch: 4 },
  });

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new RecoverCursorAfterFoldedNavigation(
    root,
    { line: 0, ch: 2 },
    [0],
    "ArrowDown",
  );

  op.perform();

  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
  expect(op.getRefoldLine()).toBe(0);
  expect(root.getCursor()).toEqual({ line: 2, ch: 2 });
});

test("should not move cursor when the previous line was not folded", () => {
  const editor = makeEditor({
    text: "- parent\n  - child\n- next",
    cursor: { line: 1, ch: 4 },
  });

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new RecoverCursorAfterFoldedNavigation(
    root,
    { line: 0, ch: 2 },
    [],
    "ArrowDown",
  );

  op.perform();

  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
  expect(op.getRefoldLine()).toBeNull();
  expect(root.getCursor()).toEqual({ line: 1, ch: 4 });
});
