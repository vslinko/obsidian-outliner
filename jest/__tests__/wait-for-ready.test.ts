import { EventEmitter } from "node:events";
import WebSocket, { WebSocketServer } from "ws";

const loadWaitForReady = () => import("../wait-for-ready");

describe("waitForReady", () => {
  let wss: WebSocketServer;
  let child: EventEmitter;
  let clients: WebSocket[];

  beforeEach(async () => {
    wss = new WebSocketServer({ port: 0 });
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

  const connect = async () => {
    const address = wss.address();
    if (typeof address !== "object" || !address) {
      throw new Error("WebSocket server is not listening");
    }
    const connection = new Promise<WebSocket>((resolve) =>
      wss.once("connection", resolve),
    );
    const client = new WebSocket(`ws://127.0.0.1:${address.port}`);
    clients.push(client);
    const [socket] = await Promise.all([
      connection,
      new Promise<void>((resolve, reject) => {
        client.once("open", resolve);
        client.once("error", reject);
      }),
    ]);
    return { client, socket };
  };

  const expectListenersReleased = () => {
    expect(wss.listenerCount("connection")).toBe(0);
    expect(child.listenerCount("exit")).toBe(0);
    expect(child.listenerCount("error")).toBe(0);
    for (const socket of wss.clients) {
      expect(socket.listenerCount("message")).toBe(0);
    }
  };

  test("resolves with the socket that sends ready", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    await connect(); // Another connected peer never sends ready.
    const { client, socket } = await connect();
    client.send("ready");
    await expect(pending).resolves.toBe(socket);
    expectListenersReleased();
    expect(socket.readyState).toBe(WebSocket.OPEN);

    // The successful socket remains available for the setup's RPC transport.
    const message = new Promise<WebSocket.RawData>((resolve) =>
      socket.once("message", resolve),
    );
    client.send("rpc");
    expect((await message).toString()).toBe("rpc");
  });

  test("rejects when Obsidian exits before sending ready", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    await connect();
    child.emit("exit", 1);
    await expect(pending).rejects.toThrow(
      "Obsidian exited with code 1 before sending ready",
    );
    expectListenersReleased();
  });

  test("rejects when Obsidian fails to start", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    await connect();
    child.emit("error", new Error("spawn failed"));
    await expect(pending).rejects.toThrow(
      "Obsidian failed to start: spawn failed",
    );
    expectListenersReleased();
  });

  test("rejects when the first message is not ready", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    await connect();
    const { client } = await connect();
    client.send("hello");
    await expect(pending).rejects.toThrow(
      "Obsidian sent hello instead of ready",
    );
    expectListenersReleased();
  });

  test("rejects when nothing connects before the deadline", async () => {
    const { waitForReady } = await loadWaitForReady();
    await expect(waitForReady({ wss, child, timeoutMs: 50 })).rejects.toThrow(
      "Obsidian did not send ready within 50 ms",
    );
    expectListenersReleased();
  });

  test("releases ready listeners when a connected peer stays silent", async () => {
    const { waitForReady } = await loadWaitForReady();
    const pending = waitForReady({ wss, child, timeoutMs: 2000 });
    const rejection = expect(pending).rejects.toThrow(
      "Obsidian did not send ready within 2000 ms",
    );
    await connect();
    await rejection;
    expectListenersReleased();
  });
});
