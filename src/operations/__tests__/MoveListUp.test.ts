import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { MoveListUp } from "../MoveListUp";

describe("MoveListUp operation", () => {
  test("should move a list item up before its sibling", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 3\n- item 2");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should move a list item up to previous parent's level if it's the first child", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n  - item 2.1\n  - item 2.2\n- item 3\n",
        cursor: { line: 3, ch: 7 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(root.print()).toBe(
      "- item 1\n- item 2\n  - item 2.2\n  - item 2.1\n- item 3",
    );
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7);
  });

  test("should not move a list item up if it's the first item in the list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
    expect(root.getCursor().line).toBe(0);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should move a list item up to the previous parent item if it's the first child", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n- item 2\n  - item 2.1\n",
        cursor: { line: 3, ch: 7 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n  - item 1.1\n  - item 2.1\n- item 2");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7);
  });

  test("should recalculate numeric bullets after moving", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "1. item 1\n2. item 2\n3. item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(root.print()).toBe("1. item 1\n2. item 3\n3. item 2");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should not do anything if there are multiple selections", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 2, ch: 5 },
    });

    // Mock multiple selections
    editor.listSelections = () => [
      { anchor: { line: 1, ch: 3 }, head: { line: 1, ch: 3 } },
      { anchor: { line: 2, ch: 5 }, head: { line: 2, ch: 5 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
  });

  test("should stop propagation and update editor when successful", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(true);
  });

  test("should stop propagation but not update editor when operation fails", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListUp(root);
    op.perform();

    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(false);
  });
});
