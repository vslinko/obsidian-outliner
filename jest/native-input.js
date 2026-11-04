const http = require("http");
const WebSocket = require("ws");

const TIMEOUT = 5000;

function targets() {
  return new Promise((resolve, reject) => {
    const request = http.get("http://127.0.0.1:9222/json/list", (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        try {
          if (response.statusCode !== 200)
            throw new Error(`CDP HTTP ${response.statusCode}`);
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(TIMEOUT, () =>
      request.destroy(new Error("CDP discovery timed out")),
    );
    request.on("error", reject);
  });
}

class Connection {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.contexts = new Set();
    this.id = 0;
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ws.terminate();
        reject(new Error("CDP connection timed out"));
      }, TIMEOUT);
      this.ws.once("open", () => {
        clearTimeout(timer);
        resolve();
      });
      this.ws.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    this.ws.on("message", (raw) => {
      const message = JSON.parse(raw);
      if (message.method === "Runtime.executionContextCreated") {
        this.contexts.add(message.params.context.id);
      }
      const callback = this.pending.get(message.id);
      if (callback) {
        this.pending.delete(message.id);
        clearTimeout(callback.timer);
        if (message.error)
          callback.reject(new Error(JSON.stringify(message.error)));
        else callback.resolve(message.result);
      }
    });
    this.ws.on("close", () => {
      for (const callback of this.pending.values()) {
        clearTimeout(callback.timer);
        callback.reject(new Error("CDP target closed"));
      }
      this.pending.clear();
    });
  }

  async send(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out`));
      }, TIMEOUT);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.terminate();
  }
}

// No synthetic fallback: Input.dispatchMouseEvent must generate the trusted
// mouseup -> click/default action in Chromium, in the same native release task.
module.exports = class NativeInput {
  constructor() {
    this.windows = new Map();
    this.held = null;
  }

  async find(window) {
    const cached = this.windows.get(window);
    if (cached?.ws.readyState === WebSocket.OPEN) return cached;
    const pages = (await targets()).filter((target) => target.type === "page");
    for (const page of pages) {
      const connection = new Connection(page.webSocketDebuggerUrl);
      let matched = false;
      try {
        await connection.send("Runtime.enable");
        // Electron pop-outs normally have their own target; inspecting runtime
        // contexts also handles auxiliary windows exposed within a page target.
        for (const contextId of connection.contexts) {
          const result = await connection.send("Runtime.evaluate", {
            contextId,
            expression:
              "typeof document !== 'undefined' && document.documentElement.dataset.outlinerTestWindow",
            returnByValue: true,
          });
          if (result.result?.value === window) {
            this.windows.set(window, connection);
            matched = true;
            return connection;
          }
        }
      } finally {
        if (!matched) connection.close();
      }
    }
    throw new Error(
      `No CDP Obsidian ${window} document with installed handle fixture (targets=${pages.length})`,
    );
  }

  async run(opts) {
    if (opts.action === "reset") {
      if (this.held) {
        const { connection, x, y } = this.held;
        this.held = null;
        if (connection.ws.readyState === WebSocket.OPEN) {
          await connection.send("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x,
            y,
            button: "left",
            buttons: 0,
            clickCount: 1,
          });
        }
      }
      // A closed pop-out must not leave a cached target for the next test.
      this.close();
      return;
    }
    const connection = await this.find(opts.window || "main");
    if (opts.action === "escape" || opts.action === "enter") {
      const escape = opts.action === "escape";
      const key = escape ? "Escape" : "Enter";
      const keyCode = escape ? 27 : 13;
      await connection.send("Input.dispatchKeyEvent", {
        type: escape ? "rawKeyDown" : "keyDown",
        key,
        code: key,
        text: escape ? undefined : "\r",
        unmodifiedText: escape ? undefined : "\r",
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
      });
      await connection.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key,
        code: key,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
      });
      return;
    }
    const { x, y } = opts;
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new Error("Native input requires finite viewport coordinates");
    const type = {
      move: "mouseMoved",
      down: "mousePressed",
      up: "mouseReleased",
    }[opts.action];
    if (!type) throw new Error(`Unknown native input action ${opts.action}`);
    await connection.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: opts.action === "move" && !this.held ? "none" : "left",
      buttons:
        opts.action === "up"
          ? 0
          : opts.action === "down"
            ? 1
            : this.held
              ? 1
              : 0,
      clickCount: opts.action === "move" ? 0 : 1,
    });
    if (opts.action === "down") this.held = { connection, x, y };
    else if (opts.action === "up") this.held = null;
    else if (this.held) Object.assign(this.held, { x, y });
  }

  close() {
    for (const connection of this.windows.values()) connection.close();
    this.windows.clear();
  }
};
