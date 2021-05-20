/**
 * @jest-environment ./jest/obsidian-environment
 */

test("should fold", async () => {
  // arrange
  await applyState(["- one|", "\t- two"]);

  // act
  await executeCommandById("obsidian-outliner:fold");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one| #folded",
    "\t- two",
  ]);
});

test("should keep foldind on change", async () => {
  // arrange
  await applyState(["- one #folded", "\t- two", "- three", "- |"]);

  // act
  await simulateKeydown("Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one #folded",
    "\t- two",
    "- three|",
  ]);
});
