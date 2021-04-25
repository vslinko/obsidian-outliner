/**
 * @jest-environment ./jest/obsidian-environment
 */

test("cursor should be moved to previous line", async () => {
  // arrange
  await applyState(["- one", "- |two"]);

  // act
  await simulateKeydown("Left");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- one|", "- two"]);
});

test("cursor should be moved to previous line when previous item have notes", async () => {
  // arrange
  await applyState(["- one", "\tnote", "\t- |two"]);

  // act
  await simulateKeydown("Left");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one",
    "\tnote|",
    "\t- two",
  ]);
});
