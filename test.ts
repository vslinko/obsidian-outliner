import { MarkdownView } from "obsidian";
import * as assert from "assert";
import ObsidianOutlinerPlugin from "./main";
import deleteTests from "./tests/delete";
import enterTests from "./tests/enter";
import outdentTests from "./tests/outdent";

interface IState {
  selections: Array<{ anchor: CodeMirror.Position; head: CodeMirror.Position }>;
  value: string;
}

const tests = {
  ...deleteTests,
  ...enterTests,
  ...outdentTests,
};

export default class ObsidianOutlinerPluginWithTests extends ObsidianOutlinerPlugin {
  private editor: CodeMirror.Editor;

  simulateKeydown(keys: string) {
    const e = {
      code: "",
      shiftKey: false,
      metaKey: false,
      altKey: false,
      ctrlKey: false,
    };

    for (const key of keys.split("-")) {
      switch (key.toLowerCase()) {
        case "cmd":
          e.metaKey = true;
          break;
        case "ctrl":
          e.ctrlKey = true;
          break;
        case "alt":
          e.altKey = true;
          break;
        case "shift":
          e.shiftKey = true;
          break;
        default:
          e.code = key;
          break;
      }
    }

    const keyboardEvent = new KeyboardEvent("keydown", e);
    window.CodeMirror.signal(
      this.editor,
      "keydown",
      this.editor,
      keyboardEvent
    );
  }

  async load() {
    await super.load();

    (window as any).ObsidianOutlinerPlugin = {
      runTests: async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (!view) {
          return;
        }

        this.editor = view.sourceMode.cmEditor;

        const prevState = this.getCurrentState();

        for (const [key, testFn] of Object.entries(tests)) {
          const groupLabel = `> ${key}`;
          mockConsole((invokeOriginal) => {
            unmockConsole();
            console.log(groupLabel);
            invokeOriginal();
          });
          let failed = false;
          try {
            this.applyState("|");
            await testFn(this);
          } catch (e) {
            console.error(e);
            failed = true;
          }
          unmockConsole();
          console.log(`${groupLabel} ${failed ? "FAIL" : "SUCCESS"}`);
        }

        this.applyState(prevState);
      },
    };
  }

  async onunload() {
    await super.onunload();
    delete (window as any).ObsidianOutlinerPlugin;
  }

  applyState(state: string[]): void;
  applyState(state: string): void;
  applyState(state: IState): void;
  applyState(state: IState | string | string[]) {
    if (typeof state === "string") {
      state = state.split("\n");
    }
    if (Array.isArray(state)) {
      state = parseState(state);
    }

    this.editor.setValue(state.value);
    this.editor.setSelections(state.selections);
  }

  assertCurrentState(expectedState: string[]): void;
  assertCurrentState(expectedState: string): void;
  assertCurrentState(expectedState: IState): void;
  assertCurrentState(expectedState: IState | string | string[]) {
    if (typeof expectedState === "string") {
      expectedState = expectedState.split("\n");
    }
    if (Array.isArray(expectedState)) {
      expectedState = parseState(expectedState);
    }

    const currentState = this.getCurrentState();

    assert.strictEqual(currentState.value, expectedState.value);
    assert.deepStrictEqual(currentState.selections, expectedState.selections);
  }

  getCurrentState(): IState {
    return {
      selections: this.editor.listSelections().map((range) => ({
        anchor: {
          line: range.anchor.line,
          ch: range.anchor.ch,
        },
        head: {
          line: range.head.line,
          ch: range.head.ch,
        },
      })),
      value: this.editor.getValue(),
    };
  }
}

function parseState(content: string[]): IState;
function parseState(content: string): IState;
function parseState(content: string | string[]): IState {
  if (typeof content === "string") {
    content = content.split("\n");
  }

  const acc = content.reduce(
    (acc, line, lineNo) => {
      if (!acc.from) {
        const dashIndex = line.indexOf("|");
        if (dashIndex >= 0) {
          acc.from = {
            line: lineNo,
            ch: dashIndex,
          };
          line = line.substring(0, dashIndex) + line.substring(dashIndex + 1);
        }
      }

      if (!acc.to) {
        const dashIndex = line.indexOf("|");
        if (dashIndex >= 0) {
          acc.to = {
            line: lineNo,
            ch: dashIndex,
          };
          line = line.substring(0, dashIndex) + line.substring(dashIndex + 1);
        }
      }

      acc.lines.push(line);

      return acc;
    },
    {
      from: null as CodeMirror.Position | null,
      to: null as CodeMirror.Position | null,
      lines: [] as string[],
    }
  );
  if (!acc.from) {
    acc.from = { line: 0, ch: 0 };
  }
  if (!acc.to) {
    acc.to = { ...acc.from };
  }

  return {
    selections: [{ anchor: acc.from, head: acc.to }],
    value: acc.lines.join("\n"),
  };
}

const consoleOrigins: typeof window.console = {
  ...window.console,
};

function mockConsole(cb: (invokeOriginal: () => void) => void) {
  for (const key in window.console) {
    const k = key as keyof Console;

    if (typeof console[k] === "function") {
      console[k] = (...args: any[]) => {
        const invokeOriginal = () => {
          consoleOrigins[k](...args);
        };

        cb(invokeOriginal);
      };
    }
  }
}

function unmockConsole() {
  for (const key in window.console) {
    const k = key as keyof Console;

    if (typeof console[k] === "function") {
      console[k] = consoleOrigins[k];
    }
  }
}
