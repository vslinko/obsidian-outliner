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
    Platform: { isMobile: false, isDesktop: true },
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeClassList() {
    const values = new Set<string>();

    return {
      add: jest.fn((value: string) => {
        values.add(value);
      }),
      remove: jest.fn((value: string) => {
        values.delete(value);
      }),
      contains: (value: string) => values.has(value),
    };
  }

  interface FakeElement {
    classList: {
      add: jest.Mock<void, [string]>;
      remove: jest.Mock<void, [string]>;
      contains: (value: string) => boolean;
    };
    style: Record<string, string>;
    children: unknown[];
    parentNode: unknown;
    appendChild: (child: unknown) => void;
    removeChild?: (child: unknown) => void;
  }

  function makeElement(): FakeElement {
    return {
      classList: makeClassList(),
      style: {},
      children: [],
      parentNode: null,
      appendChild(child: unknown) {
        this.children.push(child);
        (child as { parentNode: unknown }).parentNode = this;
      },
    };
  }

  function makeDocument() {
    const body = makeElement();
    const appended: unknown[] = [];
    const removed: unknown[] = [];

    body.appendChild = jest.fn((child: unknown) => {
      appended.push(child);
      (child as { parentNode: unknown }).parentNode = body;
    });
    body.removeChild = jest.fn((child: unknown) => {
      removed.push(child);
      (child as { parentNode: unknown }).parentNode = null;
    });

    return {
      body,
      createElement: jest.fn(() => makeElement()),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appended,
      removed,
    };
  }

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

  test("should create and remove drag-and-drop contexts for pop-out windows", () => {
    const settings = {
      dragAndDrop: true,
      onChange: jest.fn(),
      removeCallback: jest.fn(),
    };

    const feature = new DragAndDrop(
      {} as never,
      settings as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const popoutDocument = makeDocument();

    (
      feature as unknown as {
        addManagedDocument: (doc: unknown) => void;
        removeManagedDocument: (doc: unknown) => void;
      }
    ).addManagedDocument(popoutDocument);

    expect(popoutDocument.body.classList.contains("outliner-plugin-dnd")).toBe(
      true,
    );
    expect(popoutDocument.appended).toHaveLength(1);
    expect(popoutDocument.addEventListener).toHaveBeenCalledTimes(4);

    (
      feature as unknown as {
        removeManagedDocument: (doc: unknown) => void;
      }
    ).removeManagedDocument(popoutDocument);

    expect(popoutDocument.removed).toHaveLength(1);
    expect(popoutDocument.removeEventListener).toHaveBeenCalledTimes(4);
  });

  test("should update the drag-and-drop body class across all managed documents", () => {
    const settings = {
      dragAndDrop: true,
      onChange: jest.fn(),
      removeCallback: jest.fn(),
    };

    const feature = new DragAndDrop(
      {} as never,
      settings as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const mainDocument = makeDocument();
    const popoutDocument = makeDocument();

    (
      feature as unknown as {
        addManagedDocument: (doc: unknown) => void;
      }
    ).addManagedDocument(mainDocument);
    (
      feature as unknown as {
        addManagedDocument: (doc: unknown) => void;
      }
    ).addManagedDocument(popoutDocument);

    settings.dragAndDrop = false;
    (
      feature as unknown as {
        handleSettingsChange: () => void;
      }
    ).handleSettingsChange();

    expect(
      mainDocument.body.classList.contains("outliner-plugin-dnd"),
    ).toBe(false);
    expect(
      popoutDocument.body.classList.contains("outliner-plugin-dnd"),
    ).toBe(false);
  });
});
