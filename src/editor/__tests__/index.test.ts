import { getEditorFromState, getFoldedLinesFromState } from "..";

jest.mock(
  "obsidian",
  () => ({
    Editor: class {},
    editorInfoField: {},
  }),
  { virtual: true },
);

jest.mock("@codemirror/language", () => ({
  foldEffect: { of: jest.fn() },
  foldable: jest.fn(),
  foldedRanges: jest.fn(() => ({
    iter: (): { value: null; from: number; next: jest.Mock } => ({
      value: null,
      from: 0,
      next: jest.fn(),
    }),
  })),
  unfoldEffect: { of: jest.fn() },
}));

describe("getEditorFromState", () => {
  test("returns null when editor info field is not initialized yet", () => {
    const state = {
      field: jest.fn().mockReturnValue(undefined),
    };

    expect(
      getEditorFromState(
        state as never,
      ),
    ).toBeNull();
  });
});

describe("getFoldedLinesFromState", () => {
  test("returns an empty array when editor info field is not initialized yet", () => {
    const state = {
      field: jest.fn().mockReturnValue(undefined),
    };

    expect(
      getFoldedLinesFromState(
        state as never,
      ),
    ).toEqual([]);
  });
});
