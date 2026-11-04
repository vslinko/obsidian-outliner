import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { OutdentListIfItsEmpty } from "../OutdentListIfItsEmpty";

test("should outdent empty list item", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n  - \n    - three",
      cursor: { line: 1, ch: 4 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- one\n- \n  - three");
  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});

test("should outdent empty checkbox", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n  - [ ] \n    - three",
      cursor: { line: 1, ch: 8 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- one\n- [ ] \n  - three");
  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});

test("should not outdent non-empty list item", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n  - two\n    - three",
      cursor: { line: 1, ch: 6 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- one\n  - two\n    - three");
  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});

test("should not outdent item with multiple lines", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n  - \n    note\n    - three",
      cursor: { line: 1, ch: 4 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- one\n  - \n    note\n    - three");
  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});

test("should not outdent if list level is 1", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- \n- two",
      cursor: { line: 0, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- \n- two");
  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});

test("should not outdent if there are multiple selections", () => {
  const editor = makeEditor({
    text: "- one\n  - \n    - three",
    cursor: { line: 1, ch: 4 },
  });

  // Mock multiple selections
  editor.listSelections = () => [
    { anchor: { line: 0, ch: 3 }, head: { line: 0, ch: 3 } },
    { anchor: { line: 1, ch: 4 }, head: { line: 1, ch: 4 } },
  ];

  const root = makeRoot({
    editor,
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- one\n  - \n    - three");
  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});

test("should delete empty list item if it is the last item on the top level", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- Item 1\n- Item 2\n- ",
      cursor: { line: 2, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- Item 1\n- Item 2\n");
  expect(root.getCursor()).toStrictEqual({ line: 2, ch: 0 });
  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});

test("should delete empty checkbox if it is the last item on the top level", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- [ ] one\n- [ ] ",
      cursor: { line: 1, ch: 6 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- [ ] one\n");
  expect(root.getCursor()).toStrictEqual({ line: 1, ch: 0 });
  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});

test("should delete empty list item if it is the only top level item", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- ",
      cursor: { line: 0, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("");
  expect(root.getCursor()).toStrictEqual({ line: 0, ch: 0 });
  expect(op.shouldStopPropagation()).toBe(true);
  expect(op.shouldUpdate()).toBe(true);
});

test("should not delete empty top level list item if it is not the last item", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- \n- two",
      cursor: { line: 0, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- \n- two");
  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});

test("should not delete empty top level list item if it has children", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n- \n  - child",
      cursor: { line: 1, ch: 2 },
    }),
    settings: makeSettings(),
  });

  const op = new OutdentListIfItsEmpty(root);
  op.perform();

  expect(root.print()).toBe("- one\n- \n  - child");
  expect(op.shouldStopPropagation()).toBe(false);
  expect(op.shouldUpdate()).toBe(false);
});
