import { EventEmitter, once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import WebSocket, { WebSocketServer } from "ws";

const setupSource = fs.readFileSync(
  path.resolve(__dirname, "../../jest/global-setup.js"),
  "utf8",
);
const teardownSource = fs.readFileSync(
  path.resolve(__dirname, "../../jest/global-teardown.js"),
  "utf8",
);

const readySource = fs.readFileSync(
  path.resolve(__dirname, "../../jest/wait-for-ready.js"),
  "utf8",
);

function makeLifecycle(
  platform: string,
  skip: string | undefined,
  options: {
    dependencies?: Record<string, unknown>;
    globals?: Record<string, unknown>;
    env?: Record<string, string>;
  } = {},
) {
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
    ...options.dependencies,
  };
  const context = vm.createContext({
    process: {
      platform,
      env: {
        ...options.env,
        ...(skip === undefined ? {} : { SKIP_OBSIDIAN: skip }),
      },
      cwd: () => "/test-project",
    },
    ...options.globals,
    require: (name: string) => {
      if (name === "./wait-for-ready") {
        return load<Record<string, unknown>>(readySource);
      }
      if (name === "./global-teardown") {
        return load(teardownSource);
      }
      if (!Object.prototype.hasOwnProperty.call(dependencies, name)) {
        throw new Error(`Unexpected dependency: ${name}`);
      }
      return dependencies[name];
    },
  });
  context.global = context;

  // Wrap each file like CommonJS: module-local declarations stay separate,
  // while the hooks share globals as they do in Jest's lifecycle process.
  function load<T = () => void | Promise<void>>(source: string): T {
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

async function within<T>(
  operation: Promise<T>,
  description: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(description)), 2000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function makeFailingSetup(platform: string) {
  const child = new EventEmitter();
  const servers: WebSocketServer[] = [];
  let serverCreated: (server: WebSocketServer) => void;
  const started = new Promise<WebSocketServer>((resolve) => {
    serverCreated = resolve;
  });
  const lifecycle = makeLifecycle(platform, undefined, {
    dependencies: {
      ws: {
        Server: jest.fn().mockImplementation(() => {
          const server = new WebSocketServer({ port: 0, host: "127.0.0.1" });
          servers.push(server);
          serverCreated(server);
          return server;
        }),
      },
    },
    env: {
      HOME: "/synthetic-home",
      OBSIDIAN_STARTUP_TIMEOUT_MS: "1000",
    },
    globals: {
      Buffer,
      // Only bypass the pre-launch delay; the real readiness helper keeps its
      // real timeout and all socket events run on the real event loop.
      setTimeout: (callback: () => void, delay: number) =>
        setTimeout(callback, delay === 2000 ? 0 : delay),
      clearTimeout,
    },
  });
  const configPath = lifecycle.context.OBSIDIAN_CONFIG_PATH;
  const originalConfig =
    '{ "vaults": { "existing": { "path": "/original-vault", "open": true } } }';
  const files = new Map<string, string>([
    [configPath, originalConfig],
    ["/test-project/vault/.obsidian/app.json", "{}"],
  ]);
  const { effects } = lifecycle;
  effects.exec.mockReturnValue(child);
  effects.existsSync.mockImplementation((file: string) => files.has(file));
  effects.readFileSync.mockImplementation((file: string) => {
    if (!files.has(file)) {
      throw new Error(`Unexpected synthetic file: ${file}`);
    }
    return files.get(file);
  });
  effects.writeFileSync.mockImplementation((file: string, content: string) => {
    files.set(file, content);
  });
  effects.level.mockImplementation(() => ({
    put: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  }));
  return {
    ...lifecycle,
    child,
    started,
    servers,
    files,
    configPath,
    originalConfig,
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
      context.wss = { close: effects.close, clients: new Set() };
      context.originalObsidianConfig = '{"vaults":{}}';
      await teardown();

      for (const effect of Object.values(effects)) {
        expect(effect).not.toHaveBeenCalled();
      }
    },
  );

  test.each([
    ["silent peer timeout", /did not send ready within 1000 ms/],
    ["child exit", /exited with code 17 before sending ready/],
    ["child error", /failed to start: synthetic launch failure/],
    ["unexpected first message", /sent not-ready instead of ready/],
  ])(
    "failed setup cleans owned resources after %s",
    async (failure, message) => {
      const fixture = makeFailingSetup(platform);
      const { effects, child, files, configPath, originalConfig } = fixture;
      let client: WebSocket;
      // Observe rejection immediately, including when an assertion fails before
      // the synthetic child event is emitted. No real application is launched.
      const setupResult = Promise.resolve(fixture.setup()).then(
        (): undefined => undefined,
        (error: unknown) => error,
      );
      try {
        const server = await within(
          fixture.started,
          "Setup did not create server",
        );
        const serverClosed = new Promise<void>((resolve) => {
          server.once("close", resolve);
        });
        if (!server.address()) {
          await within(once(server, "listening"), "Server did not listen");
        }
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("Expected an ephemeral TCP server");
        }
        const connected = new Promise<WebSocket>((resolve) => {
          server.once("connection", resolve);
        });
        client = new WebSocket(`ws://127.0.0.1:${address.port}`);
        const clientClosed = new Promise<void>((resolve) => {
          client.once("close", () => resolve());
        });
        await within(once(client, "open"), "Client did not connect");
        const peer = await within(connected, "Server did not accept peer");
        const peerClosed = new Promise<void>((resolve) => {
          peer.once("close", () => resolve());
        });
        expect(peer.readyState).toBe(WebSocket.OPEN);
        expect(peer.listenerCount("message")).toBe(1);
        expect(files.get(configPath)).not.toBe(originalConfig);
        expect(effects.spawnSync).toHaveBeenCalledTimes(1);
        expect(effects.exec).toHaveBeenCalledTimes(1);
        expect(effects.spawn).not.toHaveBeenCalled();

        if (failure === "child exit") {
          child.emit("exit", 17);
        } else if (failure === "child error") {
          child.emit("error", new Error("synthetic launch failure"));
        } else if (failure === "unexpected first message") {
          client.send("not-ready");
        }

        expect(await within(setupResult, "Setup did not reject")).toMatchObject(
          {
            message: expect.stringMatching(message),
          },
        );
        expect(files.get(configPath)).toBe(originalConfig);
        expect(effects.writeFileSync).toHaveBeenLastCalledWith(
          configPath,
          originalConfig,
        );
        expect(effects.spawnSync).toHaveBeenCalledTimes(2);
        expect(effects.spawnSync).toHaveBeenLastCalledWith(
          ...(platform === "darwin"
            ? ["killall", ["Obsidian"]]
            : ["flatpak", ["kill", "md.obsidian.Obsidian"]]),
        );
        expect(peer.listenerCount("message")).toBe(0);

        // These must finish BEFORE emergency cleanup. In particular, close()
        // alone leaves a silent peer alive and never emits the server close.
        await within(
          Promise.all([serverClosed, clientClosed, peerClosed]),
          "Failed setup left its WebSocket server or client open",
        );
        expect(server.address()).toBeNull();
        expect(server.clients.size).toBe(0);
        expect(peer.readyState).toBe(WebSocket.CLOSED);
        expect(client.readyState).toBe(WebSocket.CLOSED);
      } finally {
        // Safety net only: assertions above must not depend on this cleanup.
        client?.terminate();
        for (const server of fixture.servers) {
          for (const peer of server.clients) {
            peer.terminate();
          }
          await new Promise<void>((resolve) => server.close(() => resolve()));
        }
        await within(
          setupResult,
          "Setup remained pending after safety cleanup",
        );
      }
    },
  );

  describe.each([undefined, ""])("without a truthy skip (%s)", (skip) => {
    test.each([null, '{"vaults":{}}'])(
      "teardown preserves integration cleanup with saved config %s",
      async (config) => {
        const { context, effects, teardown } = makeLifecycle(platform, skip);
        context.wss = { close: effects.close, clients: new Set() };
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
