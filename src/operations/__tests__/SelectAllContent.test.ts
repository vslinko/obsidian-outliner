import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { SelectAllContent } from "../SelectAllContent";

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
