function waitForReady({ wss, child, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error, ws) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      wss.off("connection", onConnection);
      child.off("exit", onExit);
      child.off("error", onError);
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
      ws.once("message", (msg) => {
        const text = msg.toString();
        if (text === "ready") {
          settle(null, ws);
        } else {
          settle(
            new Error(`Obsidian sent ${text.slice(0, 100)} instead of ready`),
          );
        }
      });
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
