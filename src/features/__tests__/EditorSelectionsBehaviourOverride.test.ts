import {
  getTrackedNavigationKey,
  shouldSkipSelectionAdjustmentsForKeydown,
} from "../EditorSelectionsBehaviourOverride";

jest.mock(
  "obsidian",
  () => ({
    Editor: class {},
    editorInfoField: {},
    Plugin: class {},
  }),
  { virtual: true },
);

describe("getTrackedNavigationKey", () => {
  test("should track plain ArrowUp and ArrowDown", () => {
    expect(
      getTrackedNavigationKey({
        key: "ArrowUp",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("ArrowUp");

    expect(
      getTrackedNavigationKey({
        key: "ArrowDown",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("ArrowDown");
  });

  test("should track Vim j/k navigation keys", () => {
    expect(
      getTrackedNavigationKey({
        key: "j",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("ArrowDown");

    expect(
      getTrackedNavigationKey({
        key: "k",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("ArrowUp");
  });

  test("should ignore modified vertical navigation keys", () => {
    expect(
      getTrackedNavigationKey({
        key: "ArrowUp",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
      } as KeyboardEvent),
    ).toBeNull();

    expect(
      getTrackedNavigationKey({
        key: "ArrowDown",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBeNull();

    expect(
      getTrackedNavigationKey({
        key: "ArrowDown",
        altKey: true,
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBeNull();
  });

  test("should skip selection adjustments only for modified vertical navigation", () => {
    expect(
      shouldSkipSelectionAdjustmentsForKeydown({
        key: "ArrowUp",
        altKey: false,
        ctrlKey: false,
        metaKey: true,
      } as KeyboardEvent),
    ).toBe(true);

    expect(
      shouldSkipSelectionAdjustmentsForKeydown({
        key: "ArrowDown",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);

    expect(
      shouldSkipSelectionAdjustmentsForKeydown({
        key: "ArrowUp",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(false);

    expect(
      shouldSkipSelectionAdjustmentsForKeydown({
        key: "ArrowLeft",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(false);
  });
});
