import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const setupSource = fs.readFileSync(
  path.resolve(__dirname, "../../jest/global-setup.js"),
  "utf8",
);
const teardownSource = fs.readFileSync(
  path.resolve(__dirname, "../../jest/global-teardown.js"),
  "utf8",
);

function makeLifecycle(platform: string, skip: string | undefined) {
  const effects = {
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    exec: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    copyFileSync: jest.fn(),
    server: jest.fn(),
    close: jest.fn(),
    level: jest.fn(),
  };
  const dependencies: Record<string, unknown> = {
    child_process: effects,
    fs: effects,
    ws: { Server: effects.server },
    debug: () => () => {},
    "classic-level": { ClassicLevel: effects.level },
  };
  const context = vm.createContext({
    process: {
      platform,
      env: skip === undefined ? {} : { SKIP_OBSIDIAN: skip },
      cwd: () => "/test-project",
    },
    require: (name: string) => {
      if (!Object.prototype.hasOwnProperty.call(dependencies, name)) {
        throw new Error(`Unexpected dependency: ${name}`);
      }
      return dependencies[name];
    },
  });
  context.global = context;

  // Wrap each file like CommonJS: module-local declarations stay separate,
  // while the hooks share globals as they do in Jest's lifecycle process.
  function load(source: string): () => void | Promise<void> {
    return vm.runInContext(
      `(function () { const module = { exports: {} };\n${source}\nreturn module.exports; })()`,
      context,
    );
  }

  return {
    context,
    effects,
    setup: load(setupSource),
    teardown: load(teardownSource),
  };
}

describe.each(["darwin", "linux"])("Jest lifecycle on %s", (platform) => {
  test.each(["1", "true", "0"])(
    "SKIP_OBSIDIAN=%s makes setup and teardown side-effect free",
    async (skip) => {
      const { context, effects, setup, teardown } = makeLifecycle(
        platform,
        skip,
      );
      await setup();

      // Even stale cleanup state must not cause a unit-only teardown to touch
      // an application, configuration or WebSocket server it does not own.
      context.wss = { close: effects.close };
      context.originalObsidianConfig = '{"vaults":{}}';
      await teardown();

      for (const effect of Object.values(effects)) {
        expect(effect).not.toHaveBeenCalled();
      }
    },
  );

  describe.each([undefined, ""])("without a truthy skip (%s)", (skip) => {
    test.each([null, '{"vaults":{}}'])(
      "teardown preserves integration cleanup with saved config %s",
      async (config) => {
        const { context, effects, teardown } = makeLifecycle(platform, skip);
        context.wss = { close: effects.close };
        context.originalObsidianConfig = config;
        await teardown();

        expect(effects.close).toHaveBeenCalledTimes(1);
        expect(effects.spawnSync).toHaveBeenCalledTimes(1);
        expect(effects.spawnSync).toHaveBeenCalledWith(
          ...(platform === "darwin"
            ? ["killall", ["Obsidian"]]
            : ["flatpak", ["kill", "md.obsidian.Obsidian"]]),
        );
        if (config) {
          expect(effects.writeFileSync).toHaveBeenCalledTimes(1);
          expect(effects.writeFileSync).toHaveBeenCalledWith(
            context.OBSIDIAN_CONFIG_PATH,
            config,
          );
        } else {
          expect(effects.writeFileSync).not.toHaveBeenCalled();
        }
      },
    );
  });
});
