import { getDragAndDropLeftPadding } from "../dragAndDropMeasurements";

describe("getDragAndDropLeftPadding", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("uses the scroller padding when no code mirror line is rendered", () => {
    const scroller = {
      getBoundingClientRect: jest.fn().mockReturnValue({ left: 120 }),
    };
    const dom = {
      querySelector: jest.fn().mockImplementation((selector: string) => {
        if (selector === "div.cm-line") {
          return null;
        }

        return selector === "div.cm-scroller" ? scroller : null;
      }),
    };

    const getComputedStyle = jest.fn().mockReturnValue({ paddingLeft: "24px" });
    Object.defineProperty(global, "window", {
      configurable: true,
      value: { getComputedStyle },
    });

    expect(getDragAndDropLeftPadding({ dom })).toBe(144);
  });

  test("falls back to the first rendered line when the scroller is unavailable", () => {
    const line = {
      getBoundingClientRect: jest.fn().mockReturnValue({ left: 88 }),
    };
    const dom = {
      querySelector: jest.fn().mockImplementation((selector: string) => {
        if (selector === "div.cm-scroller") {
          return null;
        }

        return selector === "div.cm-line" ? line : null;
      }),
    };

    expect(getDragAndDropLeftPadding({ dom })).toBe(88);
  });

  test("prefers the rendered line position when both measurements exist", () => {
    const line = {
      getBoundingClientRect: jest.fn().mockReturnValue({ left: 88 }),
    };
    const scroller = {
      getBoundingClientRect: jest.fn().mockReturnValue({ left: 120 }),
    };
    const dom = {
      querySelector: jest.fn().mockImplementation((selector: string) => {
        if (selector === "div.cm-line") {
          return line;
        }

        return selector === "div.cm-scroller" ? scroller : null;
      }),
    };

    const getComputedStyle = jest.fn().mockReturnValue({ paddingLeft: "24px" });
    Object.defineProperty(global, "window", {
      configurable: true,
      value: { getComputedStyle },
    });

    expect(getDragAndDropLeftPadding({ dom })).toBe(88);
  });
});
