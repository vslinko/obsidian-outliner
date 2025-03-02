import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { MoveListDown } from "../MoveListDown";

describe("MoveListDown operation", () => {
  test("should move a list item down below its next sibling", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 1, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 3\n- item 2");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should move a list with children down below its next sibling", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("- item 2\n- item 1\n  - item 1.1\n  - item 1.2");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should move a list item to the next parent level if it's the last sibling", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  - item 1.1\n  - item 1.2\n- item 2\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n  - item 1.1\n- item 2\n  - item 1.2");
    expect(root.getCursor().line).toBe(3);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should not move a list item if it's the last item in the document", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 2, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should not move a list item if it has no parent and no siblings", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("- item 1");
    expect(root.getCursor().line).toBe(0);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should recalculate numeric bullets after move", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "1. item 1\n2. item 2\n3. item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("1. item 2\n2. item 1\n3. item 3");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(5);
  });

  test("should not do anything if there are multiple selections", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 0, ch: 5 },
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

    const op = new MoveListDown(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
    expect(op.shouldStopPropagation()).toBe(false);
    expect(op.shouldUpdate()).toBe(false);
  });

  test("should stop propagation and update editor when successful", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new MoveListDown(root);
    op.perform();

    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(true);
  });
});
