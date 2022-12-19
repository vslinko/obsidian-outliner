import { MarkdownView } from "obsidian";

import { MyEditor, MyEditorPosition } from "./MyEditor";
import ObsidianOutlinerPlugin from "./ObsidianOutlinerPlugin";
import { ObsidianOutlinerPluginSettings } from "./services/SettingsService";

const keysMap: { [key: string]: number } = {
  Backspace: 8,
  Enter: 13,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Delete: 46,
  KeyA: 65,
};

export default class ObsidianOutlinerPluginWithTests extends ObsidianOutlinerPlugin {
  private editor: MyEditor;

  wait(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  executeCommandById(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.app as any).commands.executeCommandById(id);
  }

  async setSetting<T extends keyof ObsidianOutlinerPluginSettings>({
    k,
    v,
  }: {
    k: T;
    v: ObsidianOutlinerPluginSettings[T];
  }) {
    this.settings.set(k, v);
    await this.settings.save();
  }

  async resetSettings() {
    this.settings.reset();
    await this.settings.save();
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

    if (e.code in keysMap) {
      e.keyCode = keysMap[e.code];
    }

    if (e.keyCode == 0) {
      throw new Error("Unknown key: " + e.code);
    }

    this.editor.triggerOnKeyDown(e as KeyboardEvent);
  }

  insertText(text: string) {
    document.execCommand("insertText", false, text);
  }

  async load() {
    await super.load();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ObsidianOutlinerPlugin = this;

    if (process.env.TEST_PLATFORM) {
      setTimeout(async () => {
        await this.wait(1000);
        this.connect();
      }, 0);
    }
  }

  async onunload() {
    await super.onunload();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // TODO: Fix deprecation issue
        this.app.workspace.activeLeaf.openFile(file);
        break;
      }
    }
    await this.wait(1000);

    this.editor = new MyEditor(
      this.app.workspace.getActiveViewOfType(MarkdownView).editor
    );
  }

  async connect() {
    await this.prepareForTests();

    const ws = new WebSocket("ws://127.0.0.1:8080/");

    ws.addEventListener("message", async (event) => {
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
          case "insertText":
            this.insertText(data);
            break;
          case "executeCommandById":
            this.executeCommandById(data);
            break;
          case "resetSettings":
            await this.resetSettings();
            break;
          case "setSetting":
            await this.setSetting(data);
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
  applyState(state: State): void;
  applyState(state: State | string | string[]) {
    if (typeof state === "string") {
      state = state.split("\n");
    }
    if (Array.isArray(state)) {
      state = this.parseState(state);
    }

    this.editor.setValue("");
    this.editor.setValue(state.value);
    this.editor.setSelections(state.selections);

    // TODO: recursive bottom-top folding, because it's impossible to fold inside already folded range
    for (const l of state.folds) {
      this.editor.fold(l);
    }
  }

  getCurrentState(): State {
    return {
      folds: this.editor.getAllFoldedLines(),
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

  parseState(content: string[]): State;
  parseState(content: string): State;
  parseState(content: string | string[]): State {
    if (typeof content === "string") {
      content = content.split("\n");
    }

    const acc = content.reduce(
      (acc, line, lineNo) => {
        if (line.includes("#folded")) {
          line = line.replace("#folded", "").trimEnd();
          acc.folds.push(lineNo);
        }

        if (!acc.anchor) {
          const dashIndex = line.indexOf("|");
          if (dashIndex >= 0) {
            acc.anchor = {
              line: lineNo,
              ch: dashIndex,
            };
            line = line.substring(0, dashIndex) + line.substring(dashIndex + 1);
          }
        }

        if (!acc.head) {
          const dashIndex = line.indexOf("|");
          if (dashIndex >= 0) {
            acc.head = {
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
        anchor: null as MyEditorPosition | null,
        head: null as MyEditorPosition | null,
        lines: [] as string[],
        folds: [] as number[],
      }
    );
    if (!acc.anchor) {
      acc.anchor = { line: 0, ch: 0 };
    }
    if (!acc.head) {
      acc.head = { ...acc.anchor };
    }

    return {
      folds: acc.folds,
      selections: [{ anchor: acc.anchor, head: acc.head }],
      value: acc.lines.join("\n"),
    };
  }
}
