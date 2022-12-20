import cp from "node:child_process";
import fs from "node:fs";

const manifestFile = JSON.parse(fs.readFileSync("manifest.json"));
const version = manifestFile.version.split(".").map((p) => Number(p));

if (process.argv[2] === "major") {
  version[0]++;
  version[1] = 0;
  version[2] = 0;
} else if (process.argv[2] === "minor") {
  version[1]++;
  version[2] = 0;
} else if (process.argv[2] === "patch") {
  version[2]++;
} else {
  console.log("Usage: node release.js (major|minor|patch)");
  process.exit(1);
}

const versionString = version.join(".");

manifestFile.version = versionString;
fs.writeFileSync("manifest.json", JSON.stringify(manifestFile, null, 2) + "\n");

const packageLockFile = JSON.parse(fs.readFileSync("package-lock.json"));
packageLockFile.version = versionString;
packageLockFile.packages[""].version = versionString;
fs.writeFileSync(
  "package-lock.json",
  JSON.stringify(packageLockFile, null, 2) + "\n"
);

const packageFile = JSON.parse(fs.readFileSync("package.json"));
packageFile.version = versionString;
fs.writeFileSync("package.json", JSON.stringify(packageFile, null, 2) + "\n");

const versionsFile = JSON.parse(fs.readFileSync("versions.json"));
const newVersionsFile = {
  [versionString]: manifestFile.minAppVersion,
  ...versionsFile,
};
fs.writeFileSync(
  "versions.json",
  JSON.stringify(newVersionsFile, null, 2) + "\n"
);

const gitAdd = cp.spawn(
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
gitAdd.on("close", () => {
  cp.spawn("git", ["commit", "-m", versionString], {
    stdio: "inherit",
  });
});
