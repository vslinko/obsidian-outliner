import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = resolve(__dirname, "../..");
const transformerPath = resolve(root, "jest/md-spec-transformer.js");
const transformerSource = readFileSync(transformerPath, "utf8");

function registerTests(source: string, platform: string) {
  // Isolate the Node platform without changing the real process or module cache.
  const sandbox = { module: { exports: {} }, process: { platform } };
  runInNewContext(transformerSource, sandbox, { filename: transformerPath });
  const transformer = sandbox.module.exports as {
    process: (
      text: string,
      path: string,
      options: { config: { cwd: string } },
    ) => { code: string };
  };
  const { code } = transformer.process(
    source,
    resolve(root, "sentinel.spec.md"),
    {
      config: { cwd: root },
    },
  );
  const active: string[] = [];
  const skipped: string[] = [];
  const test = Object.assign((title: string) => active.push(title), {
    skip: (title: string) => skipped.push(title),
  });

  // Run registration, not the Obsidian-dependent async test bodies.
  runInNewContext(code, {
    describe: (_title: string, register: () => void) => register(),
    test,
  });
  return { active, skipped };
}

const sentinel = [
  "# Unrestricted",
  "- keydown: `Enter`",
  "# Linux only",
  "- platform: `linux`",
  "- keydown: `Ctrl-KeyA`",
  "# macOS only",
  "- platform: `darwin`",
  "- keydown: `Meta-KeyA`",
].join("\n");

describe("Markdown spec platform selection", () => {
  test.each([
    {
      platform: "linux",
      active: ["Unrestricted", "Linux only"],
      skipped: ["macOS only"],
    },
    {
      platform: "darwin",
      active: ["Unrestricted", "macOS only"],
      skipped: ["Linux only"],
    },
    {
      platform: "win32",
      active: ["Unrestricted"],
      skipped: ["Linux only", "macOS only"],
    },
  ])(
    "registers matching and unrestricted tests on $platform",
    ({ platform, active, skipped }) => {
      expect(registerTests(sentinel, platform)).toEqual({ active, skipped });
    },
  );

  test.each([
    { platform: "linux", activeCount: 9, skippedCount: 11 },
    { platform: "darwin", activeCount: 11, skippedCount: 9 },
  ])(
    "preserves platform coverage in existing suites on $platform",
    ({ platform, activeCount, skippedCount }) => {
      const source = [
        "specs/DefaultObsidianBehaviour.spec.md",
        "specs/features/CtrlAAndCmdABehaviourOverride.spec.md",
        "specs/features/MetaBackspaceBehaviourOverride.spec.md",
      ]
        .map((path) => readFileSync(resolve(root, path), "utf8"))
        .join("\n");
      const { active, skipped } = registerTests(source, platform);
      const unrestricted = [
        "shift-enter should create note",
        "shift-enter should continue note",
        "shift-enter should split note",
      ];
      expect(active).toEqual(expect.arrayContaining(unrestricted));
      expect(active).toHaveLength(activeCount + unrestricted.length);
      expect(skipped).toHaveLength(skippedCount);
    },
  );
});
