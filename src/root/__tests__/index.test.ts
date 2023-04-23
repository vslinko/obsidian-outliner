import { Position, isRangesIntersects } from "..";

import { makeEditor, makeRoot } from "../../__mocks__";

function parseRanges(str: string): {
  a: [Position, Position];
  b: [Position, Position];
} {
  return {
    a: [
      { line: 0, ch: str.indexOf("[") },
      { line: 0, ch: str.indexOf("]") },
    ],
    b: [
      { line: 0, ch: str.indexOf("(") },
      { line: 0, ch: str.indexOf(")") },
    ],
  };
}

describe("isRangesIntersects", () => {
  const cases = [
    ["[--(-]--)", true],
    ["(--[-)--]", true],
    ["[--(--)--]", true],
    ["(--[--]--)", true],
    ["[--](--)", false],
    ["(--)[--]", false],
  ];

  test.each(cases)(
    "when ranges are '%s' then result is %s",
    (ranges: string, result: boolean) => {
      const { a, b } = parseRanges(ranges);

      expect(isRangesIntersects(a, b)).toBe(result);
    }
  );
});

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
