/* eslint-disable @typescript-eslint/no-explicit-any */
import { MyEditor } from "../../MyEditor";
import { makeEditor, makeRoot } from "../../__mocks__";
import { List, Root } from "../../root";
import { ChangesApplicator } from "../ChangesApplicator";

describe("changesApplicator", () => {
  test("should not touch folded lists if they are not changed", () => {
    const { actions, editor, prevRoot, newRoot } = makeArgs({
      editor: makeEditor({
        text: `
- 1
  - 2
    - 3
  - [ ] 4
- 5
`,
        cursor: { line: 4, ch: 9 },
        getAllFoldedLines: () => [2],
      }),

      changes: (root) => {
        root
          .getChildren()[0]
          .addAfterAll(new List(root, "  ", "-", "[ ]", " ", "[ ] ", false));
        root.replaceCursor({ line: 5, ch: 8 });
      },
    });
    const changesApplicator = new ChangesApplicator();

    changesApplicator.apply(editor, prevRoot, newRoot);

    expect(actions).toStrictEqual([
      ["getRange", ...newRoot.getRange()],
      [
        "replaceRange",
        "  - [ ] 4\n  - [ ] ",
        { line: 4, ch: 0 },
        { line: 4, ch: 9 },
      ],
      [
        "setSelections",
        [{ anchor: { line: 5, ch: 8 }, head: { line: 5, ch: 8 } }],
      ],
    ]);
  });

  test("should touch folded lists if they are changed", () => {
    const { actions, editor, prevRoot, newRoot } = makeArgs({
      editor: makeEditor({
        text: `
- 1
  - 2
    - 3
  - [ ] 4
- 5
`,
        cursor: { line: 5, ch: 3 },
        getAllFoldedLines: () => [2],
      }),

      changes: (root) => {
        const list5 = root.getChildren()[1];
        const list5Parent = list5.getParent();
        list5Parent.removeChild(list5);
        list5Parent.addBeforeAll(list5);
        root.replaceCursor({ line: 1, ch: 3 });
      },
    });
    const changesApplicator = new ChangesApplicator();

    changesApplicator.apply(editor, prevRoot, newRoot);

    expect(actions).toStrictEqual([
      ["getRange", ...newRoot.getRange()],
      ["unfold", 2],
      [
        "replaceRange",
        "- 5\n- 1\n  - 2\n    - 3\n  - [ ] 4",
        { line: 1, ch: 0 },
        { line: 5, ch: 3 },
      ],
      ["fold", 3],
      [
        "setSelections",
        [{ anchor: { line: 1, ch: 3 }, head: { line: 1, ch: 3 } }],
      ],
    ]);
  });
});

function makeArgs(opts: { editor: MyEditor; changes: (root: Root) => void }) {
  const actions: any = [];
  const prevRoot = makeRoot({
    editor: opts.editor,
  });
  const newRoot = prevRoot.clone();
  opts.changes(newRoot);
  const mockedEditor: MyEditor = {
    getRange: (...args: any[]) => {
      actions.push(["getRange", ...args]);
      return prevRoot.print();
    },
    unfold: (...args: any[]) => {
      actions.push(["unfold", ...args]);
    },
    replaceRange: (...args: any[]) => {
      actions.push(["replaceRange", ...args]);
    },
    setSelections: (...args: any[]) => {
      actions.push(["setSelections", ...args]);
    },
    fold: (...args: any[]) => {
      actions.push(["fold", ...args]);
    },
  } as any;

  return {
    actions,
    editor: mockedEditor,
    prevRoot,
    newRoot,
  };
}
