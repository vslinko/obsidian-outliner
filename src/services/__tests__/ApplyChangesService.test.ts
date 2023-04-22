/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeEditor, makeRoot } from "../../__mocks__";
import { List } from "../../root";
import { ApplyChangesService } from "../ApplyChangesService";

const BEFORE = `
- 1
  - 2
   - 3
  - [ ] 4
- 5
- 6
- 7
`;

const AFTER = `
- 1
  - 2
   - 3
  - [ ] 4
  - [ ] 
- 5
`;

describe("applyChanges", () => {
  test("should effectively apply the changes", () => {
    const actions: any = [];
    const prevRoot = makeRoot({
      editor: makeEditor({
        text: BEFORE,
        cursor: { line: 4, ch: 9 },
        getAllFoldedLines: () => [2],
      }),
    });
    const newRoot = prevRoot.clone();
    newRoot.getChildren()[1].replateBullet("*");
    newRoot
      .getChildren()[0]
      .addAfterAll(new List(newRoot, "  ", "-", "[ ]", " ", "", false));
    newRoot.getChildren()[2].getParent().removeChild(newRoot.getChildren()[2]);
    const currentEditor: any = {
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
    };
    const applyChanges = new ApplyChangesService();

    applyChanges.applyChanges(currentEditor, prevRoot, newRoot);

    expect(actions).toStrictEqual([
      ["getRange", ...newRoot.getRange()],
      ["unfold", 1],
      ["unfold", 2],
      ["unfold", 3],
      ["unfold", 4],
      ["unfold", 5],
      ["unfold", 6],
      [
        "replaceRange",
        "  - [ ] 4\n  - [ ] ",
        { line: 4, ch: 0 },
        { line: 5, ch: 9 },
      ],
      ["setSelections", newRoot.getSelections()],
      ["fold", 2],
    ]);
  });
});
