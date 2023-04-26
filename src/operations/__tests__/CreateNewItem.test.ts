import { makeEditor, makeRoot, makeSettingsService } from "../../__mocks__";
import { CreateNewItem } from "../CreateNewItem";

test("should create sibling bullet instead of child bullet if child bullets are folded", () => {
  const root = makeRoot({
    editor: makeEditor({
      text: "- one\n  - two\n",
      cursor: { line: 0, ch: 5 },
      getAllFoldedLines: () => [0],
    }),
    settings: makeSettingsService(),
  });
  const getZoomRange = {
    getZoomRange: (): null => null,
  };

  const op = new CreateNewItem(root, "  ", getZoomRange);
  op.perform();

  expect(root.print()).toBe("- one\n  - two\n- ");
});
