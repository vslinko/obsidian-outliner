/**
 * @jest-environment ./jest/obsidian-environment
 */
import { readFileSync, readdirSync } from "fs";

interface State {
  lines: string[];
}

interface ApplyState {
  type: "applyState";
  state: State;
}

interface AssertState {
  type: "assertState";
  state: State;
}

interface SimulateKeydown {
  type: "simulateKeydown";
  key: string;
}

interface Platform {
  type: "platform";
  platform: string;
}

interface InsertText {
  type: "insertText";
  text: string;
}

interface ExecuteCommandById {
  type: "executeCommandById";
  command: string;
}

interface SetSetting {
  type: "setSetting";
  k: string;
  v: any;
}

type Action =
  | ApplyState
  | AssertState
  | SimulateKeydown
  | InsertText
  | ExecuteCommandById
  | Platform
  | SetSetting;

interface TestDesc {
  title: string;
  actions: Action[];
}

function registerTest(desc: TestDesc) {
  const platform = desc.actions.find((a) => a.type === "platform") as
    | Platform
    | undefined;
  const t =
    platform && process.platform !== platform.platform ? test.skip : test;

  t(desc.title, async () => {
    await resetSettings();

    for (const action of desc.actions) {
      switch (action.type) {
        case "applyState":
          await applyState(action.state.lines);
          break;
        case "simulateKeydown":
          await simulateKeydown(action.key);
          break;
        case "insertText":
          await insertText(action.text);
          break;
        case "executeCommandById":
          await executeCommandById(action.command);
          break;
        case "setSetting":
          await setSetting({ k: action.k, v: action.v });
          break;
        case "assertState":
          // Waiting for all operations to be applied
          await new Promise((resolve) => setTimeout(resolve, 10));

          await expect(await getCurrentState()).toEqualEditorState(
            action.state.lines
          );
          break;
      }
    }
  });
}

function isHeader(line: string) {
  return line.startsWith("# ");
}

function isAction(line: string) {
  return line.startsWith("- ");
}

function isCodeBlock(line: string) {
  return line.startsWith("```");
}

function parseState(l: LinesIterator): State {
  if (!isCodeBlock(l.line)) {
    throw new Error(
      `parseState: Unexpected line "${l.line}", expected "\`\`\`"`
    );
  }

  const lines: string[] = [];

  while (true) {
    l.next();

    if (l.isEnded()) {
      throw new Error(`parseState: Unexpected EOF, expected "\`\`\`"`);
    } else if (isCodeBlock(l.line)) {
      l.nextNotEmpty();
      return {
        lines,
      };
    } else {
      lines.push(l.line);
    }
  }
}

function parseApplyState(l: LinesIterator): ApplyState {
  l.nextNotEmpty();

  return {
    type: "applyState",
    state: parseState(l),
  };
}

function parseAssertState(l: LinesIterator): AssertState {
  l.nextNotEmpty();

  return {
    type: "assertState",
    state: parseState(l),
  };
}

function parseSimulateKeydown(l: LinesIterator): SimulateKeydown {
  const key = l.line.replace(/- keydown: `([^`]+)`/, "$1");

  l.nextNotEmpty();

  return {
    type: "simulateKeydown",
    key,
  };
}

function parsePlatform(l: LinesIterator): Platform {
  const platform = l.line.replace(/- platform: `([^`]+)`/, "$1");

  l.nextNotEmpty();

  return {
    type: "platform",
    platform,
  };
}

function parseInsertText(l: LinesIterator): InsertText {
  const text = l.line.replace(/- insertText: `([^`]+)`/, "$1");

  l.nextNotEmpty();

  return {
    type: "insertText",
    text,
  };
}

function parseExecuteCommandById(l: LinesIterator): ExecuteCommandById {
  const command = l.line.replace(/- execute: `([^`]+)`/, "$1");

  l.nextNotEmpty();

  return {
    type: "executeCommandById",
    command,
  };
}

function parseSetSetting(l: LinesIterator): SetSetting {
  const [k, v] = l.line.replace(/- setting: `([^`]+)`/, "$1").split("=", 2);

  l.nextNotEmpty();

  return {
    type: "setSetting",
    k,
    v: JSON.parse(v),
  };
}

function parseAction(l: LinesIterator): Action {
  if (!isAction(l.line)) {
    throw new Error(
      `parseAction: Unexpected line "${l.line}", expected ACTION`
    );
  }

  if (l.line.startsWith("- applyState:")) {
    return parseApplyState(l);
  } else if (l.line.startsWith("- keydown:")) {
    return parseSimulateKeydown(l);
  } else if (l.line.startsWith("- insertText:")) {
    return parseInsertText(l);
  } else if (l.line.startsWith("- execute:")) {
    return parseExecuteCommandById(l);
  } else if (l.line.startsWith("- setting:")) {
    return parseSetSetting(l);
  } else if (l.line.startsWith("- assertState:")) {
    return parseAssertState(l);
  } else if (l.line.startsWith("- platform:")) {
    return parsePlatform(l);
  }

  throw new Error(`parseAction: Unknown action "${l.line}"`);
}

function parseTest(l: LinesIterator): TestDesc {
  if (!isHeader(l.line)) {
    throw new Error(`parseTest: Unexpected line "${l.line}", expected HEADER`);
  }

  const title = l.line.replace(/^# /, "").trim();
  const actions: Action[] = [];

  l.nextNotEmpty();

  while (!l.isEnded() && !isHeader(l.line)) {
    actions.push(parseAction(l));
  }

  return {
    title,
    actions,
  };
}

function parseTests(l: LinesIterator): TestDesc[] {
  l.nextNotEmpty();

  const tests: TestDesc[] = [];

  while (!l.isEnded()) {
    tests.push(parseTest(l));
  }

  return tests;
}

class LinesIterator {
  private i = -1;
  private len: number;

  constructor(private lines: string[]) {
    this.len = this.lines.length;
  }

  get line(): string | undefined {
    return this.lines[this.i];
  }

  isEnded() {
    return this.i >= this.len;
  }

  nextNotEmpty() {
    do {
      this.i++;
    } while (!this.isEnded() && this.line.trim() === "");
  }

  next() {
    this.i++;
  }
}

for (const file of readdirSync(__dirname)) {
  const matches = /^(.+)\.spec.md$/.exec(file);

  if (!matches) {
    continue;
  }

  describe(matches[1], () => {
    const l = new LinesIterator(
      readFileSync(__dirname + "/" + file, "utf-8").split("\n")
    );

    for (const test of parseTests(l)) {
      registerTest(test);
    }
  });
}
