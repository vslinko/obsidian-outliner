import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "Cmd-Shift-Left should select content only": (plugin) => {
    // arrange
    plugin.applyState(["- one|"]);

    // act
    plugin.simulateKeydown("Cmd-Shift-Left");

    // assert
    plugin.assertCurrentState(["- |one|"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
