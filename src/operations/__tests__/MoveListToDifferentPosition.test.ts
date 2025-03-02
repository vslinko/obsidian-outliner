import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { MoveListToDifferentPosition } from "../MoveListToDifferentPosition";

describe("MoveListToDifferentPosition operation", () => {
  test("should move list before another list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(2); // item 3
    const placeToMove = root.getListUnderLine(0); // item 1

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "before",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe("- item 3\n- item 1\n- item 2");
    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(true);
  });

  test("should move list after another list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(0); // item 1
    const placeToMove = root.getListUnderLine(1); // item 2

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "after",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe("- item 2\n- item 1\n- item 3");
  });

  test("should move list inside another list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(2); // item 3
    const placeToMove = root.getListUnderLine(0); // item 1

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "inside",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe("- item 1\n  - item 3\n- item 2");
  });

  test("should adjust indentation correctly when moving a list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n- item 2\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(2); // item 2
    const placeToMove = root.getListUnderLine(1); // item 1.1

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "inside",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe("- item 1\n  - item 1.1\n    - item 2");
  });

  test("should move list with all its children", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n  - item 2.1\n  - item 2.2\n- item 3\n",
        cursor: { line: 1, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(1); // item 2 with children
    const placeToMove = root.getListUnderLine(4); // item 3

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "after",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe(
      "- item 1\n- item 3\n- item 2\n  - item 2.1\n  - item 2.2",
    );
  });

  test("should do nothing if attempting to move a list to itself", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 1, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(1); // item 2
    const placeToMove = listToMove; // same list

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "after",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
    expect(op.shouldStopPropagation()).toBe(false);
    expect(op.shouldUpdate()).toBe(false);
  });

  test("should recalculate numeric bullets after moving a list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "1. item 1\n2. item 2\n3. item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(0); // item 1
    const placeToMove = root.getListUnderLine(2); // item 3

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "after",
      "  ",
    );
    op.perform();

    expect(root.print()).toBe("1. item 2\n2. item 3\n3. item 1");
  });

  test("should keep cursor with moved list if cursor was inside the moved list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 }, // cursor inside item 3
      }),
      settings: makeSettings(),
    });

    const listToMove = root.getListUnderLine(2); // item 3
    const placeToMove = root.getListUnderLine(0); // item 1

    const op = new MoveListToDifferentPosition(
      root,
      listToMove,
      placeToMove,
      "before",
      "  ",
    );
    op.perform();

    expect(root.getCursor().line).toBe(0); // cursor now at first line (moved with item 3)
    expect(root.getCursor().ch).toBe(5); // ch position maintained
  });
});
