import type ObsidianOutlinerPluginWithTests from "../test";

export default {
  "enter should outdent line if line is empty": (plugin) => {
    // arrange
    plugin.applyState(["- one", "\t- two", "\t\t- |"]);

    // act
    plugin.simulateKeydown("Enter");

    // assert
    plugin.assertCurrentState(["- one", "\t- two", "\t- |"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
