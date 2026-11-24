const http = require("http");
const WebSocket = require("ws");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Separate from native-input's drag fixture: these tests need the real editor,
// not a test handle or a replacement cursor/selection implementation.
module.exports = class ListStyleCaret {
  async connect() {
    const pages = await new Promise((resolve, reject) => {
      const request = http.get("http://127.0.0.1:9222/json/list", (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body).filter((page) => page.type === "page"));
          } catch (error) {
            reject(error);
          }
        });
      });
      request.setTimeout(5000, () =>
        request.destroy(new Error("CDP discovery timeout")),
      );
      request.on("error", reject);
    });
    for (const page of pages) {
      try {
        this.ws = new WebSocket(page.webSocketDebuggerUrl);
        this.pending = new Map();
        this.id = 0;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("CDP open timeout")),
            5000,
          );
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
          const callback = this.pending.get(message.id);
          if (!callback) return;
          this.pending.delete(message.id);
          clearTimeout(callback.timer);
          if (message.error)
            callback.reject(new Error(JSON.stringify(message.error)));
          else callback.resolve(message.result);
        });
        this.ws.on("close", () => {
          for (const callback of this.pending.values()) {
            clearTimeout(callback.timer);
            callback.reject(new Error("CDP closed"));
          }
          this.pending.clear();
        });
        if (
          await this.evaluate(
            "typeof app !== 'undefined' && !!app.workspace.activeLeaf?.view.editor",
          )
        )
          return;
      } catch (error) {
        this.close();
        throw error;
      }
      this.close();
    }
    throw new Error("No real Obsidian editor CDP target");
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timeout`));
      }, 5000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }

  async prepare({ source, font }) {
    await this.evaluate(`(async () => {
      const view = app.workspace.activeLeaf.view;
      const keys = ['vimMode', 'baseFontSize'];
      window.__listStyleCaret = {
        view, state: view.getState(),
        config: Object.fromEntries(keys.map(k => [k, app.vault.getConfig(k)])),
        font: app.loadLocalStorage('base-font-size'),
        settings: app.plugins.plugins['obsidian-outliner'].settings.getValues(),
      };
      app.vault.setConfig('vimMode', false);
      if (app.vault.getConfig('cssTheme')) throw new Error('Caret regression requires built-in theme');
      app.setBaseFontSize(${font});
      await view.setState({...view.getState(), mode: 'source', source: ${source}}, {});
      const style = document.createElement('style');
      style.id = 'list-style-caret-color';
      // Paint only: no geometry, blink, keymap, selection or layout overrides.
      style.textContent = '.markdown-source-view .cm-content { caret-color: rgb(255, 0, 255) !important; }';
      document.head.append(style);
      const events = [];
      const listener = e => events.push({key:e.key, trusted:e.isTrusted});
      view.editor.cm.contentDOM.addEventListener('keydown', listener, true);
      Object.assign(window.__listStyleCaret, {events, listener, content: view.editor.cm.contentDOM});
      return true;
    })()`);
    await wait(150);
  }

  async restore() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    await this.evaluate(`(async () => {
      const saved = window.__listStyleCaret;
      if (!saved) return;
      try {
        saved.content?.removeEventListener('keydown', saved.listener, true);
        document.getElementById('list-style-caret-color')?.remove();
        for (const [k,v] of Object.entries(saved.settings)) app.plugins.plugins['obsidian-outliner'].settings.set(k,v);
        for (const [k,v] of Object.entries(saved.config)) app.vault.setConfig(k,v);
        app.saveLocalStorage('base-font-size', saved.font);
        app.updateFontSize();
        await saved.view.setState(saved.state, {});
      } finally { delete window.__listStyleCaret; }
      return true;
    })()`);
  }

  async settle(styled, font) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const ready = await this.evaluate(`(() => {
        const cm = app.workspace.activeLeaf.view.editor.cm;
        return document.body.classList.contains('outliner-plugin-better-lists') === ${styled}
          && getComputedStyle(cm.contentDOM).fontSize === '${font}px';
      })()`);
      if (ready) {
        await wait(80);
        return;
      }
      await wait(100);
    }
    throw new Error("Requested style/font did not become active");
  }

  async clickContent() {
    const point = await this.evaluate(`(() => {
      const cm = app.workspace.activeLeaf.view.editor.cm;
      cm.focus();
      const p = cm.coordsAtPos(16);
      return {x:p.left, y:(p.top+p.bottom)/2};
    })()`);
    for (const type of ["mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", {
        type,
        ...point,
        button: "left",
        clickCount: 1,
      });
    }
    await wait(80);
  }

  async key(key) {
    const keyCode = { Home: 36, ArrowLeft: 37 }[key];
    for (const type of ["keyDown", "keyUp"]) {
      await this.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: keyCode,
        nativeVirtualKeyCode: keyCode,
      });
    }
    await wait(60);
  }

  async geometry() {
    return this.evaluate(`(() => {
      const editor = app.workspace.activeLeaf.view.editor, cm = editor.cm;
      const walker = document.createTreeWalker(cm.contentDOM, NodeFilter.SHOW_TEXT);
      let node, first;
      while (node = walker.nextNode()) {
        const index = node.textContent.indexOf('First');
        if (index < 0) continue;
        const range = document.createRange();
        range.setStart(node,index); range.setEnd(node,index+1);
        const r = range.getBoundingClientRect();
        first = {x:r.x,y:r.y,width:r.width,height:r.height}; break;
      }
      if (!first) throw new Error('Missing first content text range');
      const selection = getSelection();
      const range = selection.rangeCount && selection.getRangeAt(0).getBoundingClientRect();
      const marker = cm.contentDOM.querySelector('.cm-formatting-list-ul');
      return {first, cursor:editor.getCursor(), value:editor.getValue(),
        nativeRangeX:range?.x, cmX:cm.coordsAtPos(2)?.left,
        font:getComputedStyle(cm.contentDOM).fontSize,
        source:app.workspace.activeLeaf.view.getState().source,
        vim:app.vault.getConfig('vimMode'),
        styled:document.body.classList.contains('outliner-plugin-better-lists'),
        markerMargin:marker && getComputedStyle(marker).marginRight,
        focused:cm.hasFocus, dpr:devicePixelRatio,
        events:window.__listStyleCaret.events.slice()};
    })()`);
  }

  async paintedCaret(label) {
    // The native selection's Range and coordsAtPos can both lie about paint
    // (#371). Decode the actual screenshot using Electron, without a PNG dep.
    const geometry = await this.geometry();
    if (geometry.dpr !== 1)
      throw new Error("Caret raster test requires devicePixelRatio 1");
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data } = await this.send("Page.captureScreenshot", {
        format: "png",
      });
      const columns = await this.evaluate(`(() => {
        const {nativeImage} = require('electron');
        const image = nativeImage.createFromBuffer(Buffer.from(${JSON.stringify(data)}, 'base64'));
        const {width,height} = image.getSize(), pixels = image.toBitmap();
        const first = ${JSON.stringify(geometry.first)};
        const left = Math.max(0,Math.floor(first.x)-Math.ceil(first.height));
        const right = Math.min(width-1,Math.ceil(first.x)+3);
        const top = Math.max(0,Math.ceil(first.y)+1);
        const bottom = Math.min(height,Math.floor(first.y+first.height)-1);
        const matches = [];
        for(let x=left;x<=right;x++) {
          let count=0;
          for(let y=top;y<bottom;y++) {
            const i=(y*width+x)*4;
            // NativeImage bitmap is BGRA. Only the test caret is magenta.
            if(pixels[i]>180 && pixels[i+1]<100 && pixels[i+2]>180) count++;
          }
          if(count >= Math.max(3,(bottom-top)*0.8)) matches.push(x);
        }
        return matches;
      })()`);
      if (
        columns.length === 1 ||
        (columns.length === 2 && columns[1] === columns[0] + 1)
      ) {
        const observation = {
          ...geometry,
          caretX: columns[0],
          columns,
          attempt,
        };
        if (process.env.CARET_EVIDENCE_DIR) {
          const fs = require("fs");
          const path = require("path");
          const file = path.join(process.env.CARET_EVIDENCE_DIR, label);
          fs.mkdirSync(process.env.CARET_EVIDENCE_DIR, { recursive: true });
          fs.writeFileSync(file + ".png", Buffer.from(data, "base64"));
          fs.writeFileSync(
            file + ".json",
            JSON.stringify(observation, null, 2),
          );
        }
        return observation;
      }
      if (columns.length)
        throw new Error(`Ambiguous painted caret: ${JSON.stringify(columns)}`);
      await wait(90); // bounded blink retry; absent paint must never pass
    }
    throw new Error(
      `No independently visible painted caret: ${JSON.stringify(geometry)}`,
    );
  }

  close() {
    this.ws?.terminate();
  }
};
