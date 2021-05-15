/**
 * @jest-environment ./jest/obsidian-environment
 */

test("enter should create new item on the same level", async () => {
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

test("enter should create new item on the child level if child exists", async () => {
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

test("enter should create new item on the child level if child exists and previous item has notes", async () => {
  // arrange
  await applyState(["- one", "\tnote", "\t- two|", "\t\t- three"]);

  // act
  await simulateKeydown("Enter");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one",
    "\tnote",
    "\t- two",
    "\t\t- |",
    "\t\t- three",
  ]);
});

test("enter should create new item on the child level if child exists and current item has notes", async () => {
  // arrange
  await applyState(["- one", "\t- two|", "\t\tnote", "\t\t- three"]);

  // act
  await simulateKeydown("Enter");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one",
    "\t- two",
    "\t- |",
    "\t\tnote",
    "\t\t- three",
  ]);
});
