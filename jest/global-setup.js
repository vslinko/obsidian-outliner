const cp = require("child_process");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");
const debug = require("debug")("jest-obsidian");
const promisify = require("util").promisify;
const levelup = require("levelup");
const leveldown = require("leveldown");

const KILL_CMD =
  process.platform === "darwin"
    ? ["killall", "Obsidian"]
    : ["flatpak", "kill", "md.obsidian.Obsidian"];
const OBSIDIAN_CONFIG_DIR =
  process.platform === "darwin"
    ? process.env.HOME + "/Library/Application Support/obsidian"
    : process.env.HOME + "/.var/app/md.obsidian.Obsidian/config/obsidian";
const OBSIDIAN_CONFIG_PATH = OBSIDIAN_CONFIG_DIR + "/obsidian.json";
const OBSIDIAN_APP_CMD =
  process.platform === "darwin"
    ? ["/Applications/Obsidian.app/Contents/MacOS/Obsidian"]
    : ["flatpak", "run", "md.obsidian.Obsidian"];
const OBSIDIAN_LOCAL_STORAGE_PATH =
  process.platform === "darwin"
    ? process.env.HOME +
      "/Library/Application Support/obsidian/Local Storage/leveldb"
    : process.env.HOME +
      "/.var/app/md.obsidian.Obsidian/config/obsidian/Local Storage/leveldb";
const OBISDIAN_TEST_VAULT_ID = "5a15473126091111";
const VAULT_DIR = process.cwd() + "/vault";

global.originalObsidianConfig = null;
global.OBSIDIAN_CONFIG_PATH = OBSIDIAN_CONFIG_PATH;
global.KILL_CMD = KILL_CMD;

function wait(t) {
  return new Promise((resolve) => setTimeout(resolve, t));
}

function runForAWhile({ timeout, fileToCheck }) {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();
    const obsidian = cp.spawn(OBSIDIAN_APP_CMD[0], OBSIDIAN_APP_CMD.slice(1));
    obsidian.on("error", reject);
    const i = setInterval(() => {
      if (fs.existsSync(fileToCheck)) {
        clearInterval(i);
        setTimeout(() => {
          cp.spawnSync(KILL_CMD[0], KILL_CMD.slice(1));
          resolve();
        }, 1000);
        return;
      }
      const diff = Date.now() - start;
      if (diff > timeout) {
        clearInterval(i);
        cp.spawnSync(KILL_CMD[0], KILL_CMD.slice(1));
        reject();
      }
    }, 1000);
  });
}

async function prepareObsidian() {
  debug(`Preparing Obsidian`);

  if (!fs.existsSync(OBSIDIAN_CONFIG_PATH)) {
    debug("  Running Obsidian for 90 seconds to setup");
    await runForAWhile({
      timeout: 90000,
      fileToCheck: OBSIDIAN_CONFIG_DIR,
    });
    await wait(2000);
    debug(`  Creating ${OBSIDIAN_CONFIG_PATH}`);
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, '{"vaults":{}}');
  }

  originalObsidianConfig = fs.readFileSync(OBSIDIAN_CONFIG_PATH, "utf-8");

  const obsidianConfig = JSON.parse(originalObsidianConfig);
  for (const key of Object.keys(obsidianConfig.vaults)) {
    debug(`  Closing vault ${obsidianConfig.vaults[key].path}`);
    obsidianConfig.vaults[key].open = false;
  }
  debug(`  Opening vault ${VAULT_DIR}`);
  obsidianConfig.vaults[OBISDIAN_TEST_VAULT_ID] = {
    path: VAULT_DIR,
    ts: Date.now(),
    open: true,
  };

  debug(`  Saving ${OBSIDIAN_CONFIG_PATH}`);
  fs.writeFileSync(OBSIDIAN_CONFIG_PATH, JSON.stringify(obsidianConfig));
}

async function prepareVault() {
  debug(`Prepare vault`);

  mkdirp.sync(VAULT_DIR);
  fs.writeFileSync(VAULT_DIR + "/test.md", "");

  const vaultConfigFilePath = `${VAULT_DIR}/.obsidian/app.json`;
  const vaultCommunityPluginsConfigFilePath = `${VAULT_DIR}/.obsidian/community-plugins.json`;
  const vaultPluginDir = `${VAULT_DIR}/.obsidian/plugins/obsidian-outliner`;

  if (!fs.existsSync(vaultConfigFilePath)) {
    debug("  Running Obsidian for 90 seconds to setup vault");
    await runForAWhile({ timeout: 90000, fileToCheck: vaultConfigFilePath });
    await wait(2000);
  }

  const vaultConfig = JSON.parse(fs.readFileSync(vaultConfigFilePath));
  const newVaultConfig = {
    ...vaultConfig,
    foldHeading: true,
    foldIndent: true,
    useTab: false,
    tabSize: 2,
    legacyEditor: false,
  };
  if (JSON.stringify(vaultConfig) !== JSON.stringify(newVaultConfig)) {
    debug(`  Saving ${vaultConfigFilePath}`);
    fs.writeFileSync(vaultConfigFilePath, JSON.stringify(newVaultConfig));
  }

  debug(`  Saving ${vaultCommunityPluginsConfigFilePath}`);
  fs.writeFileSync(
    vaultCommunityPluginsConfigFilePath,
    JSON.stringify(["obsidian-outliner"])
  );

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

  debug(`  Copying ${vaultPluginDir}/main.js`);
  fs.copyFileSync("main.js", `${vaultPluginDir}/main.js`);
  debug(`  Copying ${vaultPluginDir}/manifest.json`);
  fs.copyFileSync("manifest.json", `${vaultPluginDir}/manifest.json`);
  debug(`  Copying ${vaultPluginDir}/styles.css`);
  fs.copyFileSync("styles.css", `${vaultPluginDir}/styles.css`);
}

module.exports = async () => {
  if (process.env.SKIP_OBSIDIAN) {
    return;
  }

  cp.spawnSync(KILL_CMD[0], KILL_CMD.slice(1));
  await wait(2000);

  await prepareObsidian();
  await prepareVault();

  global.wss = new WebSocket.Server({
    port: 8080,
  });

  debug(`Running "${OBSIDIAN_APP_CMD[0]}"`);
  const obsidian = cp.exec(OBSIDIAN_APP_CMD.join(" "), {
    env: {
      ...process.env,
      TEST_PLATFORM: "1",
    },
  });
  obsidian.on("exit", (code) => {
    debug(`Obsidian exited with code ${code}`);
  });

  debug("Waiting for Obsidian WebSocket connection");
  const obsidianWs = await new Promise((resolve) => {
    wss.once("connection", (ws) => {
      debug("Waiting for Obsidian ready message");
      ws.once("message", (msg) => {
        if (msg.toString() === "ready") {
          resolve(ws);
        }
      });
    });
  });
  debug("Obsidian WebSocket ready");

  const callbacks = new Map();

  obsidianWs.on("message", (message) => {
    const { id, data, error } = JSON.parse(message);
    debug(`Response from Obsidian ${id}`);
    const cb = callbacks.get(id);
    if (cb) {
      callbacks.delete(id);
      cb(error, data);
    } else {
      debug(`Callback not found for ${id}`);
      process.exit(1);
    }
  });

  debug("Waiting for test environment connection");
  wss.on("connection", (ws) => {
    debug("Test environment connected");
    ws.on("message", (message) => {
      const { id, type, data } = JSON.parse(message);
      debug(`Request to Obsidian ${type} ${id}`);
      callbacks.set(id, (error, data) => {
        ws.send(JSON.stringify({ id, error, data }));
      });
      obsidianWs.send(JSON.stringify({ id, type, data }));
    });
  });
};
