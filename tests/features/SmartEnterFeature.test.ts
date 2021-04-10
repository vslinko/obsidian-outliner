import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "enter should outdent line if line is empty": (plugin) => {
    // arrange
    plugin.applyState(["- one", "\t- two", "\t\t- |"]);

    // act
    plugin.simulateKeydown("Enter");

    // assert
    plugin.assertCurrentState(["- one", "\t- two", "\t- |"]);
  },
  "enter should create newline on the same level": (plugin) => {
    // arrange
    plugin.applyState(["- one", "\t- two|"]);

    // act
    plugin.simulateKeydown("Enter");

    // assert
    plugin.assertCurrentState(["- one", "\t- two", "\t- |"]);
  },
  "enter should create newline on the child level if child exists": (
    plugin
  ) => {
    // arrange
    plugin.applyState(["- one", "\t- two|", "\t\t- three"]);

    // act
    plugin.simulateKeydown("Enter");

    // assert
    plugin.assertCurrentState(["- one", "\t- two", "\t\t- |", "\t\t- three"]);
  },
  "enter should delete list item if it's last item and it's on the top level": (
    plugin
  ) => {
    // arrange
    plugin.applyState(["- one", "- |"]);

    // act
    plugin.simulateKeydown("Enter");

    // assert
    plugin.assertCurrentState(["- one", "", "|"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
