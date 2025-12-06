import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { ExpandSelectionToFullItems } from "../ExpandSelectionToFullItems";

describe("ExpandSelectionToFullItems operation", () => {
  test("should expand selection across two bullets to full items", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 0, ch: 5 },
    });

    // Mock selection from middle of item 1 to middle of item 2
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 5 }, head: { line: 1, ch: 5 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(true);
    expect(op.shouldStopPropagation()).toBe(true);

    const selection = root.getSelection();
    // Should expand to start of item 1 content
    expect(selection.anchor.line).toBe(0);
    expect(selection.anchor.ch).toBe(2);
    // Should expand to end of item 2
    expect(selection.head.line).toBe(1);
    expect(selection.head.ch).toBe(8);
  });

  test("should include children when expanding selection", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 0, ch: 5 },
    });

    // Mock selection from item 1 to item 2 (which has children)
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 5 }, head: { line: 1, ch: 5 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(true);

    const selection = root.getSelection();
    // Should expand to start of item 1 content
    expect(selection.anchor.line).toBe(0);
    expect(selection.anchor.ch).toBe(2);
    // Should expand to end of item 2.2 (last child of item 2)
    expect(selection.head.line).toBe(3);
    expect(selection.head.ch).toBe(14);
  });

  test("should not modify single-line selection", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n",
      cursor: { line: 0, ch: 5 },
    });

    // Mock single-line selection
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 7 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(false);
  });

  test("should not modify already-expanded selection", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n",
      cursor: { line: 0, ch: 2 },
    });

    // Mock selection already covering full items
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 2 }, head: { line: 1, ch: 8 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(false);
  });

  test("should work with checkboxes", () => {
    const editor = makeEditor({
      text: "- [ ] task 1\n- [ ] task 2\n",
      cursor: { line: 0, ch: 8 },
    });

    // Mock selection from middle of task 1 to middle of task 2
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 8 }, head: { line: 1, ch: 8 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(true);

    const selection = root.getSelection();
    // Should expand to start of task 1 content (after checkbox)
    expect(selection.anchor.line).toBe(0);
    expect(selection.anchor.ch).toBe(6);
    // Should expand to end of task 2
    expect(selection.head.line).toBe(1);
    expect(selection.head.ch).toBe(12);
  });

  test("should preserve backward selection direction", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 1, ch: 5 },
    });

    // Mock backward selection (head before anchor)
    editor.listSelections = () => [
      { anchor: { line: 1, ch: 5 }, head: { line: 0, ch: 5 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(true);

    const selection = root.getSelection();
    // Anchor should be at end (backward selection)
    expect(selection.anchor.line).toBe(1);
    expect(selection.anchor.ch).toBe(8);
    // Head should be at start
    expect(selection.head.line).toBe(0);
    expect(selection.head.ch).toBe(2);
  });

  test("should not do anything if there are multiple selections", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n- item 3\n",
      cursor: { line: 0, ch: 5 },
    });

    // Mock multiple selections
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 7 } },
      { anchor: { line: 1, ch: 3 }, head: { line: 1, ch: 7 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(false);
  });

  test("should expand selection across nested items correctly", () => {
    const editor = makeEditor({
      text: "- parent 1\n    - child 1.1\n    - child 1.2\n- parent 2\n",
      cursor: { line: 1, ch: 8 },
    });

    // Mock selection from child 1.1 to parent 2
    editor.listSelections = () => [
      { anchor: { line: 1, ch: 8 }, head: { line: 3, ch: 5 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(true);

    const selection = root.getSelection();
    // Should start at child 1.1 content start
    expect(selection.anchor.line).toBe(1);
    expect(selection.anchor.ch).toBe(6);
    // Should end at parent 2 end
    expect(selection.head.line).toBe(3);
    expect(selection.head.ch).toBe(10);
  });

  test("should handle selection starting from a child item", () => {
    const editor = makeEditor({
      text: "- parent 1\n    - child 1.1\n        - grandchild\n    - child 1.2\n- parent 2\n",
      cursor: { line: 1, ch: 8 },
    });

    // Mock selection from child 1.1 to child 1.2
    editor.listSelections = () => [
      { anchor: { line: 1, ch: 8 }, head: { line: 3, ch: 8 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new ExpandSelectionToFullItems(root);
    op.perform();

    expect(op.shouldUpdate()).toBe(true);

    const selection = root.getSelection();
    // Should start at child 1.1 content start
    expect(selection.anchor.line).toBe(1);
    expect(selection.anchor.ch).toBe(6);
    // Should end at child 1.2 (which has no children)
    expect(selection.head.line).toBe(3);
    expect(selection.head.ch).toBe(14);
  });
});
