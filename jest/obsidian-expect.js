const jestExpect = global.expect;

function stateToString(state) {
  const lines = state.value.split("\n");

  const sels = state.selections.reduce((acc, sel) => {
    acc.set(sel.from.line + "_" + sel.from.ch, "from");
    acc.set(sel.to.line + "_" + sel.to.ch, "to");
    return acc;
  }, new Map());

  let res = "";

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];

    for (let c = 0; c <= line.length; c++) {
      if (sels.has(l + "_" + c)) {
        res += "|";
      }
      if (c < line.length) {
        res += line[c];
      }
    }

    if (state.folds.includes(l)) {
      res += " #folded";
    }

    res += "\n";
  }

  return res;
}

jestExpect.extend({
  async toEqualEditorState(receivedState, expectedState) {
    const options = {
      comment: "Obsidian editor state equality",
      isNot: this.isNot,
      promise: this.promise,
    };

    expectedState = await parseState(expectedState);

    const received = stateToString(receivedState);
    const expected = stateToString(expectedState);

    const pass = received === expected;

    const message = pass
      ? () =>
          this.utils.matcherHint(
            "toEqualEditorState",
            undefined,
            undefined,
            options
          ) +
          "\n\n" +
          `Expected: not ${this.utils.printExpected(expected)}\n` +
          `Received: ${this.utils.printReceived(received)}`
      : () => {
          const diffString = this.utils.diff(expected, received, {
            expand: this.expand,
          });
          return (
            this.utils.matcherHint(
              "toEqualEditorState",
              undefined,
              undefined,
              options
            ) +
            "\n\n" +
            (diffString && diffString.includes("- Expect")
              ? `Difference:\n\n${diffString}`
              : `Expected: ${this.utils.printExpected(expected)}\n` +
                `Received: ${this.utils.printReceived(received)}`)
          );
        };

    return {
      pass,
      message,
    };
  },
});
