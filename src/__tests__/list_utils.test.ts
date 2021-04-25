import { ListUtils } from "../list_utils";
import { Logger } from "../logger";
import { ObsidianUtils } from "../obsidian_utils";
import { makeEditor, makeLogger, makeObsidianUtils } from "../test_utils";

export function makeListUtils(
  options: { logger?: Logger; obsidianUtils?: ObsidianUtils } = {}
) {
  const { logger, obsidianUtils } = {
    logger: makeLogger(),
    obsidianUtils: makeObsidianUtils(),
    ...options,
  };

  const listUtils = new ListUtils(logger, obsidianUtils);

  return listUtils;
}

describe("parseListNew", () => {
  test("should parse list with notes and sublists", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "- one\n  side\n\t- two\n\t\t- three\n\t- four",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseListNew(editor as any);

    expect(list).toBeDefined();
    expect(list).toMatchObject(
      expect.objectContaining({
        rootList: expect.objectContaining({
          children: [
            expect.objectContaining({
              indent: "",
              bullet: "-",
              content: "one\n  side",
              children: [
                expect.objectContaining({
                  indent: "\t",
                  bullet: "-",
                  content: "two",
                  children: [
                    expect.objectContaining({
                      indent: "\t\t",
                      bullet: "-",
                      content: "three",
                    }),
                  ],
                }),
                expect.objectContaining({
                  indent: "\t",
                  bullet: "-",
                  content: "four",
                }),
              ],
            }),
          ],
        }),
      })
    );
    expect(list.print()).toBe("- one\n  side\n\t- two\n\t\t- three\n\t- four");
  });

  test("should error if indent is not match 1", () => {
    const logger = makeLogger();
    const listUtils = makeListUtils({ logger });
    const editor = makeEditor({
      text: "- one\n  - two\n\t- three",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseListNew(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toBeCalledWith(
      "parseListNew",
      `Unable to parse list: expected indent "S", got "T"`
    );
  });

  test("should error if indent is not match 2", () => {
    const logger = makeLogger();
    const listUtils = makeListUtils({ logger });
    const editor = makeEditor({
      text: "- one\n\t- two\n  - three",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseListNew(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toBeCalledWith(
      "parseListNew",
      `Unable to parse list: expected indent "T", got "S"`
    );
  });
});

describe("parseList", () => {
  test("should parse list with dash bullet", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "- qwe",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseList(editor as any);

    expect(list).toBeDefined();
    expect(list.print()).toBe(`- qwe`);
  });

  test("should parse list with asterisk bullet", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "* qwe",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseList(editor as any);

    expect(list).toBeDefined();
    expect(list.print()).toBe(`* qwe`);
  });

  test("should parse list with plus bullet", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "+ qwe",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseList(editor as any);

    expect(list).toBeDefined();
    expect(list.print()).toBe(`+ qwe`);
  });
});

describe("detectListIndentSign", () => {
  test("should detect default (tab) on single list item", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: true, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- qwe",
      cursor: { line: 0, ch: 0 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("\t");
  });

  test("should detect default (spaces) on single list item", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: false, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- qwe",
      cursor: { line: 0, ch: 0 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("    ");
  });

  test("should detect spaces looking forward", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "- one\n  - two",
      cursor: { line: 0, ch: 0 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect spaces looking backward", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "- one\n  - two",
      cursor: { line: 1, ch: 0 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect when cursor on note", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: false, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- qwe\n  - qwe\n    qwe\n    qwe\n  - qwe",
      cursor: { line: 3, ch: 4 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect spaces looking forward skipping notes", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: false, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- qwe\n  qwe\n  qwe\n  - qwe",
      cursor: { line: 0, ch: 4 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect spaces looking backward skipping notes", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: false, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- qwe\n  qwe\n  qwe\n  - qwe",
      cursor: { line: 3, ch: 4 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should not detect if list breaks with other content", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: false, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- one\n  - two\n\ntext\n  some",
      cursor: { line: 4, ch: 4 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBeNull();
  });

  test("should detect when cursor on note and blank lines", () => {
    const obsidianUtils = makeObsidianUtils({ useTab: false, tabSize: 4 });
    const listUtils = makeListUtils({ obsidianUtils });
    const editor = makeEditor({
      text: "- one\n  - two\n\n    some",
      cursor: { line: 3, ch: 4 },
    });

    const indentSign = (listUtils as any).detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });
});
