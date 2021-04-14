/**
 * @jest-environment ./jest/obsidian-environment
 */

test("backspace should work as regular if it's last empty line", async () => {
  // arrange
  await applyState(["- |"]);

  // act
  await simulateKeydown("Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["-|"]);
});

test("backspace should work as regular if it's first line without children", async () => {
  // arrange
  await applyState(["- |one", "- two"]);

  // act
  await simulateKeydown("Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["-|one", "- two"]);
});

test("backspace should do nothing if it's first line but with children", async () => {
  // arrange
  await applyState(["- |one", "\t- two"]);

  // act
  await simulateKeydown("Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- |one",
    "\t- two",
  ]);
});

test("backspace should remove symbol if it isn't empty line", async () => {
  // arrange
  await applyState(["- qwe|"]);

  // act
  await simulateKeydown("Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- qw|"]);
});

test("backspace should remove list item if it's empty", async () => {
  // arrange
  await applyState(["- one", "- |"]);

  // act
  await simulateKeydown("Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- one|"]);
});

test("cmd+backspace should remove content only", async () => {
  // arrange
  await applyState(["- one", "- two|"]);

  // act
  await simulateKeydown("Cmd-Backspace");
  await simulateKeydown("Cmd-Backspace");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- one", "- |"]);
});

test("delete should remove next item if cursor is on the end", async () => {
  // arrange
  await applyState(["- qwe|", "\t- ee"]);

  // act
  await simulateKeydown("Delete");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- qwe|ee"]);
});
