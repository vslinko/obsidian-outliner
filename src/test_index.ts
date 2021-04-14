import { MarkdownView } from "obsidian";
import * as assert from "assert";
import ObsidianOutlinerPlugin from ".";

export default class ObsidianOutlinerPluginWithTests extends ObsidianOutlinerPlugin {
  private editor: CodeMirror.Editor;

  wait(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

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

    if (process.env.TEST_PLATFORM) {
      setImmediate(async () => {
        await this.wait(1000);
        this.connect();
      });
    }
  }

  async onunload() {
    await super.onunload();
    delete (window as any).ObsidianOutlinerPlugin;
  }

  async prepareForTests() {
    const filePath = `test.md`;
    let file = this.app.vault
      .getMarkdownFiles()
      .find((f) => f.path === filePath);
    if (!file) {
      file = await this.app.vault.create(filePath, "");
    }
    for (let i = 0; i < 10; i++) {
      await this.wait(1000);
      if (this.app.workspace.activeLeaf) {
        this.app.workspace.activeLeaf.openFile(file);
        break;
      }
    }
    await this.wait(1000);
  }

  async connect() {
    await this.prepareForTests();

    this.editor = this.app.workspace.getActiveViewOfType(
      MarkdownView
    ).sourceMode.cmEditor;

    const ws = new WebSocket("ws://127.0.0.1:8080/");

    ws.addEventListener("message", (event) => {
      const { id, type, data } = JSON.parse(event.data);

      let result;
      let error;

      try {
        switch (type) {
          case "applyState":
            this.applyState(data);
            break;
          case "simulateKeydown":
            this.simulateKeydown(data);
            break;
          case "executeCommandById":
            this.executeCommandById(data);
            break;
          case "parseState":
            result = this.parseState(data);
            break;
          case "getCurrentState":
            result = this.getCurrentState();
            break;
        }
      } catch (e) {
        error = String(e);
      }

      ws.send(JSON.stringify({ id, data: result, error }));
    });
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
