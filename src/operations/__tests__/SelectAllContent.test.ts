import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { Position, Range, Root } from "../../root";
import { SelectAllContent } from "../SelectAllContent";

type Coordinates = [number, number];

function selection(
  from: Coordinates,
  to: Coordinates = from,
  reverse = false,
): Range {
  const anchor = { line: from[0], ch: from[1] };
  const head = { line: to[0], ch: to[1] };
  return reverse ? { anchor: head, head: anchor } : { anchor, head };
}

function normalized(range: Range): Position[] {
  return [range.anchor, range.head].sort(
    (a, b) => a.line - b.line || a.ch - b.ch,
  );
}

function makeContentRoot(text: string, cursor: Coordinates) {
  const settings = makeSettings();
  settings.keepCursorWithinContent = "bullet-and-checkbox";
  return makeRoot({
    editor: makeEditor({
      text,
      cursor: { line: cursor[0], ch: cursor[1] },
    }),
    settings,
  });
}

function expectStep(root: Root, expected?: Range) {
  const before = root.getSelections();
  const text = root.print();
  // Production constructs a new operation for each keypress.
  const op = new SelectAllContent(root);
  op.perform();

  expect(root.print()).toBe(text);
  expect(op.shouldUpdate()).toBe(expected !== undefined);
  expect(op.shouldStopPropagation()).toBe(expected !== undefined);
  if (expected === undefined) {
    expect(root.getSelections()).toEqual(before);
    return;
  }

  const after = normalized(root.getSelection());
  const previous = normalized(before[0]);
  expect(root.getSelections()).toHaveLength(1);
  expect(after).toEqual(normalized(expected));
  expect(after).not.toEqual(previous);
  const compare = (a: Position, b: Position) => a.line - b.line || a.ch - b.ch;
  expect(compare(after[0], previous[0])).toBeLessThanOrEqual(0);
  expect(compare(after[1], previous[1])).toBeGreaterThanOrEqual(0);
}

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

    // Reusing an operation must also reset the flags at the native handoff.
    const wholeRoot = root.getSelections();
    op.perform();
    expect(root.getSelections()).toEqual(wholeRoot);
    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(false);
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

    // Empty content cannot enlarge the cursor, so skip directly to the root.
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

  describe.each([false, true])("reversed=%s", (reverse) => {
    const tree = [
      "Intro",
      "- Alpha",
      "    - Branch",
      "        - One",
      "        - Two",
      "            - Deep",
      "    - Cousin",
      "- Omega",
      "Outro",
    ].join("\n");

    function fixture(text = tree, cursor: Coordinates = [3, 12]) {
      return makeContentRoot(text, cursor);
    }

    test.each([
      {
        name: "top-level items use the synthetic root",
        from: [3, 11] as Coordinates,
        to: [7, 4] as Coordinates,
        expected: selection([1, 0], [7, 7]),
        synthetic: true,
      },
      {
        name: "siblings include their real LCA and all descendants",
        from: [3, 11] as Coordinates,
        to: [4, 11] as Coordinates,
        expected: selection([2, 6], [5, 18]),
        synthetic: false,
      },
      {
        name: "ancestor and descendant include the ancestor's remaining subtree",
        from: [2, 8] as Coordinates,
        to: [3, 11] as Coordinates,
        expected: selection([2, 6], [5, 18]),
        synthetic: false,
      },
      {
        name: "separate branches choose the nearest real common ancestor",
        from: [3, 11] as Coordinates,
        to: [6, 9] as Coordinates,
        expected: selection([1, 2], [6, 12]),
        synthetic: false,
      },
    ])("$name", ({ from, to, expected, synthetic }) => {
      const root = fixture();
      root.replaceSelections([selection(from, to, reverse)]);
      if (synthetic) {
        // A synthetic List has no content coordinates of its own.
        const methods = [
          "getFirstLineContentStart",
          "getFirstLineContentStartAfterCheckbox",
          "getLastLineContentEnd",
          "getContentEndIncludingChildren",
        ] as const;
        for (const method of methods) {
          jest.spyOn(root.getRootList(), method).mockImplementation(() => {
            throw new Error("Synthetic root must use Root.getContentRange");
          });
        }
      }
      expectStep(root, expected);
    });

    test("progresses through content, own subtree, every parent, root, then native handoff", () => {
      const root = fixture(
        [
          "Prelude",
          "- Top",
          "    - Parent",
          "        - [ ] Branch",
          "          note",
          "            - Leaf",
          "    - Other",
          "- Peer",
          "After",
        ].join("\n"),
        [3, 17],
      );
      const stages = [
        selection([3, 14], [4, 14]),
        selection([3, 14], [5, 18]),
        selection([2, 6], [5, 18]),
        selection([1, 2], [6, 11]),
        selection([1, 0], [7, 6]),
      ];
      for (const expected of stages) {
        const [from, to] = normalized(root.getSelection());
        root.replaceSelections([
          selection([from.line, from.ch], [to.line, to.ch], reverse),
        ]);
        expectStep(root, expected);
      }
      expectStep(root);
      expectStep(root);
    });

    test("a leaf skips its identical subtree but not its intermediate parents", () => {
      const root = fixture("- Top\n    - Middle\n        - Leaf", [2, 12]);
      root.replaceSelections([selection([2, 10], [2, 14], reverse)]);
      expectStep(root, selection([1, 6], [2, 14]));
      expectStep(root, selection([0, 2], [2, 14]));
      expectStep(root, selection([0, 0], [2, 14]));
      expectStep(root);
    });

    test.each([
      {
        name: "bullet prefix skips a non-containing item content range",
        item: "    - [ ] Task",
        from: [1, 4] as Coordinates,
        to: [1, 12] as Coordinates,
        expected: selection([0, 2], [3, 15]),
      },
      {
        name: "checkbox prefix skips a non-containing item content range",
        item: "    - [ ] Task",
        from: [1, 6] as Coordinates,
        to: [1, 12] as Coordinates,
        expected: selection([0, 2], [3, 15]),
      },
      {
        name: "custom checkbox prefix is preserved too",
        item: "    - [>] Task",
        from: [1, 7] as Coordinates,
        to: [1, 12] as Coordinates,
        expected: selection([0, 2], [3, 15]),
      },
      {
        name: "indent prefix is not discarded",
        item: "    - [ ] Task",
        from: [1, 1] as Coordinates,
        to: [1, 12] as Coordinates,
        expected: selection([0, 2], [3, 15]),
      },
      {
        name: "notes-only selection expands to item content and all notes",
        item: "    - [ ] Task",
        from: [2, 7] as Coordinates,
        to: [2, 9] as Coordinates,
        expected: selection([1, 10], [2, 10]),
      },
      {
        name: "notes indentation is contained by the multiline item range",
        item: "    - [ ] Task",
        from: [2, 0] as Coordinates,
        to: [2, 9] as Coordinates,
        expected: selection([1, 10], [2, 10]),
      },
      {
        name: "top-level bullet prefix requires the whole parsed root",
        item: "    - [ ] Task",
        from: [0, 0] as Coordinates,
        to: [0, 4] as Coordinates,
        expected: selection([0, 0], [4, 6]),
      },
    ])("$name", ({ item, from, to, expected }) => {
      const root = fixture(
        ["- Top", item, "      note", "        - Child", "- Peer"].join("\n"),
        [1, 12],
      );
      root.replaceSelections([selection(from, to, reverse)]);
      expectStep(root, expected);
    });

    test.each([
      { name: "before the parsed root", from: [0, 2], to: [3, 11] },
      { name: "after the parsed root", from: [3, 11], to: [8, 2] },
      { name: "before the start ch", from: [1, -1], to: [3, 11] },
      { name: "past the end ch", from: [3, 11], to: [7, 8] },
      { name: "cursor past the end ch", from: [7, 8], to: [7, 8] },
      { name: "already the entire root", from: [1, 0], to: [7, 7] },
    ])("leaves selection $name untouched", ({ from, to }) => {
      const root = fixture();
      root.replaceSelections([
        selection(from as Coordinates, to as Coordinates, reverse),
      ]);
      expectStep(root);
    });

    test("multiple nonempty selections are untouched", () => {
      const root = fixture();
      root.replaceSelections([
        selection([3, 10], [3, 12], reverse),
        selection([4, 10], [4, 12], reverse),
      ]);
      expectStep(root);
    });
  });

  test("a cursor on a note selects the item content, excluding its custom checkbox", () => {
    const root = makeContentRoot(
      "- [!] Task\n  first note\n  last note\n- Peer",
      [2, 5],
    );
    expectStep(root, selection([0, 6], [2, 11]));
  });

  test.each([
    {
      name: "empty nested leaf skips to its parent",
      text: "- Top\n    - \n- Peer",
      cursor: [1, 6] as Coordinates,
      expected: selection([0, 2], [1, 6]),
    },
    {
      name: "empty checkbox leaf skips to the root",
      text: "- [ ] \n- Peer",
      cursor: [0, 6] as Coordinates,
      expected: selection([0, 0], [1, 6]),
    },
    {
      name: "sole empty leaf includes its bullet on the first press",
      text: "- ",
      cursor: [0, 2] as Coordinates,
      expected: selection([0, 0], [0, 2]),
    },
    {
      name: "empty parent skips content but still selects its own subtree",
      text: "- \n    - Child\n- Peer",
      cursor: [0, 2] as Coordinates,
      expected: selection([0, 2], [1, 11]),
    },
  ])("$name", ({ text, cursor, expected }) => {
    expectStep(makeContentRoot(text, cursor), expected);
  });
});
