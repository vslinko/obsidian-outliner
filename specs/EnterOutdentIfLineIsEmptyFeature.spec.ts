/**
 * @jest-environment ./jest/obsidian-environment
 */

test("enter should outdent line if line is empty", async () => {
  // arrange
  await applyState(["- one", "\t- two", "\t\t- |"]);

  // act
  await simulateKeydown("Enter");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one",
    "\t- two",
    "\t- |",
  ]);
});

test("enter should delete list item if it's last item and it's on the top level", async () => {
  // arrange
  await applyState(["- one", "- |"]);

  // act
  await simulateKeydown("Enter");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- one", "", "|"]);
});
