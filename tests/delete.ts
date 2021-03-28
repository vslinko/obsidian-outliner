import type ObsidianOutlinerPluginWithTests from "../test";

export default {
  "backspace should remove line if it's last empty line": (plugin) => {
    // arrange
    plugin.applyState(["- |"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["|"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
