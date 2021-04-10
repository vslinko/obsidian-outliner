import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "Cmd-A should select list item content": (plugin) => {
    // arrange
    plugin.applyState(["- one", "\t- two|"]);

    // act
    plugin.executeCommandById("obsidian-outliner:select-all");

    // assert
    plugin.assertCurrentState(["- one", "\t- |two|"]);
  },
  "Cmd-A should select list whole list after second invoke": (plugin) => {
    // arrange
    plugin.applyState(["a", "- one", "\t- two|", "b"]);

    // act
    plugin.executeCommandById("obsidian-outliner:select-all");
    plugin.executeCommandById("obsidian-outliner:select-all");

    // assert
    plugin.assertCurrentState(["a", "|- one", "\t- two|", "b"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
