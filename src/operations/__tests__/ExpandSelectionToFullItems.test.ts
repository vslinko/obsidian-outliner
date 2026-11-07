import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { Position, Range, Root, cmpPos } from "../../root";
import { KeepCursorWithinContent } from "../../services/Settings";
import { ExpandSelectionToFullItems } from "../ExpandSelectionToFullItems";

type Coordinates = [number, number];

function selection(from: Coordinates, to: Coordinates, reverse = false): Range {
  const anchor = { line: from[0], ch: from[1] };
  const head = { line: to[0], ch: to[1] };
  return reverse ? { anchor: head, head: anchor } : { anchor, head };
}

function normalized(range: Range): Position[] {
  return [range.anchor, range.head].sort(cmpPos);
}

function fixture(
  text: string,
  ranges: Range[],
  cursor: Coordinates = [0, 2],
  mode: KeepCursorWithinContent = "bullet-and-checkbox",
) {
  const settings = makeSettings();
  // Parser reads the public preference, not the saved stickCursor field.
  settings.keepCursorWithinContent = mode;
  const editor = makeEditor({
    text,
    cursor: { line: cursor[0], ch: cursor[1] },
  });
  editor.listSelections = () => ranges;
  const root = makeRoot({ editor, settings });
  expect(root).not.toBeNull();
  return root;
}

function expectExpansion(root: Root, expected?: Range) {
  const before = root.getSelections();
  const text = root.print();
  const op = new ExpandSelectionToFullItems(root);
  op.perform();

  expect(root.print()).toBe(text);
  expect(op.shouldUpdate()).toBe(expected !== undefined);
  expect(op.shouldStopPropagation()).toBe(expected !== undefined);
  expect(root.getSelections()).toEqual(expected ? [expected] : before);

  if (expected) {
    const [from, to] = normalized(before[0]);
    const [expandedFrom, expandedTo] = normalized(expected);
    expect(cmpPos(expandedFrom, from)).toBeLessThanOrEqual(0);
    expect(cmpPos(expandedTo, to)).toBeGreaterThanOrEqual(0);
    expect(cmpPos(expected.anchor, expected.head) < 0).toBe(
      cmpPos(before[0].anchor, before[0].head) < 0,
    );

    // Reused instances must clear their flags; subsequent transactions also
    // construct a fresh operation, which must not expand any further.
    op.perform();
    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(false);
    expect(root.getSelections()).toEqual([expected]);
    const next = new ExpandSelectionToFullItems(root);
    next.perform();
    expect(next.shouldUpdate()).toBe(false);
    expect(next.shouldStopPropagation()).toBe(false);
    expect(root.getSelections()).toEqual([expected]);
  }
}

const bullets = "- item 1\n- item 2\n- item 3\n";
const tree = [
  "Intro",
  "- Parent",
  "    - Early",
  "        - Deep",
  "    - Late",
  "- Next",
  "    - Next child",
  "- End",
  "Outro",
].join("\n");

describe("ExpandSelectionToFullItems operation", () => {
  describe.each([false, true])("reversed=%s", (reverse) => {
    test("expands partial sibling contents", () => {
      expectExpansion(
        fixture(bullets, [selection([0, 5], [1, 5], reverse)]),
        selection([0, 2], [1, 8], reverse),
      );
    });

    test("includes all descendants of the last touched sibling", () => {
      const text =
        "- item 1\n- item 2\n    - item 2.1\n    - item 2.2\n- item 3";
      expectExpansion(
        fixture(text, [selection([0, 5], [1, 5], reverse)]),
        selection([0, 2], [3, 14], reverse),
      );
    });

    test("regression: nested siblings use the actual last child's line length", () => {
      const text =
        "- parent 1\n    - child 1.1\n        - grandchild\n    - child 1.2\n- parent 2";
      expectExpansion(
        fixture(text, [selection([1, 8], [3, 8], reverse)], [1, 8]),
        selection([1, 6], [3, 15], reverse),
      );
    });

    test("regression: real checkbox preference excludes the checkbox", () => {
      const text = "- [ ] task 1\n- [ ] task 2\n- peer";
      expectExpansion(
        fixture(text, [selection([0, 8], [1, 8], reverse)]),
        selection([0, 6], [1, 12], reverse),
      );
    });

    test.each([
      {
        name: "parent to early child includes later siblings in that subtree",
        from: [1, 5],
        to: [2, 9],
        start: [1, 2],
        end: [4, 10],
      },
      {
        name: "child to another parent includes that parent's descendants",
        from: [2, 9],
        to: [5, 4],
        start: [2, 6],
        end: [6, 16],
      },
      {
        name: "child endpoints include the intervening touched parent subtree",
        from: [4, 8],
        to: [6, 9],
        start: [4, 6],
        end: [6, 16],
      },
      {
        name: "grandchild to sibling does not include untouched ancestors",
        from: [3, 12],
        to: [4, 8],
        start: [3, 10],
        end: [4, 10],
      },
      {
        name: "parent to its first grandchild still includes the late child",
        from: [1, 5],
        to: [3, 12],
        start: [1, 2],
        end: [4, 10],
      },
    ])("$name", ({ from, to, start, end }) => {
      expectExpansion(
        fixture(
          tree,
          [selection(from as Coordinates, to as Coordinates, reverse)],
          [2, 8],
        ),
        selection(start as Coordinates, end as Coordinates, reverse),
      );
    });

    test("note endpoints include their owning items, notes and descendants", () => {
      const text =
        "- First\n  note first\n    - Child\n- Second\n  note second\n    - Last child\n- Third";
      expectExpansion(
        fixture(text, [selection([1, 5], [4, 6], reverse)], [1, 5]),
        selection([0, 2], [5, 16], reverse),
      );
    });

    test("numeric bullets and custom checkboxes use their actual content boundaries", () => {
      const text = "10. [>] first\n11. [!] second\n12. third";
      expectExpansion(
        fixture(text, [selection([0, 10], [1, 10], reverse)]),
        selection([0, 8], [1, 14], reverse),
      );
    });

    test("intermediate parent includes descendants after the ending early child", () => {
      const text = "- First\n- Parent\n    - Early\n    - Late\n- Last";
      expectExpansion(
        fixture(text, [selection([0, 4], [2, 9], reverse)]),
        selection([0, 2], [3, 10], reverse),
      );
    });

    test.each([
      {
        name: "bullet",
        text: "- first\n- second\n- third",
        from: [0, 0],
        to: [1, 4],
        start: [0, 0],
        end: [1, 8],
      },
      {
        name: "checkbox",
        text: "- [ ] first\n- [x] second\n- third",
        from: [0, 3],
        to: [1, 8],
        start: [0, 3],
        end: [1, 12],
      },
      {
        name: "custom checkbox",
        text: "- [>] first\n- [!] second\n- third",
        from: [0, 4],
        to: [1, 8],
        start: [0, 4],
        end: [1, 12],
      },
      {
        name: "numeric bullet",
        text: "10. first\n11. second\n12. third",
        from: [0, 1],
        to: [1, 6],
        start: [0, 1],
        end: [1, 10],
      },
      {
        name: "nested indentation",
        text: "- Top\n    - first\n    - second\n- End",
        from: [1, 1],
        to: [2, 8],
        start: [1, 1],
        end: [2, 12],
      },
    ])(
      "retains already-selected $name prefix",
      ({ text, from, to, start, end }) => {
        expectExpansion(
          fixture(text, [
            selection(from as Coordinates, to as Coordinates, reverse),
          ]),
          selection(start as Coordinates, end as Coordinates, reverse),
        );
      },
    );

    test("right column zero excludes the next item and retains the newline", () => {
      const text = "- first\n- second\n- Parent\n    - Untouched child\n- Last";
      expectExpansion(
        fixture(text, [selection([0, 4], [2, 0], reverse)]),
        selection([0, 2], [2, 0], reverse),
      );
    });

    test("right column zero still includes the previous touched parent's subtree", () => {
      const text = "- first\n- Parent\n    - Child\n    - Later\n- Last";
      expectExpansion(
        fixture(text, [selection([0, 4], [2, 0], reverse)]),
        selection([0, 2], [3, 11], reverse),
      );
    });

    test.each([
      { name: "cursor", text: bullets, from: [0, 5], to: [0, 5] },
      {
        name: "single-line selection",
        text: bullets,
        from: [0, 3],
        to: [0, 7],
      },
      {
        name: "different lines of one item",
        text: "- first\n  note one\n  note two\n- second",
        from: [0, 4],
        to: [2, 5],
      },
      {
        name: "notes of one item",
        text: "- first\n  note one\n  note two\n- second",
        from: [1, 4],
        to: [2, 5],
      },
      {
        name: "one touched item ending at next line zero",
        text: bullets,
        from: [0, 5],
        to: [1, 0],
      },
      {
        name: "one parent ending at its first child's line zero",
        text: "- Parent\n    - Child\n- Last",
        from: [0, 5],
        to: [1, 0],
      },
      {
        name: "already expanded contents",
        text: bullets,
        from: [0, 2],
        to: [1, 8],
      },
      {
        name: "already expanded prefixes and newline",
        text: bullets,
        from: [0, 0],
        to: [2, 0],
      },
      { name: "whole root", text: tree, from: [1, 0], to: [7, 5] },
      { name: "whole document", text: tree, from: [0, 0], to: [8, 5] },
      {
        name: "starts in prose before root",
        text: tree,
        from: [0, 2],
        to: [2, 8],
      },
      {
        name: "ends in prose after root",
        text: tree,
        from: [2, 8],
        to: [8, 2],
      },
      {
        name: "crosses two separated roots",
        text: "- first\n- second\n\nparagraph\n\n- third\n- fourth",
        from: [0, 4],
        to: [5, 4],
      },
      {
        name: "newline outside root",
        text: "- first\n- second\n",
        from: [0, 4],
        to: [2, 0],
      },
      {
        name: "before root start ch",
        text: bullets,
        from: [0, -1],
        to: [1, 5],
      },
      { name: "after root end ch", text: bullets, from: [0, 5], to: [2, 9] },
    ])("leaves $name unchanged", ({ text, from, to }) => {
      expectExpansion(
        fixture(
          text,
          [selection(from as Coordinates, to as Coordinates, reverse)],
          text === tree ? [2, 8] : [0, 2],
        ),
      );
    });

    test("multiple selections remain unchanged even when both cross items", () => {
      expectExpansion(
        fixture(bullets, [
          selection([0, 4], [1, 5], reverse),
          selection([1, 4], [2, 5], reverse),
        ]),
      );
    });
  });

  test.each<KeepCursorWithinContent>([
    "never",
    "bullet-only",
    "bullet-and-checkbox",
  ])("checkbox parsing retains the existing %s cursor preference", (mode) => {
    const text = "- [>] first\n- [!] second\n- third";
    const root = fixture(text, [selection([0, 8], [1, 8])], [0, 8], mode);
    expectExpansion(
      root,
      selection([0, mode === "bullet-and-checkbox" ? 6 : 2], [1, 12]),
    );
  });
});
