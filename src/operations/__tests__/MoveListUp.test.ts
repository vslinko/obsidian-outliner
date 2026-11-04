import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import {
  expectMovementState,
  makeMovementRoot,
  movementSubtree,
} from "../../__testHelpers__/movement";
import { MoveListUp } from "../MoveListUp";

describe("MoveListUp operation", () => {
  describe.each([
    { sourceIndent: 2, destinationIndent: 4 },
    { sourceIndent: 4, destinationIndent: 2 },
  ])(
    "cross-parent move from $sourceIndent to $destinationIndent spaces (#619)",
    ({ sourceIndent, destinationIndent }) => {
      test.each(["content", "note"] as const)(
        "preserves hierarchy, descendants and cursor in %s after reparsing",
        (cursorLine) => {
          const source = " ".repeat(sourceIndent);
          const destination = " ".repeat(destinationIndent);
          const root = makeMovementRoot(
            [
              "- destination",
              `${destination}- existing`,
              `${destination}  existing note`,
              `${destination}  - existing child`,
              "- source",
              ...movementSubtree(source, cursorLine),
              `${source}- source sibling`,
            ].join("\n"),
          );

          const op = new MoveListUp(root);
          op.perform();

          expectMovementState(
            root,
            [
              "- destination",
              `${destination}- existing`,
              `${destination}  existing note`,
              `${destination}  - existing child`,
              ...movementSubtree(destination, cursorLine),
              "- source",
              `${source}- source sibling`,
            ].join("\n"),
          );
          expect(op.shouldUpdate()).toBe(true);
        },
      );
    },
  );

  describe.each([2, 4])(
    "empty receiving parent with source step %i",
    (step) => {
      test.each(["content", "note"] as const)(
        "preserves the relative step at the new parent's absolute indent (%s cursor)",
        (cursorLine) => {
          const source = " ".repeat(2 + step);
          const destination = " ".repeat(4 + step);
          const root = makeMovementRoot(
            [
              "- outer",
              "    - destination",
              "  - source",
              ...movementSubtree(source, cursorLine),
            ].join("\n"),
          );

          new MoveListUp(root).perform();

          expectMovementState(
            root,
            [
              "- outer",
              "    - destination",
              ...movementSubtree(destination, cursorLine),
              "  - source",
            ].join("\n"),
          );
        },
      );
    },
  );

  test("uses the last receiving child's indent without normalizing earlier siblings", () => {
    const root = makeMovementRoot(
      "- destination\n    - first\n  - last\n- source\n    - mo|ved\n      - child",
    );

    new MoveListUp(root).perform();

    expectMovementState(
      root,
      "- destination\n    - first\n  - last\n  - mo|ved\n    - child\n- source",
    );
  });

  test("does not normalize a same-parent move with a subtree and note cursor", () => {
    const root = makeMovementRoot(
      "- parent\n    - sibling\n    - moved\n      no|te\n      - child\n        child note",
    );

    new MoveListUp(root).perform();

    expectMovementState(
      root,
      "- parent\n    - moved\n      no|te\n      - child\n        child note\n    - sibling",
    );
  });

  test("leaves an initial nested subtree and its note cursor unchanged", () => {
    const state = "- parent\n    - moved\n      no|te\n      - child";
    const root = makeMovementRoot(state);
    const op = new MoveListUp(root);

    op.perform();

    expectMovementState(root, state);
    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(true);
  });

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
