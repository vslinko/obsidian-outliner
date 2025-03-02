import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { SelectAllContent } from "../SelectAllContent";

describe("SelectAllContent operation", () => {
  test("when performed the first time, should select the whole line under cursor; when performed the second time, should select all sub-bullets of the cursor line if it is a parent-bullet", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
        cursor: { line: 1, ch: 2 },
      }),
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);

    op.perform();
    expect(root.getSelection().anchor.line).toBe(1);
    expect(root.getSelection().anchor.ch).toBe(2);
    expect(root.getSelection().head.line).toBe(1);
    expect(root.getSelection().head.ch).toBe(8);

    op.perform();
    expect(root.getSelection().anchor.line).toBe(1);
    expect(root.getSelection().anchor.ch).toBe(2);
    expect(root.getSelection().head.ch).toBe(14);
    expect(root.getSelection().head.line).toBe(3);

    op.perform();
    expect(root.getSelection().anchor.line).toBe(0);
    expect(root.getSelection().anchor.ch).toBe(0);
    expect(root.getSelection().head.line).toBe(4);
    expect(root.getSelection().head.ch).toBe(8);
  });

  test("when a whole line is selected and the selected line has no sub-bullets, should select the whole list", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
        cursor: { line: 4, ch: 2 },
      }),
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);

    op.perform();
    expect(root.getSelection().anchor.line).toBe(4);
    expect(root.getSelection().anchor.ch).toBe(2);
    expect(root.getSelection().head.line).toBe(4);
    expect(root.getSelection().head.ch).toBe(8);

    op.perform();
    expect(root.getSelection().anchor.line).toBe(0);
    expect(root.getSelection().anchor.ch).toBe(0);
    expect(root.getSelection().head.line).toBe(4);
    expect(root.getSelection().head.ch).toBe(8);
  });

  test("should not do anything if there are multiple selections", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3\n",
      cursor: { line: 1, ch: 2 },
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

    const op = new SelectAllContent(root);
    op.perform();

    // Should not update
    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(false);
  });

  test("should select list item content with a checkbox", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- [ ] task 1\n- [ ] task 2 with longer text\n",
        cursor: { line: 1, ch: 10 },
      }),
      settings: makeSettings(),
    });

    root.getListUnderCursor().getCheckboxLength = () => 4;

    const op = new SelectAllContent(root);
    op.perform();

    // Should select just the content after checkbox
    expect(root.getSelection().anchor.line).toBe(1);
    expect(root.getSelection().anchor.ch).toBe(6);
    expect(root.getSelection().head.line).toBe(1);
    expect(root.getSelection().head.ch).toBe(29);
  });

  test("should select note lines along with list item", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  note for item 1\n  another note\n- item 2\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);
    op.perform();

    // Should select list item and its notes
    expect(root.getSelection().anchor.line).toBe(0);
    expect(root.getSelection().anchor.ch).toBe(2);
    expect(root.getSelection().head.line).toBe(2);
    expect(root.getSelection().head.ch).toBe(14);
  });

  test("should not do anything if selection already spans whole document", () => {
    const editor = makeEditor({
      text: "- item 1\n- item 2\n",
      cursor: { line: 0, ch: 0 },
    });

    // Mock selection already spanning the entire document
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 0 }, head: { line: 1, ch: 8 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);
    const result = op.perform();

    // Should return false, indicating no action taken
    expect(result).toBe(false);
    expect(op.shouldUpdate()).toBe(false);
  });

  test("should properly handle empty list items", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- \n- item 2\n",
        cursor: { line: 0, ch: 2 },
      }),
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);
    op.perform();

    // Should select the empty content
    expect(root.getSelection().anchor.line).toBe(0);
    expect(root.getSelection().anchor.ch).toBe(0);
    expect(root.getSelection().head.line).toBe(1);
    expect(root.getSelection().head.ch).toBe(8);
  });

  test("should select content between the correct range when there is a partial selection", () => {
    const editor = makeEditor({
      text: "- long item text 1\n- long item text 2\n",
      cursor: { line: 0, ch: 5 },
    });

    // Mock a partial selection
    editor.listSelections = () => [
      { anchor: { line: 0, ch: 5 }, head: { line: 0, ch: 9 } },
    ];

    const root = makeRoot({
      editor,
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);
    op.perform();

    // Should extend to select the whole content
    expect(root.getSelection().anchor.line).toBe(0);
    expect(root.getSelection().anchor.ch).toBe(2);
    expect(root.getSelection().head.line).toBe(0);
    expect(root.getSelection().head.ch).toBe(18);
  });

  test("should stop propagation and update when successful", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new SelectAllContent(root);
    op.perform();

    expect(op.shouldStopPropagation()).toBe(true);
    expect(op.shouldUpdate()).toBe(true);
  });
});
