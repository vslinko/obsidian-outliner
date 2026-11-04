import { makeEditor, makeRoot } from "../__mocks__";
import { List, Root } from "../root";

interface SemanticList {
  bullet: string;
  lines: string[];
  children: SemanticList[];
}

function semanticHierarchy(parent: Root | List): SemanticList[] {
  return parent.getChildren().map((list) => ({
    bullet: list.getBullet(),
    lines: list.getLines(),
    children: semanticHierarchy(list),
  }));
}

export function makeMovementRoot(state: string): Root {
  const lines = state.split("\n");
  const line = lines.findIndex((text) => text.includes("|"));
  const ch = lines[line].indexOf("|");
  lines[line] = lines[line].replace("|", "");
  return makeRoot({
    editor: makeEditor({ text: lines.join("\n"), cursor: { line, ch } }),
  });
}

export function movementSubtree(
  indent: string,
  cursorLine: "content" | "note",
) {
  return [
    `${indent}- ${cursorLine === "content" ? "mo|ved" : "moved"}`,
    `${indent}  ${cursorLine === "note" ? "no|te" : "note"}`,
    `${indent}  - child`,
    `${indent}    child note`,
    `${indent}    - grandchild`,
  ];
}

export function expectMovementState(root: Root, state: string) {
  const expected = makeMovementRoot(state);
  const reparsed = makeRoot({
    editor: makeEditor({ text: root.print(), cursor: root.getCursor() }),
  });

  // Compare content and parent/child relationships, not generated IDs or refs.
  expect(semanticHierarchy(root)).toEqual(semanticHierarchy(expected));
  expect(reparsed).not.toBeNull();
  expect(semanticHierarchy(reparsed)).toEqual(semanticHierarchy(root));
  expect(root.print()).toBe(expected.print());
  expect(root.getCursor()).toEqual(expected.getCursor());
}
