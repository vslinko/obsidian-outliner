const fs = require("fs");
const debug = require("debug")("jest-obsidian");

module.exports = async () => {
  const p = new Promise(resolve => {
    obsidian.once("exit", resolve);
  });

  if (global.wss) {
    global.wss.close();
  }
  if (global.obsidian) {
    global.obsidian.kill();
  }

  await p;

  if (global.originalTestFile) {
    debug(`Restoring ${TEST_FILE_PATH}`);
    fs.writeFileSync(TEST_FILE_PATH, originalTestFile);
  }

  if (global.originalVaultConfig) {
    debug(`Restoring ${VAULT_CONFIG_PATH}`);
    fs.writeFileSync(VAULT_CONFIG_PATH, originalVaultConfig);
  }

  if (global.originalObsidianConfig) {
    debug(`Restoring ${OBSIDIAN_CONFIG_PATH}`);
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, originalObsidianConfig);
  }
};
