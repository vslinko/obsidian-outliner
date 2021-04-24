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
    firstLine: () => 0,
    lastLine: () => text.split("\n").length - 1,
    lineCount: () => text.split("\n").length,
    isFolded: (l: number) => false,
  };

  return editor;
}

function makeListUtils(options: { useTab?: boolean; tabSize?: number } = {}) {
  const { useTab, tabSize } = {
    useTab: true,
    tabSize: 4,
    ...options,
  };
  const logger: any = {
    bind: jest.fn().mockReturnValue(jest.fn()),
  };
  const obsidianUtils: any = {
    getObsidianTabsSettigns: jest.fn().mockReturnValue({ useTab, tabSize }),
  };

  const listUtils = new ListUtils(logger, obsidianUtils);

  return listUtils;
}

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
    const listUtils = makeListUtils({ useTab: true, tabSize: 4 });
    const editor = makeEditor({
      text: "- qwe",
      cursor: { line: 0, ch: 0 },
    });

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("\t");
  });

  test("should detect default (spaces) on single list item", () => {
    const listUtils = makeListUtils({ useTab: false, tabSize: 4 });
    const editor = makeEditor({
      text: "- qwe",
      cursor: { line: 0, ch: 0 },
    });

    const indentSign = listUtils.detectListIndentSign(
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

    const indentSign = listUtils.detectListIndentSign(
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

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect when cursor on note", () => {
    const listUtils = makeListUtils({ useTab: false, tabSize: 4 });
    const editor = makeEditor({
      text: "- qwe\n  - qwe\n    qwe\n    qwe\n  - qwe",
      cursor: { line: 3, ch: 4 },
    });

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect spaces looking forward skipping notes", () => {
    const listUtils = makeListUtils({ useTab: false, tabSize: 4 });
    const editor = makeEditor({
      text: "- qwe\n  qwe\n  qwe\n  - qwe",
      cursor: { line: 0, ch: 4 },
    });

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should detect spaces looking backward skipping notes", () => {
    const listUtils = makeListUtils({ useTab: false, tabSize: 4 });
    const editor = makeEditor({
      text: "- qwe\n  qwe\n  qwe\n  - qwe",
      cursor: { line: 3, ch: 4 },
    });

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });

  test("should not detect if list breaks with other content", () => {
    const listUtils = makeListUtils({ useTab: false, tabSize: 4 });
    const editor = makeEditor({
      text: "- one\n  - two\n\ntext\n  some",
      cursor: { line: 4, ch: 4 },
    });

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBeNull();
  });

  test("should detect when cursor on note and blank lines", () => {
    const listUtils = makeListUtils({ useTab: false, tabSize: 4 });
    const editor = makeEditor({
      text: "- one\n  - two\n\n    some",
      cursor: { line: 3, ch: 4 },
    });

    const indentSign = listUtils.detectListIndentSign(
      editor as any,
      editor.getCursor()
    );

    expect(indentSign).toBe("  ");
  });
});
