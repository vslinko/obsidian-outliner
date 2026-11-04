/* eslint-disable @typescript-eslint/no-explicit-any */
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { getEditorFromState } from "../../editor";
import { Parser } from "../../services/Parser";
import { DragAndDrop } from "../DragAndDrop";

jest.mock(
  "obsidian",
  () => ({ Notice: jest.fn(), Platform: { isDesktop: true } }),
  { virtual: true },
);
jest.mock("../../editor", () => ({ getEditorFromState: jest.fn() }));

function prepareDrag() {
  const text = "- one\n- two";
  const reader = makeEditor({ text, cursor: { line: 0, ch: 0 } });
  const editor = Object.assign(reader, {
    offsetToPos: jest.fn(() => ({ line: 0, ch: 0 })),
    posToOffset: (pos: { line: number; ch: number }) =>
      (pos.line === 0 ? 0 : 6) + pos.ch,
  });
  jest.mocked(getEditorFromState).mockReturnValue(editor as any);
  const realParser = new Parser(makeLogger(), makeSettings());
  const root = realParser.parse(editor);
  const lookup = jest.spyOn(root, "getListUnderLine");
  const parser = { parse: jest.fn(() => root) };
  const classes = new Set<string>();
  const document = {
    nodeType: 9,
    defaultView: {
      setTimeout: jest.fn((callback: () => void, delay: number) =>
        setTimeout(callback, delay),
      ),
      clearTimeout: jest.fn((timer: ReturnType<typeof setTimeout>) =>
        clearTimeout(timer),
      ),
      removeEventListener: jest.fn(),
    },
    removeEventListener: jest.fn(),
    body: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    },
  };
  const context = {
    document,
    dropZone: { style: { display: "none" }, remove: jest.fn() },
  };
  const view = {
    state: EditorState.create({ doc: text }),
    dom: {
      ownerDocument: document,
      querySelector: (selector: string) =>
        selector === "div.cm-line"
          ? { getBoundingClientRect: () => ({ left: 0 }) }
          : null,
    },
    defaultCharacterWidth: 8,
    posAtCoords: jest.fn((): number | null => 0),
    dispatch: jest.fn(),
  };
  const performer = { eval: jest.fn() };
  const settings = { dragAndDrop: true, removeCallback: jest.fn() };
  const feature = new DragAndDrop(
    {} as any,
    settings as any,
    { getDefaultIndentChars: () => "  " } as any,
    parser as any,
    performer as any,
  ) as any;
  feature.contextsByDocument.set(document, context);

  function start() {
    feature.preStart = { x: 10, y: 10, view, document };
    feature.startDragging();
  }

  function press() {
    jest.spyOn(EditorView, "findFromDOM").mockReturnValue(view as any);
    feature.handleMouseDown({
      target: {
        ownerDocument: document,
        classList: { contains: (name: string) => name === "cm-editor" },
        hasAttribute: (name: string) => name === "data-outliner-drag-handle",
      },
      button: 0,
      clientX: 10,
      clientY: 10,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    });
  }

  function release(target = document, button = 0) {
    feature.handleMouseUp({ target, button });
  }

  function click(overrides: Record<string, unknown> = {}) {
    const event = {
      target: document,
      button: 0,
      detail: 1,
      isTrusted: true,
      preventDefault: jest.fn(),
      stopImmediatePropagation: jest.fn(),
      ...overrides,
    };
    feature.handleClick(event);
    return event;
  }

  function expectClean() {
    expect(feature.preStart).toBeNull();
    expect(feature.state).toBeNull();
    expect(classes.has("outliner-plugin-dragging")).toBe(false);
    expect(context.dropZone.style.display).toBe("none");
    expect(performer.eval).not.toHaveBeenCalled();
  }

  function expectSuccessfulRetry() {
    start();
    expect(feature.preStart).toBeNull();
    expect(feature.state).not.toBeNull();
    expect(feature.state.context).toBe(context);
    expect(classes.has("outliner-plugin-dragging")).toBe(true);
    expect(view.dispatch).toHaveBeenCalled();
    // Exercise the real stop/apply path after a fresh, accepted gesture.
    feature.state.dropVariant = feature.state
      .getDropVariants()
      .find((variant: any) => variant.placeToMove !== feature.state.list);
    release();
    expect(performer.eval).toHaveBeenCalledTimes(1);
    expect(feature.state).toBeNull();
    expect(feature.preStart).toBeNull();
    expect(classes.has("outliner-plugin-dragging")).toBe(false);
    expect(context.dropZone.style.display).toBe("none");
  }

  return {
    start,
    press,
    release,
    click,
    settings,
    expectClean,
    expectSuccessfulRetry,
    feature,
    view,
    editor,
    parser,
    lookup,
    document,
  };
}

describe("drag start rejects invalid positions (#604)", () => {
  test.each(["offset", "root", "list null", "list undefined"])(
    "ignores %s, does not revive on move/up, and accepts a new gesture",
    (invalid) => {
      const drag = prepareDrag();
      if (invalid === "offset") {
        drag.view.posAtCoords.mockReturnValueOnce(null);
      } else if (invalid === "root") {
        drag.parser.parse.mockReturnValueOnce(null);
      } else {
        drag.lookup.mockReturnValueOnce(
          invalid === "list null" ? null : undefined,
        );
      }

      expect(drag.start).not.toThrow();
      drag.expectClean();
      expect(drag.view.dispatch).not.toHaveBeenCalled();
      if (invalid === "offset") {
        expect(drag.editor.offsetToPos).not.toHaveBeenCalled();
        expect(drag.parser.parse).not.toHaveBeenCalled();
      }
      if (invalid === "offset" || invalid === "root") {
        expect(drag.lookup).not.toHaveBeenCalled();
      }
      // A later mouse move and release cannot resurrect the rejected gesture.
      drag.feature.handleMouseMove({ target: drag.document, buttons: 1 });
      drag.release();
      const click = drag.click();
      expect(click.preventDefault).not.toHaveBeenCalled();
      expect(click.stopImmediatePropagation).not.toHaveBeenCalled();
      drag.expectClean();
      expect(drag.view.dispatch).not.toHaveBeenCalled();
      drag.expectSuccessfulRetry();
    },
  );

  test("offset zero is a valid position and permits a completed gesture", () => {
    const drag = prepareDrag();
    drag.expectSuccessfulRetry();
    expect(drag.editor.offsetToPos).toHaveBeenCalledWith(0);
    expect(drag.parser.parse).toHaveBeenCalled();
  });
});

describe("click delivery after a drag gesture (#631)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  type ClickEvent = ReturnType<ReturnType<typeof prepareDrag>["click"]>;

  function expectDelivered(event: ClickEvent) {
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
  }

  function expectSuppressed(event: ClickEvent) {
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopImmediatePropagation).toHaveBeenCalledTimes(1);
  }

  test("a handle press and release without movement keeps its normal click", () => {
    const drag = prepareDrag();
    drag.press();
    expect(drag.feature.preStart).not.toBeNull();
    drag.release();
    expectDelivered(drag.click());
    drag.expectClean();
    expect(jest.getTimerCount()).toBe(0);
  });

  test("only the first click after an accepted drag's release is suppressed", () => {
    const drag = prepareDrag();
    drag.start();
    drag.release();
    expect(jest.getTimerCount()).toBe(1);
    expectSuppressed(drag.click({ target: { ownerDocument: drag.document } }));
    expectDelivered(drag.click());
    expect(jest.getTimerCount()).toBe(0);
  });

  test("a click before the primary release is delivered without consuming suppression", () => {
    const drag = prepareDrag();
    drag.start();
    expectDelivered(drag.click());
    drag.release();
    expectSuppressed(drag.click());
  });

  test.each<[string, Record<string, unknown>]>([
    ["keyboard activation", { detail: 0 }],
    ["programmatic activation", { isTrusted: false }],
    ["non-primary click", { button: 1 }],
    ["another document", { target: { nodeType: 9 } }],
  ])(
    "delivers %s without consuming the pending pointer click",
    (_name, overrides) => {
      const drag = prepareDrag();
      drag.start();
      drag.release();
      expectDelivered(drag.click(overrides));
      expectSuppressed(drag.click());
    },
  );

  test.each(["another document", "non-primary button"])(
    "a release from %s does not arm click suppression",
    (release) => {
      const drag = prepareDrag();
      drag.start();
      if (release === "another document") {
        drag.release({ ...drag.document });
      } else {
        drag.release(drag.document, 2);
      }
      expectDelivered(drag.click());
    },
  );

  test("Escape cancels the move but still suppresses the click from its release", () => {
    const drag = prepareDrag();
    drag.start();
    drag.feature.handleKeyDown({ code: "Escape" });
    drag.expectClean();
    expectDelivered(drag.click());
    drag.release();
    expectSuppressed(drag.click());
    expectDelivered(drag.click());
    drag.expectClean();
  });

  test("blur after a lost mouseup leaves keyboard, other-window, and later clicks intact", () => {
    const drag = prepareDrag();
    drag.start();
    drag.feature.handleWindowBlur({ currentTarget: drag.document.defaultView });
    drag.expectClean();
    expectDelivered(drag.click({ detail: 0 }));
    expectDelivered(drag.click({ target: { nodeType: 9 } }));
    drag.release();
    expectDelivered(drag.click());
    expect(jest.getTimerCount()).toBe(0);
    drag.expectSuccessfulRetry();
    expectSuppressed(drag.click());
  });

  test("a release with no click expires before an unrelated later click", () => {
    const drag = prepareDrag();
    drag.start();
    drag.release();
    expect(jest.getTimerCount()).toBe(1);
    jest.runOnlyPendingTimers();
    expectDelivered(drag.click());
    expect(jest.getTimerCount()).toBe(0);
  });

  test("a new rejected gesture cannot inherit a previous drag's pending click", () => {
    const drag = prepareDrag();
    drag.start();
    drag.release();
    drag.press();
    expect(jest.getTimerCount()).toBe(0);
    drag.view.posAtCoords.mockReturnValueOnce(null);
    drag.feature.startDragging();
    drag.release();
    expectDelivered(drag.click());
    drag.expectClean();
  });

  test("a stale expiry callback cannot clear a rapid subsequent drag's click", () => {
    const drag = prepareDrag();
    drag.start();
    drag.release();
    const expirePreviousGesture =
      drag.document.defaultView.setTimeout.mock.calls[0][0];
    drag.press();
    expect(jest.getTimerCount()).toBe(0);
    drag.feature.startDragging();
    drag.release();
    expirePreviousGesture();
    expectSuppressed(drag.click());
    expectDelivered(drag.click());
    expect(jest.getTimerCount()).toBe(0);
  });

  async function cleanUp(drag: ReturnType<typeof prepareDrag>, reason: string) {
    switch (reason) {
      case "blur":
        drag.feature.handleWindowBlur({
          currentTarget: drag.document.defaultView,
        });
        break;
      case "disabled setting":
        drag.settings.dragAndDrop = false;
        drag.feature.handleSettingsChange();
        break;
      case "motion without a pressed button":
        drag.feature.handleMouseMove({ target: drag.document, buttons: 0 });
        break;
      case "source window unregister":
        drag.feature.unregisterDocument(drag.document);
        break;
      case "unload":
        await drag.feature.unload();
        break;
      default:
        throw new Error(`Unknown cleanup: ${reason}`);
    }
  }

  describe.each([
    "blur",
    "disabled setting",
    "motion without a pressed button",
    "source window unregister",
    "unload",
  ])("cleanup on %s", (reason) => {
    test("clears ownership even after Escape removed the active drag", async () => {
      const drag = prepareDrag();
      drag.start();
      drag.feature.handleKeyDown({ code: "Escape" });
      drag.expectClean();
      await cleanUp(drag, reason);
      drag.release();
      expectDelivered(drag.click());
      expect(jest.getTimerCount()).toBe(0);
      drag.expectClean();
    });

    test("clears a pending release timer and preserves later clicks", async () => {
      const drag = prepareDrag();
      drag.start();
      drag.release();
      expect(jest.getTimerCount()).toBe(1);
      await cleanUp(drag, reason);
      expect(jest.getTimerCount()).toBe(0);
      expectDelivered(drag.click());
      drag.expectClean();
    });
  });
});
