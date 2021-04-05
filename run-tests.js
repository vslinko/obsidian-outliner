const cp = require("child_process");
const mkdirp = require("mkdirp");
const chalk = require("chalk");
const fs = require("fs");

const RESULTS_FILE_PATH = "results.json";

const OBSIDIAN_CONFIG_PATH = {
  darwin:
    process.env.HOME + "/Library/Application Support/obsidian/obsidian.json",
  linux: process.env.HOME + "/.config/obsidian/obsidian.json",
}[process.platform];

const OBSIDIAN_APP_CMD = {
  darwin: "/Applications/Obsidian.app/Contents/MacOS/Obsidian",
  linux: "flatpak run md.obsidian.Obsidian",
}[process.platform];

const OBISDIAN_TEST_VAULT_ID = "5a15473126091111";

const originalObsidianConfig = fs.readFileSync(OBSIDIAN_CONFIG_PATH, "utf-8");

function runForAWhile(timeout) {
  return new Promise((resolve, reject) => {
    const obsidian = cp.spawn(OBSIDIAN_APP_CMD);
    obsidian.on("error", reject);
    setTimeout(() => {
      obsidian.kill();
      resolve();
    }, timeout);
  });
}

function prepareObsidian() {
  if (!fs.existsSync(OBSIDIAN_CONFIG_PATH)) {
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, '{"vaults":{}}');
  }

  const obsidianConfig = JSON.parse(originalObsidianConfig);
  for (const key of Object.keys(obsidianConfig.vaults)) {
    obsidianConfig.vaults[key].open = false;
  }
  obsidianConfig.vaults[OBISDIAN_TEST_VAULT_ID] = {
    path: process.cwd(),
    ts: Date.now(),
    open: true,
  };

  fs.writeFileSync(OBSIDIAN_CONFIG_PATH, JSON.stringify(obsidianConfig));
}

async function prepareVault() {
  const vaultConfigFilePath = ".obsidian/config";
  const vaultPluginDir = ".obsidian/plugins/obsidian-outliner";

  if (!fs.existsSync(vaultConfigFilePath)) {
    await runForAWhile(3000);
  }

  const vaultConfig = JSON.parse(fs.readFileSync(vaultConfigFilePath));
  if (!vaultConfig.enabledPlugins) {
    vaultConfig.enabledPlugins = [];
  }
  if (!vaultConfig.enabledPlugins.includes("obsidian-outliner")) {
    vaultConfig.enabledPlugins.push("obsidian-outliner");
    fs.writeFileSync(vaultConfigFilePath, JSON.stringify(vaultConfig));
  }

  mkdirp.sync(vaultPluginDir);

  if (!fs.existsSync(`${vaultPluginDir}/main.js`)) {
    fs.linkSync("main.js", `${vaultPluginDir}/main.js`);
  }
  if (!fs.existsSync(`${vaultPluginDir}/manifest.json`)) {
    fs.linkSync("manifest.json", `${vaultPluginDir}/manifest.json`);
  }
  if (!fs.existsSync(`${vaultPluginDir}/styles.css`)) {
    fs.linkSync("styles.css", `${vaultPluginDir}/styles.css`);
  }

  if (fs.existsSync(RESULTS_FILE_PATH)) {
    fs.unlinkSync(RESULTS_FILE_PATH);
  }
}

function exit(code) {
  fs.writeFileSync(OBSIDIAN_CONFIG_PATH, originalObsidianConfig);
  process.exit(code);
}

function printResults(results) {
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
}

async function main() {
  await prepareObsidian();
  await prepareVault();

  const obsidian = cp.spawn(OBSIDIAN_APP_CMD, {
    env: {
      ...process.env,
      RUN_OUTLINER_TESTS: "1",
    },
  });
  obsidian.on("exit", (code) => {
    exit(code);
  });

  setTimeout(() => {
    console.log("Timeout");
    exit(1);
  }, 1000 * 60 * 5);

  setInterval(() => {
    if (fs.existsSync(RESULTS_FILE_PATH)) {
      const results = JSON.parse(fs.readFileSync(RESULTS_FILE_PATH, "utf-8"));

      printResults(results);

      obsidian.kill();
      exit(0);
    }
  }, 1000);
}

main();
