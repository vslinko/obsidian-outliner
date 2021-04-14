import type ObsidianOutlinerPluginWithTests from "../../test";

export default {
  "backspace should work as regular if it's last empty line": (plugin) => {
    // arrange
    plugin.applyState(["- |"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["-|"]);
  },
  "backspace should work as regular if it's first line without children": (
    plugin
  ) => {
    // arrange
    plugin.applyState(["- |one", "- two"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["-|one", "- two"]);
  },
  "backspace should do nothing if it's first line but with children": (
    plugin
  ) => {
    // arrange
    plugin.applyState(["- |one", "\t- two"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["- |one", "\t- two"]);
  },
  "backspace should remove symbol if it isn't empty line": (plugin) => {
    // arrange
    plugin.applyState(["- qwe|"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["- qw|"]);
  },
  "backspace should remove list item if it's empty": (plugin) => {
    // arrange
    plugin.applyState(["- one", "- |"]);

    // act
    plugin.simulateKeydown("Backspace");

    // assert
    plugin.assertCurrentState(["- one|"]);
  },
  "cmd+backspace should remove content only": (plugin) => {
    // arrange
    plugin.applyState(["- one", "- two|"]);

    // act
    plugin.simulateKeydown("Cmd-Backspace");
    plugin.simulateKeydown("Cmd-Backspace");

    // assert
    plugin.assertCurrentState(["- one", "- |"]);
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
