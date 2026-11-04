import inquirer from "inquirer";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function increaseVersion(version, releaseType) {
  const v = version.split(".").map((p) => Number(p));

  if (releaseType === "major") {
    v[0]++;
    v[1] = 0;
    v[2] = 0;
  } else if (releaseType === "minor") {
    v[1]++;
    v[2] = 0;
  } else if (releaseType === "patch") {
    v[2]++;
  } else {
    throw new Error();
  }

  return v.join(".");
}

function runGit(...args) {
  const result = spawnSync("git", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed: ${result.signal ?? result.status}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const [releaseTypeArg, minAppVersionArg] = args;

  if (args.length > 2) {
    throw new Error(
      "Usage: node release.mjs [major|minor|patch] [minAppVersion]",
    );
  }
  if (
    releaseTypeArg !== undefined &&
    !["major", "minor", "patch"].includes(releaseTypeArg)
  ) {
    throw new Error("releaseType must be major, minor or patch");
  }

  const suppliedAnswers = {};
  if (releaseTypeArg !== undefined) {
    suppliedAnswers.releaseType = releaseTypeArg;
  }
  if (minAppVersionArg !== undefined) {
    suppliedAnswers.minAppVersion = minAppVersionArg;
  }

  const manifestFile = JSON.parse(readFileSync("manifest.json"));

  console.log(`Current version ${manifestFile.version}`);
  console.log(`Current minAppVersion ${manifestFile.minAppVersion}`);

  const { releaseType, minAppVersion } = await inquirer.prompt(
    [
      {
        type: "select",
        name: "releaseType",
        message: "Release type:",
        choices: [
          {
            name: "major (Some major changes that have, or could lead to, breaking changes)",
            value: "major",
          },
          {
            name: "minor (Some notable changes without breaking changes)",
            value: "minor",
          },
          {
            name: "patch (Some changes, but without new features)",
            value: "patch",
          },
        ],
      },
      {
        type: "input",
        name: "minAppVersion",
        message: "Minimum supported version of Obsidian:",
        default: manifestFile.minAppVersion,
      },
    ],
    suppliedAnswers,
  );

  const newVersion = increaseVersion(manifestFile.version, releaseType);

  manifestFile.version = newVersion;
  manifestFile.minAppVersion = minAppVersion;
  writeFileSync("manifest.json", JSON.stringify(manifestFile, null, 2) + "\n");

  const packageLockFile = JSON.parse(readFileSync("package-lock.json"));
  packageLockFile.version = newVersion;
  packageLockFile.packages[""].version = newVersion;
  writeFileSync(
    "package-lock.json",
    JSON.stringify(packageLockFile, null, 2) + "\n",
  );

  const packageFile = JSON.parse(readFileSync("package.json"));
  packageFile.version = newVersion;
  writeFileSync("package.json", JSON.stringify(packageFile, null, 2) + "\n");

  const versionsFile = JSON.parse(readFileSync("versions.json"));
  const newVersionsFile = {
    [newVersion]: minAppVersion,
    ...versionsFile,
  };
  writeFileSync(
    "versions.json",
    JSON.stringify(newVersionsFile, null, 2) + "\n",
  );

  runGit(
    "add",
    "manifest.json",
    "package-lock.json",
    "package.json",
    "versions.json",
  );
  runGit("commit", "-m", newVersion);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
