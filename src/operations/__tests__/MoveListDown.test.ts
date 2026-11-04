import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import {
  expectMovementState,
  makeMovementRoot,
  movementSubtree,
} from "../../__testHelpers__/movement";
import { MoveListDown } from "../MoveListDown";

describe("MoveListDown operation", () => {
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
              "- source",
              `${source}- source sibling`,
              ...movementSubtree(source, cursorLine),
              "- destination",
              `${destination}- existing`,
              `${destination}  existing note`,
              `${destination}  - existing child`,
            ].join("\n"),
          );

          const op = new MoveListDown(root);
          op.perform();

          expectMovementState(
            root,
            [
              "- source",
              `${source}- source sibling`,
              "- destination",
              ...movementSubtree(destination, cursorLine),
              `${destination}- existing`,
              `${destination}  existing note`,
              `${destination}  - existing child`,
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
          const source = " ".repeat(4 + step);
          const destination = " ".repeat(2 + step);
          const root = makeMovementRoot(
            [
              "- outer",
              "    - source",
              ...movementSubtree(source, cursorLine),
              "  - destination",
            ].join("\n"),
          );

          new MoveListDown(root).perform();

          expectMovementState(
            root,
            [
              "- outer",
              "    - source",
              "  - destination",
              ...movementSubtree(destination, cursorLine),
            ].join("\n"),
          );
        },
      );
    },
  );

  test("uses the first receiving child's indent without normalizing later siblings", () => {
    const root = makeMovementRoot(
      "- source\n  - mo|ved\n    - child\n- destination\n    - first\n  - last",
    );

    new MoveListDown(root).perform();

    expectMovementState(
      root,
      "- source\n- destination\n    - mo|ved\n      - child\n    - first\n  - last",
    );
  });

  test("does not normalize a same-parent move with a subtree and note cursor", () => {
    const root = makeMovementRoot(
      "- parent\n    - moved\n      no|te\n      - child\n        child note\n    - sibling",
    );

    new MoveListDown(root).perform();

    expectMovementState(
      root,
      "- parent\n    - sibling\n    - moved\n      no|te\n      - child\n        child note",
    );
  });

  test("leaves a terminal nested subtree and its note cursor unchanged", () => {
    const state = "- parent\n    - moved\n      no|te\n      - child";
    const root = makeMovementRoot(state);
    const op = new MoveListDown(root);

    op.perform();

    expectMovementState(root, state);
    expect(op.shouldUpdate()).toBe(false);
    expect(op.shouldStopPropagation()).toBe(true);
  });

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
