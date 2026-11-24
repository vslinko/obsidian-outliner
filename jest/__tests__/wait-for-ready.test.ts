import { EventEmitter } from "node:events";
import WebSocket from "ws";

const loadWaitForReady = () => import("../wait-for-ready");

describe("waitForReady", () => {
  let wss: WebSocket.Server;
  let child: EventEmitter;
  let clients: WebSocket[];

  beforeEach(async () => {
    wss = new WebSocket.Server({ port: 0 });
    child = new EventEmitter();
    clients = [];
    await new Promise<void>((resolve) => wss.once("listening", resolve));
  });

  afterEach(async () => {
    for (const client of clients) {
      client.terminate();
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  const connect = () => {
    const address = wss.address();
    if (typeof address !== "object" || !address) {
      throw new Error("WebSocket server is not listening");
    }
    const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
    clients.push(client);
    return client;
  };

  test("resolves with the socket that sends ready", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    const client = connect();
    client.on("open", () => client.send("ready"));
    await expect(pending).resolves.toBeInstanceOf(WebSocket);
  });

  test("rejects when Obsidian exits before sending ready", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    child.emit("exit", 1);
    await expect(pending).rejects.toThrow(
      "Obsidian exited with code 1 before sending ready",
    );
  });

  test("rejects when Obsidian fails to start", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    child.emit("error", new Error("spawn failed"));
    await expect(pending).rejects.toThrow(
      "Obsidian failed to start: spawn failed",
    );
  });

  test("rejects when the first message is not ready", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    const client = connect();
    client.on("open", () => client.send("hello"));
    await expect(pending).rejects.toThrow(
      "Obsidian sent hello instead of ready",
    );
  });

  test("rejects when nothing connects before the deadline", async () => {
    const { waitForReady } = await loadWaitForReady();
    await expect(waitForReady({ wss, child, timeoutMs: 50 })).rejects.toThrow(
      "Obsidian did not send ready within 50 ms",
    );
  });
});
