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
