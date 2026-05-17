import { insertPlainLine } from "../../utils/insertPlainLine";

interface MockEditor {
  getCursor(): { line: number; ch: number };
  getLine(line: number): string;
  replaceRange: jest.Mock;
  setSelections: jest.Mock;
}

describe("insertPlainLine", () => {
  test("should insert a line below the current line", () => {
    const replaceRange = jest.fn();
    const setSelections = jest.fn();
    const editor: MockEditor = {
      getCursor: () => ({ line: 1, ch: 2 }),
      getLine: (line: number) => ["first", "second"][line],
      replaceRange,
      setSelections,
    };

    insertPlainLine(editor, true);

    expect(replaceRange).toHaveBeenCalledWith(
      "\n",
      { line: 1, ch: 6 },
      { line: 1, ch: 6 },
    );
    expect(setSelections).toHaveBeenCalledWith([
      {
        anchor: { line: 2, ch: 0 },
        head: { line: 2, ch: 0 },
      },
    ]);
  });

  test("should insert a line above the current line", () => {
    const replaceRange = jest.fn();
    const setSelections = jest.fn();
    const editor: MockEditor = {
      getCursor: () => ({ line: 1, ch: 4 }),
      getLine: (line: number) => ["first", "second"][line],
      replaceRange,
      setSelections,
    };

    insertPlainLine(editor, false);

    expect(replaceRange).toHaveBeenCalledWith(
      "\n",
      { line: 1, ch: 0 },
      { line: 1, ch: 0 },
    );
    expect(setSelections).toHaveBeenCalledWith([
      {
        anchor: { line: 1, ch: 0 },
        head: { line: 1, ch: 0 },
      },
    ]);
  });
});
