import { MarkdownView } from "obsidian";
import * as assert from "assert";
import ObsidianOutlinerPlugin from "./src";

import outdent_tests from "./tests/outdent";
import EnterOutdentIfLineIsEmptyFeature from "./tests/features/EnterOutdentIfLineIsEmptyFeature.test";
import EnterShouldCreateNewlineOnChildLevelFeature from "./tests/features/EnterShouldCreateNewlineOnChildLevelFeature.test";
import EnsureCursorInListContentFeature from "./tests/features/EnsureCursorInListContentFeature.test";
import MoveCursorToPreviousUnfoldedLineFeature from "./tests/features/MoveCursorToPreviousUnfoldedLineFeature.test";
import DeleteShouldIgnoreBulletsFeature from "./tests/features/DeleteShouldIgnoreBulletsFeature.test";
import SelectionShouldIgnoreBulletsFeature from "./tests/features/SelectionShouldIgnoreBulletsFeature.test";
import SelectAllFeature from "./tests/features/SelectAllFeature.test";

interface IState {
  selections: Array<{ from: CodeMirror.Position; to: CodeMirror.Position }>;
  value: string;
}

interface ITestResult {
  name: string;
  passed: boolean;
}

interface ITestResults {
  passed: number;
  failed: number;
  total: number;
  tests: ITestResult[];
}

const tests = {
  ...outdent_tests,
  ...EnterOutdentIfLineIsEmptyFeature,
  ...EnterShouldCreateNewlineOnChildLevelFeature,
  ...EnsureCursorInListContentFeature,
  ...MoveCursorToPreviousUnfoldedLineFeature,
  ...DeleteShouldIgnoreBulletsFeature,
  ...SelectionShouldIgnoreBulletsFeature,
  ...SelectAllFeature,
};

export default class ObsidianOutlinerPluginWithTests extends ObsidianOutlinerPlugin {
  private editor: CodeMirror.Editor;

  executeCommandById(id: string) {
    (this.app as any).commands.executeCommandById(id);
  }

  simulateKeydown(keys: string) {
    const e = {
      type: "keydown",
      code: "",
      keyCode: 0,
      shiftKey: false,
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      defaultPrevented: false,
      returnValue: true,
      cancelBubble: false,
      preventDefault: function () {
        e.defaultPrevented = true;
        e.returnValue = true;
      },
      stopPropagation: function () {
        e.cancelBubble = true;
      },
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

    for (const c in (window.CodeMirror as any).keyNames) {
      if ((window.CodeMirror as any).keyNames[c] == e.code) {
        e.keyCode = Number(c);
        break;
      }
    }

    if (e.keyCode == 0) {
      throw new Error("Unknown key: " + e.code);
    }

    (this.editor as any).triggerOnKeyDown(e);
  }

  async load() {
    await super.load();

    (window as any).ObsidianOutlinerPlugin = {
      runTests: this.runTests.bind(this),
    };

    if (process.env.RUN_OUTLINER_TESTS) {
      setTimeout(async () => {
        const results = await this.runTests();
        this.app.vault.create("results.json", JSON.stringify(results, null, 2));
      }, 500);
    }
  }

  async onunload() {
    await super.onunload();
    delete (window as any).ObsidianOutlinerPlugin;
  }

  async runTests(): Promise<ITestResults> {
    const results: ITestResults = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: [],
    };

    const filePath = `test.md`;
    let file = this.app.vault
      .getMarkdownFiles()
      .find((f) => f.path === filePath);
    if (!file) {
      file = await this.app.vault.create(filePath, "");
    }
    this.app.workspace.activeLeaf.openFile(file);

    for (const [key, testFn] of Object.entries(tests)) {
      const testResult: ITestResult = {
        name: key,
        passed: true,
      };
      this.editor = this.app.workspace.getActiveViewOfType(
        MarkdownView
      ).sourceMode.cmEditor;

      const groupLabel = `> ${key}`;
      mockConsole((invokeOriginal) => {
        unmockConsole();
        console.log(groupLabel);
        invokeOriginal();
      });
      try {
        this.applyState("|");
        await testFn(this);
      } catch (e) {
        console.error(e);
        testResult.passed = false;
      }
      unmockConsole();
      console.log(`${groupLabel} ${testResult.passed ? "SUCCESS" : "FAIL"}`);

      results.tests.push(testResult);
      if (testResult.passed) {
        results.passed++;
      } else {
        results.failed++;
      }
      results.total++;
    }

    return results;
  }

  applyState(state: string[]): void;
  applyState(state: string): void;
  applyState(state: IState): void;
  applyState(state: IState | string | string[]) {
    if (typeof state === "string") {
      state = state.split("\n");
    }
    if (Array.isArray(state)) {
      state = this.parseState(state);
    }

    this.editor.setValue(state.value);
    this.editor.setSelections(
      state.selections.map((s) => ({
        anchor: s.from,
        head: s.to,
      }))
    );
  }

  assertCurrentState(expectedState: string[]): void;
  assertCurrentState(expectedState: string): void;
  assertCurrentState(expectedState: IState): void;
  assertCurrentState(expectedState: IState | string | string[]) {
    if (typeof expectedState === "string") {
      expectedState = expectedState.split("\n");
    }
    if (Array.isArray(expectedState)) {
      expectedState = this.parseState(expectedState);
    }

    const currentState = this.getCurrentState();

    assert.strictEqual(currentState.value, expectedState.value);
    assert.deepStrictEqual(currentState.selections, expectedState.selections);
  }

  getCurrentState(): IState {
    return {
      selections: this.editor.listSelections().map((range) => ({
        from: {
          line: range.from().line,
          ch: range.from().ch,
        },
        to: {
          line: range.to().line,
          ch: range.to().ch,
        },
      })),
      value: this.editor.getValue(),
    };
  }

  parseState(content: string[]): IState;
  parseState(content: string): IState;
  parseState(content: string | string[]): IState {
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
      selections: [{ from: acc.from, to: acc.to }],
      value: acc.lines.join("\n"),
    };
  }
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
