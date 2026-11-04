/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeEditor, makeLogger, makeSettings } from "../../__mocks__";
import { getEditorFromState } from "../../editor";
import { Parser } from "../../services/Parser";
import { VerticalLines } from "../VerticalLines";

jest.mock("obsidian", () => ({}), { virtual: true });
jest.mock("../../editor", () => ({ getEditorFromState: jest.fn() }));

// Only the DOM surface used by VerticalLines; layout is supplied by the view.
function makeElement(): any {
  return {
    children: [],
    style: {},
    dataset: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: () => false,
    },
    offsetTop: 24,
    offsetLeft: 0,
    clientHeight: 200,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild(child: any) {
      this.children.push(child);
      child.parentElement = this;
    },
    removeChild(child: any) {
      this.children.splice(this.children.indexOf(child), 1);
    },
    get firstElementChild() {
      return this.children[0];
    },
  };
}

async function prepareLines() {
  const text = "- first\n  - nested\n    - leaf\n- second\n  - sibling leaf";
  const lines = text.split("\n");
  const offsets = lines.map((_, i) =>
    lines.slice(0, i).reduce((sum, line) => sum + line.length + 1, 0),
  );
  const editor = Object.assign(
    makeEditor({ text, cursor: { line: 0, ch: 0 } }),
    {
      posToOffset: ({ line, ch }: { line: number; ch: number }) =>
        offsets[line] + ch,
      offsetToPos: (offset: number) => {
        const line = offsets.findLastIndex((start) => start <= offset);
        return { line, ch: offset - offsets[line] };
      },
      getZoomRange: (): null => null,
    },
  );
  jest.mocked(getEditorFromState).mockReturnValue(editor as any);
  const settings = Object.assign(makeSettings(), {
    verticalLines: true,
    onChange: jest.fn(),
    removeCallback: jest.fn(),
  });
  const plugin = { registerEditorExtension: jest.fn() };
  const feature = new VerticalLines(
    plugin as any,
    settings,
    { isDefaultThemeEnabled: () => true } as any,
    new Parser(makeLogger(), settings),
  );
  await feature.load();

  const sizer = makeElement();
  const contentContainer = makeElement();
  const contentDOM = makeElement();
  sizer.appendChild(contentContainer);
  contentContainer.appendChild(contentDOM);
  contentDOM.appendChild(makeElement());
  const view = {
    state: {},
    dom: makeElement(),
    scrollDOM: makeElement(),
    contentDOM,
    viewport: { from: 0, to: text.length },
    viewportLineBlocks: [{}],
    visibleRanges: [{ from: 0, to: text.length }],
    coordsAtPos: jest.fn((offset: number): any => {
      const { ch } = editor.offsetToPos(offset);
      return { left: 100 + ch * 8, right: 100 + ch * 8 };
    }),
    lineBlockAt: (offset: number) => {
      const { line } = editor.offsetToPos(offset);
      return { top: line * 20, bottom: (line + 1) * 20 };
    },
  };
  const extension = plugin.registerEditorExtension.mock.calls[0][0];
  const value = extension.create(view);
  const container = view.dom.children[0].children[0];
  const visibleLines = () =>
    container.children.filter((line: any) => line.style.display === "block");
  const redraw = (update: object = { geometryChanged: true }) => {
    value.update(update);
    jest.advanceTimersByTime(0);
  };
  const destroy = async () => {
    value.destroy();
    await feature.unload();
  };

  return { view, value, offsets, visibleLines, redraw, destroy };
}

describe("vertical lines tolerate unavailable coordinates (#601)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as any).window = globalThis;
    (globalThis as any).document = {
      createElement: makeElement,
      body: makeElement(),
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    jest.clearAllMocks();
  });

  test("null at an offscreen ancestor skips its subtree but not a measurable sibling", async () => {
    const test = await prepareLines();
    // The parser includes the ancestor above the viewport's first line.
    test.view.viewport.from = test.offsets[1];
    test.view.visibleRanges[0].from = test.offsets[1];
    test.view.coordsAtPos.mockReturnValueOnce(null);

    expect(() => jest.advanceTimersByTime(0)).not.toThrow();
    expect(test.view.coordsAtPos.mock.calls.map(([offset]) => offset)).toEqual([
      0,
      test.offsets[3],
    ]);
    expect(test.visibleLines().map((line: any) => line.style.left)).toEqual([
      "0px",
    ]);
    expect(test.visibleLines()[0].style.height).toBe("calc(40px - 2em)");
    // No retry timer is added for the skipped subtree (only the body interval).
    expect(jest.getTimerCount()).toBe(1);
    await test.destroy();
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each(["viewportChanged", "geometryChanged"])(
    "restores actual line elements on %s when coordinates become available",
    async (reason) => {
      const test = await prepareLines();
      jest.advanceTimersByTime(0);
      expect(test.visibleLines().map((line: any) => line.style.left)).toEqual([
        "0px",
        "16px",
        "0px",
      ]);

      test.view.coordsAtPos.mockReturnValueOnce(null);
      expect(() => test.redraw({ [reason]: true })).not.toThrow();
      expect(test.visibleLines()).toHaveLength(1);

      test.redraw({ [reason]: true });
      expect(test.visibleLines().map((line: any) => line.style.left)).toEqual([
        "0px",
        "16px",
        "0px",
      ]);
      expect(test.visibleLines().every((line: any) => line.style.height)).toBe(
        true,
      );
      await test.destroy();
    },
  );

  test("null at a nested item preserves the other lines and their alignment", async () => {
    const test = await prepareLines();
    const measure = test.view.coordsAtPos.getMockImplementation();
    test.view.coordsAtPos.mockImplementation((offset: number) =>
      offset === test.offsets[1] + 2 ? null : measure(offset),
    );
    expect(() => jest.advanceTimersByTime(0)).not.toThrow();
    expect(test.visibleLines().map((line: any) => line.style.left)).toEqual([
      "0px",
      "0px",
    ]);
    test.view.coordsAtPos.mockImplementation(measure);
    test.redraw();
    expect(test.visibleLines().map((line: any) => line.style.left)).toEqual([
      "0px",
      "16px",
      "0px",
    ]);
    await test.destroy();
  });

  test("all null coordinates leave no visible lines and a later update restores them", async () => {
    const test = await prepareLines();
    const measure = test.view.coordsAtPos.getMockImplementation();
    test.view.coordsAtPos.mockReturnValue(null);
    expect(() => jest.advanceTimersByTime(0)).not.toThrow();
    expect(test.visibleLines()).toHaveLength(0);
    test.view.coordsAtPos.mockImplementation(measure);
    test.redraw();
    expect(test.visibleLines()).toHaveLength(3);
    await test.destroy();
  });
});
