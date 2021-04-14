/**
 * @jest-environment ./jest/obsidian-environment
 */

test("enter should create newline on the same level", async () => {
  // arrange
  await applyState(["- one", "\t- two|"]);

  // act
  await simulateKeydown("Enter");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one",
    "\t- two",
    "\t- |",
  ]);
});

test("enter should create newline on the child level if child exists", async () => {
  // arrange
  await applyState(["- one", "\t- two|", "\t\t- three"]);

  // act
  await simulateKeydown("Enter");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one",
    "\t- two",
    "\t\t- |",
    "\t\t- three",
  ]);
});
