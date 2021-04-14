const NodeEnvironment = require("jest-environment-node");
const WebSocket = require("ws");

module.exports = class CustomEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();

    this.ws = new WebSocket("ws://127.0.0.1:8080");

    await new Promise((resolve) => this.ws.on("open", resolve));

    this.callbacks = new Map();

    this.ws.on("message", (message) => {
      const { id, data, error } = JSON.parse(message);
      const cb = this.callbacks.get(id);
      if (cb) {
        this.callbacks.delete(id);
        cb(error, data);
      }
    });

    this.global.applyState = (data) => this.runCommand("applyState", data);
    this.global.simulateKeydown = (data) =>
      this.runCommand("simulateKeydown", data);
    this.global.executeCommandById = (data) =>
      this.runCommand("executeCommandById", data);
    this.global.parseState = (data) => this.runCommand("parseState", data);
    this.global.getCurrentState = () => this.runCommand("getCurrentState");
  }

  async runCommand(type, data) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString();

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
    if (this.ws) {
      this.ws.close();
    }
    await super.teardown();
  }
};
