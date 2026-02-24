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

  test("should parse list with tab just after the list", () => {
    const logger = makeLogger();
    const parser = makeParser({ logger });
    const editor = makeEditor({
      text: "- one\n\t- two\n\t\n",
      cursor: { line: 0, ch: 0 },
    });

    const list = parser.parse(editor as any);

    expect(logger.log).not.toHaveBeenCalled();
    expect(list).toBeTruthy();
  });
});
