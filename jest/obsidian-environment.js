const { TestEnvironment } = require("jest-environment-node");
const WebSocket = require("ws");
const NativeInput = require("./native-input");

let idSeq = 1;

module.exports = class CustomEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();

    this.callbacks = new Map();
    this.nativeInput = new NativeInput();
    this.global.nativeInput = (opts) => this.nativeInput.run(opts);

    this.createCommand("applyState");
    this.createCommand("simulateKeydown");
    this.createCommand("insertText");
    this.createCommand("executeCommandById");
    this.createCommand("setSetting");
    this.createCommand("resetSettings");
    this.createCommand("parseState");
    this.createCommand("getCurrentState");
    this.createCommand("drag");
    this.createCommand("move");
    this.createCommand("drop");
    this.createCommand("openPopoutEditor");
    this.createCommand("closePopoutEditor");
    this.createCommand("selectTestEditor");
    this.createCommand("getDragAndDropSnapshot");
    this.createCommand("simulateWindowBlur");
    this.createCommand("testHandle");
    this.createCommand("openDropInvalidationEditor");
    this.createCommand("replaceFromDropInvalidationEditor");
    this.createCommand("getDropInvalidationObservations");
    this.createCommand("closeDropInvalidationEditor");
  }

  createCommand(type) {
    this.global[type] = (data) => this.runCommand(type, data);
  }

  async initWs() {
    this.ws = new WebSocket("ws://127.0.0.1:8080");

    await new Promise((resolve) => this.ws.on("open", resolve));

    this.ws.on("message", (message) => {
      const { id, data, error } = JSON.parse(message);
      const cb = this.callbacks.get(id);
      if (cb) {
        this.callbacks.delete(id);
        cb(error, data);
      }
    });
  }

  async runCommand(type, data) {
    if (!this.ws) {
      await this.initWs();
    }

    return new Promise((resolve, reject) => {
      const id = String(idSeq++);

      this.callbacks.set(id, (error, data) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve(data);
        }
      });

      this.ws.send(JSON.stringify({ id, type, data }));
    });
  }

  async teardown() {
    this.nativeInput.close();
    if (this.ws) {
      this.ws.close();
    }
    await super.teardown();
  }
};
