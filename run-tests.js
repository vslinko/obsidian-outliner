const cp = require("child_process");
const chalk = require("chalk");
const fs = require("fs");

const vaultPath =
  "/Users/vslinko/Library/Mobile Documents/com~apple~CloudDocs/vslinko-zettelkasten";
const resultsPath = `${vaultPath}/results.json`;

if (fs.existsSync(resultsPath)) {
  fs.unlinkSync(resultsPath);
}

const obsidian = cp.spawn(
  "/Applications/Obsidian.app/Contents/MacOS/Obsidian",
  {
    env: {
      ...process.env,
      RUN_OUTLINER_TESTS: "1",
    },
  }
);

obsidian.on("exit", (code) => {
  process.exit(code);
});

setTimeout(() => {
  console.log("Timeout");
  process.exit(1);
}, 1000 * 60 * 5);

setInterval(() => {
  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));

    const summaryColor = results.failed === 0 ? chalk.green : chalk.red;
    console.log(summaryColor(`${results.passed}/${results.total} passed`));
    console.log();

    for (const test of results.tests) {
      console.log(
        `> ${chalk.gray(test.name)} ${
          test.passed ? chalk.green("PASSED") : chalk.red("FAIL")
        }`
      );
    }

    obsidian.kill();
    process.exit(0);
  }
}, 1000);
