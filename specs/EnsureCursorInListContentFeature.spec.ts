/**
 * @jest-environment ./jest/obsidian-environment
 */

test("cursor should be moved to list content", async () => {
  // arrange
  await applyState(["|- one"]);

  // act

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- |one"]);
});

test("cursor should be moved to list content after arrowup", async () => {
  // arrange
  await applyState(["- one", "|"]);

  // act
  await simulateKeydown("Up");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- |one", ""]);
});

test("cursor should be moved to list content after arrowright", async () => {
  // arrange
  await applyState(["- one|", "- two"]);

  // act
  await simulateKeydown("Right");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- one", "- |two"]);
});
