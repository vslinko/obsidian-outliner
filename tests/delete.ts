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
  "backspace should remove symbol if it isn't empty line": (plugin) => {
    // arrange
    plugin.applyState(["- qwe|"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["- qw|"]);
  },
  "delete should remove next item if cursor is on the end": (plugin) => {
    // arrange
    plugin.applyState(["- qwe|", "\t- ee"]);

    // act
    plugin.simulateKeydown("Delete");

    // assert
    plugin.assertCurrentState(["- qwe|ee"]);
  },
} as {
  [key: string]: (plugin: ObsidianOutlinerPluginWithTests) => void;
};
