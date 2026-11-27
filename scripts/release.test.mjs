import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { devNull, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const releaseScript = fileURLToPath(new URL("../release.mjs", import.meta.url));
const originalVersions = { "4.10.2": "1.4.14", "4.10.1": "1.4.14" };
const files = {
  "manifest.json": { version: "4.10.2", minAppVersion: "1.4.14" },
  "package.json": { name: "release-fixture", version: "4.10.2" },
  "package-lock.json": {
    version: "4.10.2",
    packages: { "": { version: "4.10.2" } },
  },
  "versions.json": originalVersions,
};

function makeFixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "outliner-release-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
  );
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = devNull;
  env.LC_ALL = "C";

  function git(...args) {
    const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }

  git("init", "--quiet", "--initial-branch=main");
  git("config", "user.name", "Release test");
  git("config", "user.email", "release-test@example.invalid");
  git("config", "commit.gpgsign", "false");
  git("config", "core.hooksPath", join(cwd, "no-hooks"));
  for (const [name, data] of Object.entries(files)) {
    writeFileSync(join(cwd, name), JSON.stringify(data, null, 2) + "\n");
  }
  git("add", ...Object.keys(files));
  git("commit", "--quiet", "-m", "fixture");

  return {
    cwd,
    env,
    git,
    read: (name) => JSON.parse(readFileSync(join(cwd, name), "utf8")),
    run: (...args) =>
      spawnSync(process.execPath, [releaseScript, ...args], {
        cwd,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10000,
      }),
  };
}

for (const [releaseType, version] of [
  ["major", "5.0.0"],
  ["minor", "4.11.0"],
  ["patch", "4.10.3"],
]) {
  test(`${releaseType} CLI release updates all version files without a prompt`, (t) => {
    const fixture = makeFixture(t);
    const result = fixture.run(releaseType, "1.11.7");
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fixture.read("manifest.json").version, version);
    assert.equal(fixture.read("manifest.json").minAppVersion, "1.11.7");
    assert.equal(fixture.read("package.json").version, version);
    assert.equal(fixture.read("package-lock.json").version, version);
    assert.equal(
      fixture.read("package-lock.json").packages[""].version,
      version,
    );
    assert.deepEqual(fixture.read("versions.json"), {
      [version]: "1.11.7",
      ...originalVersions,
    });
    assert.equal(fixture.git("log", "-1", "--format=%s"), version);
    assert.equal(fixture.git("rev-list", "--count", "HEAD"), "2");
    assert.equal(fixture.git("status", "--porcelain"), "");
  });
}

for (const [args, message] of [
  [["invalid", "1.11.7"], /releaseType must be major, minor or patch/],
  [["patch", "1.11.7", "extra"], /Usage: node release\.mjs/],
]) {
  test(`invalid CLI arguments ${args.join(" ")} leave files and Git unchanged`, (t) => {
    const fixture = makeFixture(t);
    const result = fixture.run(...args);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    for (const [name, data] of Object.entries(files)) {
      assert.deepEqual(fixture.read(name), data);
    }
    assert.equal(fixture.git("rev-list", "--count", "HEAD"), "1");
    assert.equal(fixture.git("status", "--porcelain"), "");
  });
}

test("git add failure stops before attempting git commit", (t) => {
  const fixture = makeFixture(t);
  writeFileSync(join(fixture.cwd, ".git", "index.lock"), "");
  const result = fixture.run("patch", "1.11.7");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /git add failed/);
  // Git commit would produce a second lock error if it were attempted.
  assert.equal(
    result.stderr.match(/Unable to create.*index\.lock/g)?.length,
    1,
    result.stderr,
  );
  assert.equal(fixture.git("rev-list", "--count", "HEAD"), "1");
  assert.equal(fixture.git("diff", "--cached", "--name-only"), "");
});

for (const [name, hook, message] of [
  ["exit status", "exit 1", /git commit failed: 1/],
  ["signal", 'kill -TERM "$PPID"', /git commit failed: SIGTERM/],
]) {
  test(`git commit failure (${name}) is reported without creating a release commit`, (t) => {
    const fixture = makeFixture(t);
    const hooks = join(fixture.cwd, ".git", "release-hooks");
    mkdirSync(hooks);
    writeFileSync(join(hooks, "pre-commit"), `#!/bin/sh\n${hook}\n`, {
      mode: 0o755,
    });
    fixture.git("config", "core.hooksPath", hooks);
    const result = fixture.run("patch", "1.11.7");
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.equal(fixture.git("rev-list", "--count", "HEAD"), "1");
    assert.deepEqual(
      fixture.git("diff", "--cached", "--name-only").split("\n"),
      Object.keys(files).sort(),
    );
  });
}

test("failure to spawn git is reported as an error", (t) => {
  const fixture = makeFixture(t);
  const path = fixture.env.PATH;
  const emptyPath = join(fixture.cwd, ".git", "no-git");
  mkdirSync(emptyPath);
  fixture.env.PATH = emptyPath;
  const result = fixture.run("patch", "1.11.7");
  fixture.env.PATH = path;
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /spawnSync git ENOENT/);
  assert.equal(fixture.git("rev-list", "--count", "HEAD"), "1");
  assert.equal(fixture.git("diff", "--cached", "--name-only"), "");
});

test("pre-staged new file is rejected without modifying version files or committing", (t) => {
  const fixture = makeFixture(t);
  writeFileSync(join(fixture.cwd, "unrelated.txt"), "secret\n");
  fixture.git("add", "unrelated.txt");
  const indexBefore = fixture.git("ls-files", "--stage");

  const result = fixture.run("patch", "1.11.7");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /staged/i);

  for (const [name, data] of Object.entries(files)) {
    assert.deepEqual(fixture.read(name), data);
  }
  assert.equal(fixture.git("rev-list", "--count", "HEAD"), "1");
  assert.equal(fixture.git("diff", "--cached", "--name-only"), "unrelated.txt");
  assert.equal(fixture.git("ls-files", "--stage"), indexBefore);
});

test("pre-staged changes are rejected before prompting when no CLI answers are supplied", (t) => {
  const fixture = makeFixture(t);
  writeFileSync(join(fixture.cwd, "unrelated.txt"), "keep staged\n");
  fixture.git("add", "unrelated.txt");
  const indexBefore = fixture.git("ls-files", "--stage");
  const headBefore = fixture.git("rev-parse", "HEAD");
  const versionFilesBefore = Object.fromEntries(
    Object.keys(files).map((name) => [
      name,
      readFileSync(join(fixture.cwd, name), "utf8"),
    ]),
  );

  const result = fixture.run();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Cannot release with staged changes in Git index:/,
  );
  assert.equal(result.stdout, "");

  for (const [name, contents] of Object.entries(versionFilesBefore)) {
    assert.equal(readFileSync(join(fixture.cwd, name), "utf8"), contents);
  }
  assert.equal(fixture.git("rev-parse", "HEAD"), headBefore);
  assert.equal(fixture.git("ls-files", "--stage"), indexBefore);
  assert.equal(
    readFileSync(join(fixture.cwd, "unrelated.txt"), "utf8"),
    "keep staged\n",
  );
});

test("pre-staged edit to existing file is rejected with staged and unstaged edits preserved", (t) => {
  const fixture = makeFixture(t);
  writeFileSync(join(fixture.cwd, "notes.txt"), "base\n");
  fixture.git("add", "notes.txt");
  fixture.git("commit", "--quiet", "-m", "add notes");

  writeFileSync(join(fixture.cwd, "notes.txt"), "base\nstaged\n");
  fixture.git("add", "notes.txt");
  writeFileSync(join(fixture.cwd, "notes.txt"), "base\nstaged\nunstaged\n");
  const indexBefore = fixture.git("ls-files", "--stage");

  const result = fixture.run("patch", "1.11.7");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /staged/i);

  for (const [name, data] of Object.entries(files)) {
    assert.deepEqual(fixture.read(name), data);
  }
  assert.equal(fixture.git("rev-list", "--count", "HEAD"), "2");
  assert.equal(fixture.git("diff", "--cached", "--name-only"), "notes.txt");
  assert.equal(fixture.git("ls-files", "--stage"), indexBefore);
  assert.equal(fixture.git("show", ":notes.txt"), "base\nstaged");
  assert.equal(
    readFileSync(join(fixture.cwd, "notes.txt"), "utf8"),
    "base\nstaged\nunstaged\n",
  );
});

test("unstaged and untracked files are preserved outside the release commit when index is clean", (t) => {
  const fixture = makeFixture(t);
  writeFileSync(join(fixture.cwd, "notes.txt"), "base\n");
  fixture.git("add", "notes.txt");
  fixture.git("commit", "--quiet", "-m", "add notes");

  writeFileSync(join(fixture.cwd, "notes.txt"), "base\nunstaged\n");
  writeFileSync(join(fixture.cwd, "untracked.txt"), "temp\n");

  const result = fixture.run("patch", "1.11.7");
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fixture.git("rev-list", "--count", "HEAD"), "3");
  assert.deepEqual(
    fixture
      .git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
      .split("\n")
      .sort(),
    Object.keys(files).sort(),
  );
  assert.equal(
    readFileSync(join(fixture.cwd, "notes.txt"), "utf8"),
    "base\nunstaged\n",
  );
  assert.equal(
    readFileSync(join(fixture.cwd, "untracked.txt"), "utf8"),
    "temp\n",
  );
});
