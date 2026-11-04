describe.each(["main", "popout"] as const)(
  "Drop after a cross-editor change in %s (#625)",
  (window) => {
    const initialState = ["- one", "  - two", "- |three"];
    const reorderedState = ["- |three", "- one", "  - two"];
    const notice =
      "The item cannot be moved. The page content changed during the move.";
    const contextCount = window === "popout" ? 2 : 1;

    async function startDrag() {
      await drag({ from: { line: 2, ch: 0 } });
      await move({
        to: { line: 0, ch: 0 },
        offsetX: 10,
        offsetY: -10,
      });
    }

    async function expectActive() {
      const snapshot = await getDragAndDropSnapshot();
      expect(snapshot).toMatchObject({
        active: true,
        pending: false,
        destinationSelected: true,
        source: window,
        contextCount,
      });
      expect(
        snapshot.documents.find((doc) => doc.window === window),
      ).toMatchObject({
        registered: true,
        enabled: true,
        dragging: true,
        dropZones: 1,
        visibleDropZones: 1,
      });
      return snapshot;
    }

    async function expectClean() {
      const snapshot = await getDragAndDropSnapshot();
      expect(snapshot).toMatchObject({
        active: false,
        pending: false,
        destinationSelected: false,
        source: null,
        contextCount,
      });
      expect(snapshot.documents.filter((doc) => doc.registered)).toHaveLength(
        contextCount,
      );
      for (const doc of snapshot.documents) {
        // The shared bridge also retains the last closed pop-out document for
        // leak checks; it must remain unregistered and free of DnD DOM.
        expect(doc).toMatchObject({
          enabled: doc.registered,
          dragging: false,
          dropZones: doc.registered ? 1 : 0,
          visibleDropZones: 0,
          draggingLines: 0,
          droppingLines: 0,
        });
      }
    }

    test.each([
      {
        name: "the source list was deleted (null root)",
        text: "The original list was deleted.\n\nOnly prose remains.",
        parsed: false,
      },
      {
        name: "spaces and tabs invalidate the source list (null root)",
        text: "- one\n  - two\n\t- mixed indentation\n- three",
        parsed: false,
      },
      {
        name: "the source root changed but still parses (control)",
        text: "- one (changed externally)\n  - two\n- three",
        parsed: true,
      },
    ])(
      "cancels safely when $name, then accepts a new valid drag",
      async ({ text, parsed }) => {
        await resetSettings();
        await setSetting({ k: "dnd", v: true });
        try {
          if (window === "popout") {
            expect(await openPopoutEditor()).toBe(true);
          }
          await applyState(initialState);
          expect(await openDropInvalidationEditor()).toBe(true);
          await expect(await getCurrentState()).toEqualEditorState(
            initialState,
          );
          await startDrag();
          const before = await expectActive();
          const source = before.documents.find((doc) => doc.window === window);
          expect(source?.draggingLines).toBeGreaterThan(0);
          expect(before.distinctDocuments).toBe(window === "popout");
          expect(await getDropInvalidationObservations()).toEqual({
            errors: [],
            notices: [],
          });

          // A real second editor writes the same file without taking focus.
          // The bridge waits for source synchronization and reparses at the
          // captured root start, just like applyChanges will do on mouseup.
          expect(await replaceFromDropInvalidationEditor(text)).toEqual({
            value: text,
            rootStart: { line: 0, ch: 0 },
            parsed,
          });
          await expectActive();
          expect((await getCurrentState()).value).toBe(text);
          await drop();

          // DOM listener exceptions do not reject dispatchEvent/the drop RPC.
          // Assert the owning windows' error events as well as the notice.
          expect(await getDropInvalidationObservations()).toEqual({
            errors: [],
            notices: [notice],
          });
          await expectClean();
          expect((await getCurrentState()).value).toBe(text);

          await applyState(initialState);
          await startDrag();
          await expectActive();
          await drop();
          await expectClean();
          await expect(await getCurrentState()).toEqualEditorState(
            reorderedState,
          );
          // Recovery must not throw or produce another cancellation notice.
          expect(await getDropInvalidationObservations()).toEqual({
            errors: [],
            notices: [notice],
          });
        } finally {
          try {
            await simulateKeydown("Escape");
            await setSetting({ k: "dnd", v: false });
          } finally {
            try {
              await closeDropInvalidationEditor();
            } finally {
              try {
                await closePopoutEditor();
              } finally {
                await selectTestEditor({ window: "main" });
                await resetSettings();
              }
            }
          }
        }
      },
      20000,
    );
  },
);
