import { DragAndDrop } from "../DragAndDrop";

const mockNotice = jest.fn();
const mockGetEditorFromState = jest.fn();

jest.mock(
  "obsidian",
  () => ({
    Notice: class Notice {
      constructor(...args: unknown[]) {
        mockNotice(...args);
      }
    },
    Platform: { isMobile: false },
    Plugin: class Plugin {},
  }),
  { virtual: true },
);

jest.mock(
  "../../editor",
  () => ({
    getEditorFromState: (...args: unknown[]) => mockGetEditorFromState(...args),
  }),
  { virtual: true },
);

describe("DragAndDrop", () => {
  test("should stop dragging and show a notice when the list cannot be parsed", () => {
    const editor = {
      offsetToPos: jest.fn().mockReturnValue({ line: 2, ch: 0 }),
    };
    mockGetEditorFromState.mockReturnValue(editor);

    const feature = new DragAndDrop(
      {} as never,
      { dragAndDrop: true } as never,
      {} as never,
      { parse: jest.fn().mockReturnValue(null) } as never,
      {} as never,
    );

    (feature as unknown as { preStart: unknown }).preStart = {
      x: 10,
      y: 20,
      view: {
        state: {},
        posAtCoords: jest.fn().mockReturnValue(4),
      },
    };

    (
      feature as unknown as {
        startDragging: () => void;
      }
    ).startDragging();

    expect(mockNotice).toHaveBeenCalledWith(
      "The item cannot be moved. Fix the invalid list indentation and try again.",
      5000,
    );
    expect((feature as unknown as { state: unknown }).state).toBeNull();
  });
});
