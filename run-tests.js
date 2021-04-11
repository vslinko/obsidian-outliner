const cp = require("child_process");
const mkdirp = require("mkdirp");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const promisify = require("util").promisify;
const levelup = require("levelup");
const leveldown = require("leveldown");

const RESULTS_FILE_PATH = "results.json";
const OBSIDIAN_CONFIG_PATH =
  process.env.HOME + "/Library/Application Support/obsidian/obsidian.json";
const OBSIDIAN_APP_CMD = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
const OBSIDIAN_LOCAL_STORAGE_PATH =
  process.env.HOME +
  "/Library/Application Support/obsidian/Local Storage/leveldb";
const OBISDIAN_TEST_VAULT_ID = "5a15473126091111";

let originalObsidianConfig;

function wait(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

function runForAWhile(timeout) {
  return new Promise(async (resolve, reject) => {
    const obsidian = cp.spawn(OBSIDIAN_APP_CMD);
    obsidian.on("error", reject);
    await wait(timeout);
    obsidian.kill();
    resolve();
  });
}

async function prepareObsidian() {
  console.log(`Preparing Obsidian`);

  if (!fs.existsSync(OBSIDIAN_CONFIG_PATH)) {
    console.log("  Running Obsidian for 30 seconds to setup");
    await runForAWhile(30000);
    await wait(1000);
    console.log(`  Creating ${OBSIDIAN_CONFIG_PATH}`);
    mkdirp.sync(path.dirname(OBSIDIAN_CONFIG_PATH));
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, '{"vaults":{}}');
  }

  originalObsidianConfig = fs.readFileSync(OBSIDIAN_CONFIG_PATH, "utf-8");

  const obsidianConfig = JSON.parse(originalObsidianConfig);
  for (const key of Object.keys(obsidianConfig.vaults)) {
    console.log(`  Closing vault ${obsidianConfig.vaults[key].path}`);
    obsidianConfig.vaults[key].open = false;
  }
  console.log(`  Opening vault ${process.cwd()}`);
  obsidianConfig.vaults[OBISDIAN_TEST_VAULT_ID] = {
    path: process.cwd(),
    ts: Date.now(),
    open: true,
  };

  console.log(`  Saving ${OBSIDIAN_CONFIG_PATH}`);
  fs.writeFileSync(OBSIDIAN_CONFIG_PATH, JSON.stringify(obsidianConfig));
}

async function prepareVault() {
  console.log(`Prepare vault`);

  const vaultConfigFilePath = ".obsidian/config";
  const vaultPluginDir = ".obsidian/plugins/obsidian-outliner";

  if (!fs.existsSync(vaultConfigFilePath)) {
    console.log("  Running Obsidian for 5 seconds to setup vault");
    await runForAWhile(5000);
    await wait(1000);
  }

  const vaultConfig = JSON.parse(fs.readFileSync(vaultConfigFilePath));
  if (!vaultConfig.enabledPlugins) {
    vaultConfig.enabledPlugins = [];
  }
  if (!vaultConfig.enabledPlugins.includes("obsidian-outliner")) {
    console.log(`  Enabling obsidian-outliner plugin`);
    vaultConfig.enabledPlugins.push("obsidian-outliner");

    console.log(`  Saving ${vaultConfigFilePath}`);
    fs.writeFileSync(vaultConfigFilePath, JSON.stringify(vaultConfig));
  }

  console.log(`  Disabling Safe Mode`);
  mkdirp.sync(OBSIDIAN_LOCAL_STORAGE_PATH);
  const localStorage = levelup(leveldown(OBSIDIAN_LOCAL_STORAGE_PATH));
  const key = Buffer.from(
    "5f6170703a2f2f6f6273696469616e2e6d640001656e61626c652d706c7567696e2d35613135343733313236303931313131",
    "hex"
  );
  const value = Buffer.from("0174727565", "hex");
  await promisify(localStorage.put.bind(localStorage))(key, value);
  await promisify(localStorage.close.bind(localStorage))();

  mkdirp.sync(vaultPluginDir);

  if (!fs.existsSync(`${vaultPluginDir}/main.js`)) {
    console.log(`  Linking ${vaultPluginDir}/main.js`);
    fs.linkSync("main.js", `${vaultPluginDir}/main.js`);
  }
  if (!fs.existsSync(`${vaultPluginDir}/manifest.json`)) {
    console.log(`  Linking ${vaultPluginDir}/manifest.json`);
    fs.linkSync("manifest.json", `${vaultPluginDir}/manifest.json`);
  }
  if (!fs.existsSync(`${vaultPluginDir}/styles.css`)) {
    console.log(`  Linking ${vaultPluginDir}/styles.css`);
    fs.linkSync("styles.css", `${vaultPluginDir}/styles.css`);
  }

  if (fs.existsSync(RESULTS_FILE_PATH)) {
    console.log(`  Deleting ${RESULTS_FILE_PATH}`);
    fs.unlinkSync(RESULTS_FILE_PATH);
  }
}

function exit(code) {
  if (originalObsidianConfig) {
    console.log(`Restoring ${OBSIDIAN_CONFIG_PATH}`);
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, originalObsidianConfig);
  }
  process.exit(code);
}

function printResults(results) {
  const summaryColor = results.failed === 0 ? chalk.green : chalk.red;
  console.log();
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

  console.log(`Running "${OBSIDIAN_APP_CMD}"`);
  const obsidian = cp.exec(OBSIDIAN_APP_CMD, {
    env: {
      ...process.env,
      RUN_OUTLINER_TESTS: "1",
    },
  });
  obsidian.on("exit", (code) => {
    console.log(`Obsidian exited with code ${code}`);
    exit(code);
  });

  for (let i = 0; i < 50; i++) {
    await wait(1000);

    if (fs.existsSync(RESULTS_FILE_PATH)) {
      console.log(`Found ${RESULTS_FILE_PATH}`);

      await wait(1000);

      const results = JSON.parse(fs.readFileSync(RESULTS_FILE_PATH, "utf-8"));
      printResults(results);
      obsidian.kill();
      exit(results.failed === 0 ? 0 : 1);
    }
  }

  console.log("Timeout");
  exit(1);
}

main();
