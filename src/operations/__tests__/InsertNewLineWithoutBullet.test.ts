import { makeEditor, makeRoot, makeSettings } from "../../__mocks__";
import { InsertNewLineWithoutBullet } from "../InsertNewLineWithoutBullet";

describe("InsertNewLineWithoutBullet operation", () => {
  test("should create a note line below the current list item", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n- item 2\n",
        cursor: { line: 0, ch: 8 },
      }),
      settings: makeSettings(),
    });

    const op = new InsertNewLineWithoutBullet(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n  \n- item 2");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(2);
  });

  test("should split the current list line into a note line", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n",
        cursor: { line: 0, ch: 5 },
      }),
      settings: makeSettings(),
    });

    const op = new InsertNewLineWithoutBullet(root);
    op.perform();

    expect(root.print()).toBe("- ite\n  m 1");
    expect(root.getCursor().line).toBe(1);
    expect(root.getCursor().ch).toBe(2);
  });

  test("should preserve existing note indentation when splitting a note line", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "- item 1\n  note line\n- item 2\n",
        cursor: { line: 1, ch: 7 },
      }),
      settings: makeSettings(),
    });

    const op = new InsertNewLineWithoutBullet(root);
    op.perform();

    expect(root.print()).toBe("- item 1\n  note \n  line\n- item 2");
    expect(root.getCursor().line).toBe(2);
    expect(root.getCursor().ch).toBe(2);
  });
});
