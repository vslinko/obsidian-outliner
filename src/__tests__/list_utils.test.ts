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

describe("parseList", () => {
  test("should parse list with notes and sublists", () => {
    const listUtils = makeListUtils();
    const editor = makeEditor({
      text: "- one\n  side\n\t- two\n\t\t- three\n\t- four",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseList(editor as any);

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

    const list = listUtils.parseList(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toBeCalledWith(
      "parseList",
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

    const list = listUtils.parseList(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toBeCalledWith(
      "parseList",
      `Unable to parse list: expected indent "T", got "S"`
    );
  });

  test("should error if note indent is not match", () => {
    const logger = makeLogger();
    const listUtils = makeListUtils({ logger });
    const editor = makeEditor({
      text: "- one\n\t- two\n  three",
      cursor: { line: 0, ch: 0 },
    });

    const list = listUtils.parseList(editor as any);

    expect(list).toBeNull();
    expect(logger.log).toBeCalledWith(
      "parseList",
      `Unable to parse list: expected indent "T", got "SS"`
    );
  });
});
