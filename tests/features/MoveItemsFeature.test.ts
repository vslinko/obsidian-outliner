import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "obsidian-outliner:outdent-list should outdent line": (plugin) => {
    // arrange
    plugin.applyState(["- qwe", "\t- qwe|"]);

    // act
    plugin.executeCommandById("obsidian-outliner:outdent-list");

    // assert
    plugin.assertCurrentState(["- qwe", "- qwe|"]);
  },
  "obsidian-outliner:outdent-list should outdent children": (plugin) => {
    // arrange
    plugin.applyState(["- qwe", "\t- qwe|", "\t\t- qwe"]);

    // act
    plugin.executeCommandById("obsidian-outliner:outdent-list");

    // assert
    plugin.assertCurrentState(["- qwe", "- qwe|", "\t- qwe"]);
  },
  "obsidian-outliner:indent-list should indent line": (plugin) => {
    // arrange
    plugin.applyState(["- qwe", "- qwe|"]);

    // act
    plugin.executeCommandById("obsidian-outliner:indent-list");

    // assert
    plugin.assertCurrentState(["- qwe", "\t- qwe|"]);
  },
  "obsidian-outliner:indent-list should indent children": (plugin) => {
    // arrange
    plugin.applyState(["- qwe", "- qwe|", "\t- qwe"]);

    // act
    plugin.executeCommandById("obsidian-outliner:indent-list");

    // assert
    plugin.assertCurrentState(["- qwe", "\t- qwe|", "\t\t- qwe"]);
  },
  "obsidian-outliner:indent-list should not indent line if it's no parent": (
    plugin
  ) => {
    // arrange
    plugin.applyState(["- qwe", "\t- qwe|"]);

    // act
    plugin.executeCommandById("obsidian-outliner:indent-list");

    // assert
    plugin.assertCurrentState(["- qwe", "\t- qwe|"]);
  },
  "obsidian-outliner:move-list-item-down should move line down": (plugin) => {
    // arrange
    plugin.applyState(["- one|", "- two"]);

    // act
    plugin.executeCommandById("obsidian-outliner:move-list-item-down");

    // assert
    plugin.assertCurrentState(["- two", "- one|"]);
  },
  "obsidian-outliner:move-list-item-down should move children down": (
    plugin
  ) => {
    // arrange
    plugin.applyState(["- one|", "\t- one one", "- two"]);

    // act
    plugin.executeCommandById("obsidian-outliner:move-list-item-down");

    // assert
    plugin.assertCurrentState(["- two", "- one|", "\t- one one"]);
  },
  "obsidian-outliner:move-list-item-up should move line up": (plugin) => {
    // arrange
    plugin.applyState(["- one", "- two|"]);

    // act
    plugin.executeCommandById("obsidian-outliner:move-list-item-up");

    // assert
    plugin.assertCurrentState(["- two|", "- one"]);
  },
  "obsidian-outliner:move-list-item-up should move children up": (plugin) => {
    // arrange
    plugin.applyState(["- two", "- one|", "\t- one one"]);

    // act
    plugin.executeCommandById("obsidian-outliner:move-list-item-up");

    // assert
    plugin.assertCurrentState(["- one|", "\t- one one", "- two"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
