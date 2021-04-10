import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "cursor should be moved to list content": (plugin) => {
    // arrange
    plugin.applyState(["|- one"]);

    // act

    // assert
    plugin.assertCurrentState(["- |one"]);
  },
  "cursor should be moved to list content after arrowup": (plugin) => {
    // arrange
    plugin.applyState(["- one", "|"]);
    
    // act
    plugin.simulateKeydown("Up");

    // assert
    plugin.assertCurrentState(["- |one", ""]);
  },
  "cursor should be moved to list content after arrowright": (plugin) => {
    // arrange
    plugin.applyState(["- one|", "- two"]);
    
    // act
    plugin.simulateKeydown("Right");

    // assert
    plugin.assertCurrentState(["- one", "- |two"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
