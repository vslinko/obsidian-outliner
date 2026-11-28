import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { OutdentList } from "../OutdentList";

describe("OutdentList operation", () => {
  test("should outdent a list item to its parent's level", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- parent\n  - child\n    - grandchild\n",
        cursor: { line: 2, ch: 9 },
      }),
      settings: makeSettings(),
    });

    const op = new OutdentList(root);
    op.perform();

    expect(root.print()).toBe("- parent\n  - child\n  - grandchild");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7); // cursor moves back by the indent difference
  });

  test("should outdent a list item with its children", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- parent\n  - child\n    - grandchild\n      - great-grandchild\n",
        cursor: { line: 2, ch: 9 },
      }),
      settings: makeSettings(),
    });

    const op = new OutdentList(root);
    op.perform();

    expect(root.print()).toBe(
      "- parent\n  - child\n  - grandchild\n    - great-grandchild",
    );
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(7);
  });

  test("should not outdent a list item at the root level", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n- item 3\n",
        cursor: { line: 1, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new OutdentList(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n- item 2\n- item 3");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(5);
    expect(op.shouldUpdate()).toBe(false);
  });

  test("should recalculate numeric bullets after outdention", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "1. parent\n   1. child\n   2. second child\n      1. grandchild\n",
        cursor: { line: 3, ch: 11 },
      }),
      settings: makeSettings(),
    });

    const op = new OutdentList(root);
    op.perform();

    // The numeric bullet for the outdented item should be adjusted
    const result = root.print();
    const lines = result.split("\n");
    expect(lines[3].trim()).toMatch(/^3\. grandchild$/);
  });

  test("should do nothing if there are multiple selections", () => {
    const editor = makeEditor({
      text: "- parent\n  - child\n    - grandchild\n",
      cursor: { line: 2, ch: 9 },
    });

    // Mock multiple selections
    editor.listSelections = () => [
      { anchor: { line: 1, ch: 3 }, head: { line: 1, ch: 3 } },
      { anchor: { line: 2, ch: 9 }, head: { line: 2, ch: 9 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new OutdentList(root);
    op.perform();

    expect(root.print()).toBe("- parent\n  - child\n    - grandchild");
    expect(op.shouldStopPropagation()).toBe(false);
    expect(op.shouldUpdate()).toBe(false);
  });

  test("should stop propagation and update editor when successful", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- parent\n  - child\n    - grandchild\n",
        cursor: { line: 2, ch: 9 },
      }),
      settings: makeSettings(),
    });

    const op = new OutdentList(root);
    op.perform();

    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(true);
  });

  test("should stop propagation without changes if the list under the cursor cannot be resolved (#608)", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n",
        cursor: { line: 1, ch: 5 },
      }),
      settings: makeSettings(),
    });

    // The parsed model does not cover the cursor line, as happened in
    // #608 where the last bullet of a note was missing from the model:
    // getListUnderCursor() returns null and the operation must not
    // throw, otherwise the Shift-Tab keypress falls through to the UI.
    root.replaceSelections([
      { anchor: { line: 2, ch: 0 }, head: { line: 2, ch: 0 } },
    ]);

    const op = new OutdentList(root);

    expect(() => op.perform()).not.toThrow();
    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(false);
    expect(root.print()).toBe("- item 1\n- item 2");
  });
});
