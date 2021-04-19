import { ListUtils } from "../list_utils";

interface EditorMockParams {
  text: string;
  cursor: { line: number; ch: number };
}

function makeEditor(params: EditorMockParams) {
  let text = params.text;
  let cursor = { ...params.cursor };

  const editor = {
    getCursor: () => cursor,
    getLine: (l: number) => text.split("\n")[l],
    lastLine: () => text.split("\n").length - 1,
    lineCount: () => text.split("\n").length,
    isFolded: (l: number) => false,
  };

  return editor;
}

function makeListUtils() {
  const logger: any = {
    bind: jest.fn().mockReturnValue(jest.fn()),
  };
  const obsidianUtils: any = {
    getObsidianTabsSettigns: jest
      .fn()
      .mockReturnValue({ useTab: true, tabSize: 4 }),
  };

  const listUtils = new ListUtils(logger, obsidianUtils);

  return listUtils;
}

test("parse list with dash bullet", () => {
  const listUtils = makeListUtils();
  const editor = makeEditor({
    text: "- qwe",
    cursor: { line: 0, ch: 0 },
  });

  const list = listUtils.parseList(editor as any);

  expect(list).toBeDefined();
  expect(list.print()).toBe(`- qwe`);
});

test("parse list with asterisk bullet", () => {
  const listUtils = makeListUtils();
  const editor = makeEditor({
    text: "* qwe",
    cursor: { line: 0, ch: 0 },
  });

  const list = listUtils.parseList(editor as any);

  expect(list).toBeDefined();
  expect(list.print()).toBe(`* qwe`);
});

test("parse list with plus bullet", () => {
  const listUtils = makeListUtils();
  const editor = makeEditor({
    text: "+ qwe",
    cursor: { line: 0, ch: 0 },
  });

  const list = listUtils.parseList(editor as any);

  expect(list).toBeDefined();
  expect(list.print()).toBe(`+ qwe`);
});
