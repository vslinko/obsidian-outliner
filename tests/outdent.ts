import type ObsidianOutlinerPluginWithTests from "../test";

export default {
  "shift-tab should outdent line": (plugin) => {
    // arrange
    plugin.applyState(["- qwe", "\t- qwe|"]);

    // act
    plugin.simulateKeydown("Shift-Tab");

    // assert
    plugin.assertCurrentState(["- qwe", "- qwe|"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
