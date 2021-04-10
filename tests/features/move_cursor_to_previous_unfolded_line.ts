import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "cursor should be moved to previous line": (plugin) => {
    // arrange
    plugin.applyState(["- one", "- |two"]);

    // act
    plugin.simulateKeydown("Left");

    // assert
    plugin.assertCurrentState(["- one|", "- two"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
