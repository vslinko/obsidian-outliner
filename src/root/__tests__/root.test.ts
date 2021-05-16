import { ListUtils } from "../../list_utils";
import { Logger } from "../../logger";
import { ObsidianUtils } from "../../obsidian_utils";
import { makeEditor, makeLogger, makeObsidianUtils } from "../../test_utils";

export function makeRoot(options: {
  editor: CodeMirror.Editor;
  logger?: Logger;
  obsidianUtils?: ObsidianUtils;
}) {
  const { logger, obsidianUtils, editor } = {
    logger: makeLogger(),
    obsidianUtils: makeObsidianUtils(),
    ...options,
  };

  const listUtils = new ListUtils(logger, obsidianUtils);

  return listUtils.parseList(editor);
}

describe("Root", () => {
  describe("getListUnderLine", () => {
    test("should return list under line", () => {
      const root = makeRoot({
        editor: makeEditor({
          text: "- one\n\t- two\n- three",
          cursor: { line: 0, ch: 0 },
        }),
      });

      const list = root.getListUnderLine(1);

      expect(list).toBeDefined();
      expect(list.print()).toBe("\t- two\n");
    });

    test("should return list under line when line is note", () => {
      const root = makeRoot({
        editor: makeEditor({
          text: "- one\n\tnote1\n\t- two\n\t\tnote2\n- three",
          cursor: { line: 0, ch: 0 },
        }),
      });

      const list = root.getListUnderLine(3);

      expect(list).toBeDefined();
      expect(list.print()).toBe("\t- two\n\t\tnote2\n");
    });
  });

  describe("getContentLinesRangeOf", () => {
    test("should return range of list", () => {
      const root = makeRoot({
        editor: makeEditor({
          text: "- one\n\t- two\n- three",
          cursor: { line: 0, ch: 0 },
        }),
      });

      const range = root.getContentLinesRangeOf(
        root.getChildren()[0].getChildren()[0]
      );

      expect(range).toStrictEqual([1, 1]);
    });

    test("should return range of list when list has notes", () => {
      const root = makeRoot({
        editor: makeEditor({
          text: "- one\n\tnote1\n\t- two\n\t\tnote2\n- three",
          cursor: { line: 0, ch: 0 },
        }),
      });

      const range = root.getContentLinesRangeOf(
        root.getChildren()[0].getChildren()[0]
      );

      expect(range).toStrictEqual([2, 3]);
    });
  });
});
