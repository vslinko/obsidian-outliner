const cp = require("child_process");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");
const debug = require("debug")("jest-obsidian");
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

global.originalObsidianConfig = null;
global.OBSIDIAN_CONFIG_PATH = OBSIDIAN_CONFIG_PATH;

function wait(t) {
  return new Promise((resolve) => setTimeout(resolve, t));
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
  debug(`Preparing Obsidian`);

  if (!fs.existsSync(OBSIDIAN_CONFIG_PATH)) {
    debug("  Running Obsidian for 30 seconds to setup");
    await runForAWhile(30000);
    await wait(1000);
    debug(`  Creating ${OBSIDIAN_CONFIG_PATH}`);
    mkdirp.sync(path.dirname(OBSIDIAN_CONFIG_PATH));
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, '{"vaults":{}}');
  }

  originalObsidianConfig = fs.readFileSync(OBSIDIAN_CONFIG_PATH, "utf-8");

  const obsidianConfig = JSON.parse(originalObsidianConfig);
  for (const key of Object.keys(obsidianConfig.vaults)) {
    debug(`  Closing vault ${obsidianConfig.vaults[key].path}`);
    obsidianConfig.vaults[key].open = false;
  }
  debug(`  Opening vault ${process.cwd()}`);
  obsidianConfig.vaults[OBISDIAN_TEST_VAULT_ID] = {
    path: process.cwd(),
    ts: Date.now(),
    open: true,
  };

  debug(`  Saving ${OBSIDIAN_CONFIG_PATH}`);
  fs.writeFileSync(OBSIDIAN_CONFIG_PATH, JSON.stringify(obsidianConfig));
}

async function prepareVault() {
  debug(`Prepare vault`);

  const vaultConfigFilePath = ".obsidian/app.json";
  const vaultPluginDir = ".obsidian/plugins/obsidian-outliner";

  if (!fs.existsSync(vaultConfigFilePath)) {
    debug("  Running Obsidian for 5 seconds to setup vault");
    await runForAWhile(5000);
    await wait(1000);
  }

  const vaultConfig = JSON.parse(fs.readFileSync(vaultConfigFilePath));
  if (!vaultConfig.enabledPlugins) {
    vaultConfig.enabledPlugins = [];
  }
  vaultConfig.foldIndent = true;
  vaultConfig.tabSize = 2;
  vaultConfig.useTab = false;
  if (!vaultConfig.enabledPlugins.includes("obsidian-outliner")) {
    debug(`  Enabling obsidian-outliner plugin`);
    vaultConfig.enabledPlugins.push("obsidian-outliner");

    debug(`  Saving ${vaultConfigFilePath}`);
    fs.writeFileSync(vaultConfigFilePath, JSON.stringify(vaultConfig));
  }

  debug(`  Disabling Safe Mode`);
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
    debug(`  Linking ${vaultPluginDir}/main.js`);
    fs.linkSync("main.js", `${vaultPluginDir}/main.js`);
  }
  if (!fs.existsSync(`${vaultPluginDir}/manifest.json`)) {
    debug(`  Linking ${vaultPluginDir}/manifest.json`);
    fs.linkSync("manifest.json", `${vaultPluginDir}/manifest.json`);
  }
  if (!fs.existsSync(`${vaultPluginDir}/styles.css`)) {
    debug(`  Linking ${vaultPluginDir}/styles.css`);
    fs.linkSync("styles.css", `${vaultPluginDir}/styles.css`);
  }

  if (fs.existsSync(RESULTS_FILE_PATH)) {
    debug(`  Deleting ${RESULTS_FILE_PATH}`);
    fs.unlinkSync(RESULTS_FILE_PATH);
  }
}

module.exports = async () => {
  if (process.env.SKIP_OBSIDIAN) {
    return;
  }

  await prepareObsidian();
  await prepareVault();

  global.wss = new WebSocket.Server({
    port: 8080,
  });

  debug(`Running "${OBSIDIAN_APP_CMD}"`);
  global.obsidian = cp.exec(OBSIDIAN_APP_CMD, {
    env: {
      ...process.env,
      TEST_PLATFORM: "1",
    },
  });
  obsidian.on("exit", (code) => {
    debug(`Obsidian exited with code ${code}`);
  });

  const obsidianWs = await new Promise((resolve) => {
    wss.once("connection", (ws) => {
      resolve(ws);
    });
  });

  const callbacks = new Map();

  obsidianWs.on("message", (message) => {
    const { id, data, error } = JSON.parse(message);
    const cb = callbacks.get(id);
    if (cb) {
      callbacks.delete(id);
      cb(error, data);
    }
  });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      const { id, type, data } = JSON.parse(message);
      callbacks.set(id, (error, data) => {
        ws.send(JSON.stringify({ id, error, data }));
      });
      obsidianWs.send(JSON.stringify({ id, type, data }));
    });
  });
};
