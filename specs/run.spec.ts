/**
 * @jest-environment ./jest/obsidian-environment
 */

import { readdirSync, readFileSync } from "fs";

const files = readdirSync(__dirname);

interface ISimulateKeydown {
  type: "simulateKeydown";
  key: string;
}

interface IExecuteCommandById {
  type: "executeCommandById";
  command: string;
}

type Action = ISimulateKeydown | IExecuteCommandById;

interface ITestDesc {
  title: string;
  before: string[];
  actions: Action[];
  after: string[];
}

function makeTestDesc(): ITestDesc {
  return {
    title: "",
    before: [],
    actions: [],
    after: [],
  };
}

function registerTest(desc: ITestDesc) {
  test(desc.title, async () => {
    // arrange
    await applyState(desc.before);

    // act
    for (const action of desc.actions) {
      switch (action.type) {
        case "simulateKeydown":
          await simulateKeydown(action.key);
          break;
        case "executeCommandById":
          await executeCommandById(action.command);
          break;
      }
    }

    // assert
    await expect(await getCurrentState()).toEqualEditorState(desc.after);
  });
}

for (const file of files) {
  const matches = /^(.+)\.spec.md$/.exec(file);

  if (!matches) {
    continue;
  }

  describe(matches[1], () => {
    const content = readFileSync(__dirname + "/" + file, "utf-8").split("\n");

    let sm = "looking-for-title";
    let desc = makeTestDesc();

    for (const line of content) {
      if (sm === "looking-for-title" && line.startsWith("# ")) {
        desc.title = line.slice(2).trim();
        sm = "looking-for-before";
      } else if (sm === "looking-for-before" && line.startsWith("```")) {
        sm = "inside-before";
      } else if (sm === "inside-before" && line.startsWith("```")) {
        sm = "looking-for-actions";
      } else if (sm === "inside-before") {
        desc.before.push(line);
      } else if (
        sm === "looking-for-actions" &&
        /^- keydown: `[^`]+`$/.test(line)
      ) {
        desc.actions.push({
          type: "simulateKeydown",
          key: line.replace(/^- keydown: `/, "").slice(0, -1),
        });
      } else if (
        sm === "looking-for-actions" &&
        /^- execute: `[^`]+`$/.test(line)
      ) {
        desc.actions.push({
          type: "executeCommandById",
          command: line.replace(/^- execute: `/, "").slice(0, -1),
        });
      } else if (sm === "looking-for-actions" && line.startsWith("```")) {
        sm = "inside-after";
      } else if (sm === "inside-after" && line.startsWith("```")) {
        registerTest(desc);
        desc = makeTestDesc();
        sm = "looking-for-title";
      } else if (sm === "inside-after") {
        desc.after.push(line);
      }
    }
  });
}
