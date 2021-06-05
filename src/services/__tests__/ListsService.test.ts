import { ListsService } from "../ListsService";
import { LoggerService } from "../LoggerService";
import { ObsidianService } from "../ObsidianService";
import {
  makeEditor,
  makeLoggerService,
  makeObsidianService,
} from "../../__mocks__";

export function makeListsService(
  options: {
    loggerService?: LoggerService;
    obsidianService?: ObsidianService;
  } = {}
) {
  const { loggerService, obsidianService } = {
    loggerService: makeLoggerService(),
    obsidianService: makeObsidianService(),
    ...options,
  };

  const listsService = new ListsService(loggerService, obsidianService);

  return listsService;
}

describe("parseList", () => {
  test("should parse list with notes and sublists", () => {
    const listsService = makeListsService();
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

    const list = listsService.parseList(editor as any);

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
      })
    );
    expect(list.print()).toBe(
      "- one\n  side\n\t- two\n\t\t- three\n\t\t\tnote\n\t- four"
    );
  });

  test("should parse second list", () => {
    const listsService = makeListsService();
    const editor = makeEditor({
      text: `
- one
- two

- three
- four
`.trim(),
      cursor: { line: 3, ch: 3 },
    });

    const list = listsService.parseList(editor as any);

    expect(list).toBeDefined();
    expect(list.print()).toBe("- three\n- four");
  });

  test("should error if indent is not match 1", () => {
    const loggerService = makeLoggerService();
    const listsService = makeListsService({ loggerService });
    const editor = makeEditor({
      text: "- one\n  - two\n\t- three",
      cursor: { line: 0, ch: 0 },
    });

    const list = listsService.parseList(editor as any);

    expect(list).toBeNull();
    expect(loggerService.log).toBeCalledWith(
      "parseList",
      `Unable to parse list: expected indent "S", got "T"`
    );
  });

  test("should error if indent is not match 2", () => {
    const loggerService = makeLoggerService();
    const listsService = makeListsService({ loggerService });
    const editor = makeEditor({
      text: "- one\n\t- two\n  - three",
      cursor: { line: 0, ch: 0 },
    });

    const list = listsService.parseList(editor as any);

    expect(list).toBeNull();
    expect(loggerService.log).toBeCalledWith(
      "parseList",
      `Unable to parse list: expected indent "T", got "S"`
    );
  });

  test("should error if note indent is not match", () => {
    const loggerService = makeLoggerService();
    const listsService = makeListsService({ loggerService });
    const editor = makeEditor({
      text: "- one\n\t- two\n  three",
      cursor: { line: 0, ch: 0 },
    });

    const list = listsService.parseList(editor as any);

    expect(list).toBeNull();
    expect(loggerService.log).toBeCalledWith(
      "parseList",
      `Unable to parse list: expected indent "T", got "SS"`
    );
  });
});
