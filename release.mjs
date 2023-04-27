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

async function main() {
  const manifestFile = JSON.parse(readFileSync("manifest.json"));

  console.log(`Current version ${manifestFile.version}`);
  console.log(`Current minAppVersion ${manifestFile.minAppVersion}`);

  const { releaseType, minAppVersion } = await inquirer.prompt([
    {
      type: "list",
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
  ]);

  const newVersion = increaseVersion(manifestFile.version, releaseType);

  manifestFile.version = newVersion;
  manifestFile.minAppVersion = minAppVersion;
  writeFileSync("manifest.json", JSON.stringify(manifestFile, null, 2) + "\n");

  const packageLockFile = JSON.parse(readFileSync("package-lock.json"));
  packageLockFile.version = newVersion;
  packageLockFile.packages[""].version = newVersion;
  writeFileSync(
    "package-lock.json",
    JSON.stringify(packageLockFile, null, 2) + "\n"
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
    JSON.stringify(newVersionsFile, null, 2) + "\n"
  );

  spawnSync(
    "git",
    [
      "add",
      "manifest.json",
      "package-lock.json",
      "package.json",
      "versions.json",
    ],
    {
      stdio: "inherit",
    }
  );
  spawnSync("git", ["commit", "-m", newVersion], {
    stdio: "inherit",
  });
}

main();
