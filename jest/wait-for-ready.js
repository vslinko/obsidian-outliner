function waitForReady({ wss, child, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const messageListeners = new Map();
    const settle = (error, ws) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      wss.off("connection", onConnection);
      child.off("exit", onExit);
      child.off("error", onError);
      for (const [socket, listener] of messageListeners) {
        socket.off("message", listener);
      }
      messageListeners.clear();
      if (error) {
        reject(error);
      } else {
        resolve(ws);
      }
    };

    const timer = setTimeout(() => {
      settle(new Error(`Obsidian did not send ready within ${timeoutMs} ms`));
    }, timeoutMs);

    const onConnection = (ws) => {
      const onMessage = (msg) => {
        const text = msg.toString();
        if (text === "ready") {
          settle(null, ws);
        } else {
          settle(
            new Error(`Obsidian sent ${text.slice(0, 100)} instead of ready`),
          );
        }
      };
      messageListeners.set(ws, onMessage);
      ws.once("message", onMessage);
    };
    const onExit = (code) => {
      settle(
        new Error(`Obsidian exited with code ${code} before sending ready`),
      );
    };
    const onError = (err) => {
      settle(new Error(`Obsidian failed to start: ${err.message}`));
    };

    wss.on("connection", onConnection);
    child.on("exit", onExit);
    child.on("error", onError);
  });
}

module.exports = { waitForReady };
