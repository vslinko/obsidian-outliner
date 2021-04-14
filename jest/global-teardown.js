const fs = require("fs");
const debug = require("debug")("jest-obsidian");

module.exports = () => {
  if (global.wss) {
    global.wss.close();
  }
  if (global.obsidian) {
    global.obsidian.kill();
  }

  if (global.originalObsidianConfig) {
    debug(`Restoring ${OBSIDIAN_CONFIG_PATH}`);
    fs.writeFileSync(OBSIDIAN_CONFIG_PATH, originalObsidianConfig);
  }
};
