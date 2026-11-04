/* eslint-disable @typescript-eslint/no-explicit-any */
import { EditorState } from "@codemirror/state";

import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { getEditorFromState } from "../../editor";
import { Parser } from "../../services/Parser";
import { DragAndDrop } from "../DragAndDrop";

jest.mock("obsidian", () => ({ Notice: jest.fn() }), { virtual: true });
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
    body: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    },
  };
  const context = {
    document,
    dropZone: { style: { display: "none" } },
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
  const feature = new DragAndDrop(
    {} as any,
    {} as any,
    { getDefaultIndentChars: () => "  " } as any,
    parser as any,
    performer as any,
  ) as any;
  feature.contextsByDocument.set(document, context);

  function start() {
    feature.preStart = { x: 10, y: 10, view, document };
    feature.startDragging();
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
    feature.handleMouseUp({ target: document });
    expect(performer.eval).toHaveBeenCalledTimes(1);
    expect(feature.state).toBeNull();
    expect(feature.preStart).toBeNull();
    expect(classes.has("outliner-plugin-dragging")).toBe(false);
    expect(context.dropZone.style.display).toBe("none");
  }

  return {
    start,
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
      drag.feature.handleMouseUp({ target: drag.document });
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
