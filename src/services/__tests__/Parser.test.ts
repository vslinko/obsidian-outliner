/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { Logger } from "../Logger";
import { Parser } from "../Parser";
import { Settings } from "../Settings";

function makeParser(
  options: {
    logger?: Logger;
    settings?: Settings;
  } = {},
) {
  const { logger, settings } = {
    logger: makeLogger(),
    settings: makeSettings(),
    ...options,
  };

  return new Parser(logger, settings);
}

describe("parseList", () => {
  test.each([
    ["  ", "  "],
    ["\t", "\t"],
    ["    ", "  "],
    ["\t", "  "],
    ["  ", "  \u00a0"],
    ["  ", "  \u2003"],
    ["\t", "\t\u00a0"],
  ])(
    "should split lists at unsupported whitespace (child=%j, blank=%j)",
    (childIndent, blank) => {
      const lines = [
        "- parent",
        `${childIndent}- child`,
        blank,
        "- last",
        "- tail",
      ];
      const text = lines.join("\n");
      const parser = makeParser();
      const editor = makeEditor({ text, cursor: { line: 0, ch: 0 } });

      for (const line of [0, 1, 3, 4]) {
        const root = parser.parse(editor, { line, ch: 0 });
        const [from, to] = line < 2 ? [0, 1] : [3, 4];
        expect(root.print()).toBe(lines.slice(from, to + 1).join("\n"));
        expect(root.getContentRange()).toEqual([
          { line: from, ch: 0 },
          { line: to, ch: lines[to].length },
        ]);
        for (let l = from; l <= to; l++) {
          expect(root.getListUnderLine(l).getFirstLineContentStart().line).toBe(
            l,
          );
        }
      }
      expect(parser.parse(editor, { line: 2, ch: blank.length })).toBeNull();
      expect(parser.parseRange(editor).map((root) => root.print())).toEqual([
        lines.slice(0, 2).join("\n"),
        lines.slice(3).join("\n"),
      ]);
      expect(
        parser.parseRange(editor, 3, 4).map((root) => root.print()),
      ).toEqual(["- last\n- tail"]);
      expect(parser.parseRange(editor, 2, 2)).toEqual([]);
    },
  );

  test.each(["  \u00a0", "  \u2003"])(
    "should exclude unsupported trailing Unicode whitespace (%j)",
    (blank) => {
      const parser = makeParser();
      const editor = makeEditor({
        text: `- parent\n  - child\n${blank}`,
        cursor: { line: 0, ch: 2 },
      });
      for (const line of [0, 1]) {
        const root = parser.parse(editor, { line, ch: 2 });
        expect(root.print()).toBe("- parent\n  - child");
        expect(root.getContentEnd()).toEqual({ line: 1, ch: 9 });
      }
      expect(parser.parseRange(editor).map((root) => root.print())).toEqual([
        "- parent\n  - child",
      ]);
      expect(parser.parse(editor, { line: 2, ch: blank.length })).toBeNull();
    },
  );

  test("should split after established notes without treating extra note indentation as a boundary", () => {
    const lines = [
      "- parent",
      "  note",
      "    extra indent",
      "  ",
      " ",
      "- last",
    ];
    const parser = makeParser();
    const editor = makeEditor({
      text: lines.join("\n"),
      cursor: { line: 0, ch: 2 },
    });

    const roots = parser.parseRange(editor);
    expect(roots.map((root) => root.print())).toEqual([
      lines.slice(0, 4).join("\n"),
      "- last",
    ]);
    expect(roots[0].getListUnderLine(3).getFirstLineContentStart().line).toBe(
      0,
    );
    expect(parser.parse(editor, { line: 4, ch: 1 })).toBeNull();
  });

  test("should leave consecutive separators and orphaned children outside either list", () => {
    const text = "- parent\n  - child\n  \n \n  - orphan\n- last\n- tail";
    const parser = makeParser();
    const editor = makeEditor({ text, cursor: { line: 0, ch: 2 } });
    expect(parser.parseRange(editor).map((root) => root.print())).toEqual([
      "- parent\n  - child",
      "- last\n- tail",
    ]);
    for (const line of [2, 3, 4]) {
      expect(parser.parse(editor, { line, ch: 0 })).toBeNull();
    }
  });

  test.each([
    ["- parent\n  - child\n    \n- last\n- tail", [0, 1, 1, 3, 4]],
    ["- parent\n\t- child\n\t\t\n- last\n- tail", [0, 1, 1, 3, 4]],
    ["- parent\n  note\n  \n- last\n- tail", [0, 0, 0, 3, 4]],
    ["- parent\n  \n- last\n- tail", [0, 0, 2, 3]],
    ["- parent\n  - child\n    \u00a0\n- last", [0, 1, 1, 3]],
    ["- parent\n  - child\n    \u2003\n- last", [0, 1, 1, 3]],
  ])("should preserve text and line mapping for %j", (text, itemLines) => {
    const parser = makeParser();
    const root = parser.parse(makeEditor({ text, cursor: { line: 0, ch: 0 } }));

    expect(root).not.toBeNull();
    expect(root.print()).toBe(text);
    expect(root.getContentEnd().line).toBe(text.split("\n").length - 1);
    for (let line = 0; line < itemLines.length; line++) {
      expect(root.getListUnderLine(line).getFirstLineContentStart().line).toBe(
        itemLines[line],
      );
    }
  });

  test("should exclude a trailing whitespace line with an incorrect indent (#368)", () => {
    const parser = makeParser();
    const text = "- parent\n  - child\n ";
    const editor = makeEditor({ text, cursor: { line: 0, ch: 0 } });
    const root = parser.parse(editor);

    expect(root.print()).toBe("- parent\n  - child");
    expect(root.getContentEnd()).toEqual({ line: 1, ch: 9 });
    expect(parser.parse(editor, { line: 2, ch: 1 })).toBeNull();
  });

  test("should parse list with notes and sublists", () => {
    const parser = makeParser();
    const editor = makeEditor({
      text: `
- one
  side
\t- two
\t\t- three
\t\t\tnote
\t- four
`.trim(),
      cursor: { line: 0, ch: 0 },
    });

    const list = parser.parse(editor as any);

    expect(list).toBeDefined();
    expect(list).toMatchObject(
      expect.objectContaining({
        rootList: expect.objectContaining({
          children: [
            expect.objectContaining({
              indent: "",
              bullet: "-",
              notesIndent: "  ",
              lines: ["one", "side"],
              children: [
                expect.objectContaining({
                  indent: "\t",
                  bullet: "-",
                  notesIndent: null,
                  lines: ["two"],
                  children: [
                    expect.objectContaining({
                      indent: "\t\t",
                      bullet: "-",
                      notesIndent: "\t\t\t",
                      lines: ["three", "note"],
                    }),
                  ],
                }),
                expect.objectContaining({
                  indent: "\t",
                  bullet: "-",
                  notesIndent: null,
                  lines: ["four"],
                }),
              ],
            }),
          ],
        }),
      }),
    );
    expect(list.print()).toBe(
      "- one\n  side\n\t- two\n\t\t- three\n\t\t\tnote\n\t- four",
    );
  });

  test("should parse second list", () => {
    const parser = makeParser();
    const editor = makeEditor({
      text: `
- one
- two

- three
- four
`.trim(),
      cursor: { line: 3, ch: 3 },
    });

    const list = parser.parse(editor as any);

    expect(list).toBeDefined();
    expect(list.print()).toBe("- three\n- four");
  });

  test("should error if indent is not match 1", () => {
    const logger = makeLogger();
    const parser = makeParser({ logger });
    const editor = makeEditor({
      text: "- one\n  - two\n\t- three",
      cursor: { line: 0, ch: 0 },
    });

    const list = parser.parse(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toHaveBeenCalledWith(
      "parseList",
      `Unable to parse list: expected indent "S", got "T"`,
    );
  });

  test("should error if indent is not match 2", () => {
    const logger = makeLogger();
    const parser = makeParser({ logger });
    const editor = makeEditor({
      text: "- one\n\t- two\n  - three",
      cursor: { line: 0, ch: 0 },
    });

    const list = parser.parse(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toHaveBeenCalledWith(
      "parseList",
      `Unable to parse list: expected indent "T", got "S"`,
    );
  });

  test("should error if note indent is not match", () => {
    const logger = makeLogger();
    const parser = makeParser({ logger });
    const editor = makeEditor({
      text: "- one\n\t- two\n  three",
      cursor: { line: 0, ch: 0 },
    });

    const list = parser.parse(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toHaveBeenCalledWith(
      "parseList",
      `Unable to parse list: expected indent "T", got "SS"`,
    );
  });

  test("should exclude an unrepresentable trailing tab (#368)", () => {
    const logger = makeLogger();
    const parser = makeParser({ logger });
    const editor = makeEditor({
      text: "- one\n\t- two\n\t\n",
      cursor: { line: 0, ch: 0 },
    });

    const list = parser.parse(editor as any);

    expect(logger.log).not.toHaveBeenCalled();
    expect(list.print()).toBe("- one\n\t- two");
    expect(list.getContentEnd()).toEqual({ line: 1, ch: 6 });
    expect(parser.parse(editor, { line: 2, ch: 1 })).toBeNull();
  });
});
