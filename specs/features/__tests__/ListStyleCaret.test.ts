const ListStyleCaret = require("../../../jest/list-style-caret");

describe("List style painted caret (#371), native regression", () => {
  let probe: any;
  const text = "- First item in a bulleted list\n- Second item";
  const variants = [
    { source: false, font: 16, stick: "bullet-and-checkbox" },
    { source: true, font: 16, stick: "never" },
    // Obsidian 1.15's appearance API clamps the maximum text size to 30px.
    { source: false, font: 30, stick: "never" },
    { source: true, font: 30, stick: "bullet-and-checkbox" },
  ];

  afterEach(async () => {
    try {
      await probe?.restore();
    } finally {
      probe?.close();
      probe = null;
    }
  });

  for (const variant of variants) {
    for (const styled of [false, true]) {
      const label = `${variant.source ? "source" : "live"}-${variant.font}-${variant.stick}-styles${styled ? "ON" : "OFF"}`;
      test(
        label,
        async () => {
          probe = new ListStyleCaret();
          await probe.connect();
          await probe.prepare(variant);
          await resetSettings();
          await setSetting({ k: "styleLists", v: styled });
          await setSetting({ k: "stickCursor", v: variant.stick });
          await applyState([
            "- First item in |a bulleted list",
            "- Second item",
          ]);
          await probe.settle(styled, variant.font);
          await probe.clickContent();
          const before = await probe.geometry();
          expect(before.cursor.line).toBe(0);
          expect(before.cursor.ch).toBeGreaterThan(5);
          expect(before.font).toBe(`${variant.font}px`);
          expect(before.source).toBe(variant.source);
          expect(before.vim).toBe(false);
          expect(before.styled).toBe(styled);

          await probe.key("Home");
          const home = await probe.paintedCaret(label + "-home");
          expect(home.cursor).toEqual({ line: 0, ch: 2 });
          expect(home.focused).toBe(true);
          expect(home.events).toContainEqual({ key: "Home", trusted: true });

          // Historical margin-on-inner-bullet workarounds jump when the marker
          // switches to raw Markdown (especially with sticking disabled).
          await probe.key("Home");
          const second = await probe.geometry();
          expect(second.cursor).toEqual({
            line: 0,
            ch: variant.stick === "never" ? 0 : 2,
          });
          await probe.clickContent();
          const clicked = await probe.geometry();
          for (let i = clicked.cursor.ch; i > 2; i--)
            await probe.key("ArrowLeft");
          const left = await probe.paintedCaret(label + "-left");
          expect(left.cursor).toEqual({ line: 0, ch: 2 });
          for (const observation of [before, home, second, left]) {
            expect(observation.value).toBe(text);
            expect(Math.abs(observation.first.x - before.first.x)).toBeLessThan(
              1,
            );
          }
          const current = await getCurrentState();
          expect(current.value).toBe(text);
          expect(current.selections).toEqual([
            { anchor: { line: 0, ch: 2 }, head: { line: 0, ch: 2 } },
          ]);

          // Do not replace this with cm.coordsAtPos/DOM selection or a computed
          // margin assertion: all can report a correct caret while native paint
          // is left of the first content glyph. Allow only raster rounding.
          for (const observation of [home, left]) {
            expect(
              Math.abs(observation.caretX - observation.first.x),
            ).toBeLessThan(1.5);
          }
        },
        20000,
      );
    }
  }
});
