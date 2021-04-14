/**
 * @jest-environment ./jest/obsidian-environment
 */

test("Cmd-Shift-Left should select content only", async () => {
  // arrange
  await applyState(["- one|"]);

  // act
  await simulateKeydown("Cmd-Shift-Left");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- |one|"]);
});
