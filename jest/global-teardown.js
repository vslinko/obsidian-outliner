const cp = require("child_process");
const fs = require("fs");
const debug = require("debug")("jest-obsidian");

module.exports = () => {
  if (global.wss) {
    global.wss.close();
  }

  cp.spawnSync(KILL_CMD[0], KILL_CMD.slice(1));

  if (global.originalObsidianConfig) {
    debug(`Restoring ${OBSIDIAN_CONFIG_PATH}`);
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, originalObsidianConfig);
  }
};
