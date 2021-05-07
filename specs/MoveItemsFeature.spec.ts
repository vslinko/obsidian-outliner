/**
 * @jest-environment ./jest/obsidian-environment
 */

test("obsidian-outliner:outdent-list should outdent line", async () => {
  // arrange
  await applyState(["- qwe", "\t- qwe|"]);

  // act
  await executeCommandById("obsidian-outliner:outdent-list");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- qwe", "- qwe|"]);
});

test("obsidian-outliner:outdent-list should outdent children", async () => {
  // arrange
  await applyState(["- qwe", "\t- qwe|", "\t\t- qwe"]);

  // act
  await executeCommandById("obsidian-outliner:outdent-list");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- qwe",
    "- qwe|",
    "\t- qwe",
  ]);
});

test("obsidian-outliner:indent-list should indent line", async () => {
  // arrange
  await applyState(["- qwe", "- qwe|"]);

  // act
  await executeCommandById("obsidian-outliner:indent-list");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- qwe",
    "\t- qwe|",
  ]);
});

test("obsidian-outliner:indent-list should indent children", async () => {
  // arrange
  await applyState(["- qwe", "- qwe|", "\t- qwe"]);

  // act
  await executeCommandById("obsidian-outliner:indent-list");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- qwe",
    "\t- qwe|",
    "\t\t- qwe",
  ]);
});

test("obsidian-outliner:indent-list should not indent line if it's no parent", async () => {
  // arrange
  await applyState(["- qwe", "\t- qwe|"]);

  // act
  await executeCommandById("obsidian-outliner:indent-list");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- qwe",
    "\t- qwe|",
  ]);
});

test("obsidian-outliner:indent-list should keep cursor at the same text position", async () => {
  // arrange
  await applyState(["- qwe", "  - qwe", "  - q|we"]);

  // act
  await executeCommandById("obsidian-outliner:indent-list");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- qwe",
    "  - qwe",
    "    - q|we",
  ]);
});

test("obsidian-outliner:move-list-item-down should move line down", async () => {
  // arrange
  await applyState(["- one|", "- two"]);

  // act
  await executeCommandById("obsidian-outliner:move-list-item-down");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- two", "- one|"]);
});

test("obsidian-outliner:move-list-item-down should move children down", async () => {
  // arrange
  await applyState(["- one|", "\t- one one", "- two"]);

  // act
  await executeCommandById("obsidian-outliner:move-list-item-down");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- two",
    "- one|",
    "\t- one one",
  ]);
});

test("obsidian-outliner:move-list-item-up should move line up", async () => {
  // arrange
  await applyState(["- one", "- two|"]);

  // act
  await executeCommandById("obsidian-outliner:move-list-item-up");

  // assert
  await expect(await getCurrentState()).toEqualEditorState(["- two|", "- one"]);
});

test("obsidian-outliner:move-list-item-up should move children up", async () => {
  // arrange
  await applyState(["- two", "- one|", "\t- one one"]);

  // act
  await executeCommandById("obsidian-outliner:move-list-item-up");

  // assert
  await expect(await getCurrentState()).toEqualEditorState([
    "- one|",
    "\t- one one",
    "- two",
  ]);
});
