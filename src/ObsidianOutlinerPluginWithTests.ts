/* eslint-disable @typescript-eslint/no-explicit-any */
import { MarkdownView, WorkspaceLeaf } from "obsidian";

import { EditorView } from "@codemirror/view";

import ObsidianOutlinerPlugin from "./ObsidianOutlinerPlugin";
import { MyEditor, MyEditorPosition } from "./editor";

const keysMap: { [key: string]: number } = {
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  Escape: 27,
  Home: 36,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Delete: 46,
  KeyA: 65,
  KeyO: 79,
};

export default class ObsidianOutlinerPluginWithTests extends ObsidianOutlinerPlugin {
  private editor: MyEditor;
  private mainEditor: MyEditor | null = null;
  private mainLeaf: WorkspaceLeaf | null = null;
  private popoutLeaf: WorkspaceLeaf | null = null;
  // Keep the last document available for cleanup assertions after window-close.
  private popoutDocument: Document | null = null;
  private dropInvalidation: {
    source: MyEditor;
    leaf: WorkspaceLeaf;
    existingNotices: Set<Element>;
    notices: Map<Element, string>;
    errors: string[];
    removeListeners: (() => void)[];
  } | null = null;

  wait(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  executeCommandById(id: string) {
    (this.app as any).commands.executeCommandById(id);
  }

  setSetting({ k, v }: { k: string; v: any }) {
    (this.settings as any).set(k, v);
  }

  resetSettings() {
    this.settings.reset();
    this.settings.previousRelease = "999.999.999";
  }

  simulateKeydown(keys: string) {
    const e = {
      type: "keydown",
      code: "",
      keyCode: 0,
      shiftKey: false,
      metaKey: false,
      altKey: false,
      ctrlKey: false,
      defaultPrevented: false,
      returnValue: true,
      cancelBubble: false,
      key: "",
      preventDefault: function () {
        e.defaultPrevented = true;
        e.returnValue = true;
      },
      stopPropagation: function () {
        e.cancelBubble = true;
      },
    };

    for (const key of keys.split("-")) {
      switch (key.toLowerCase()) {
        case "cmd":
          e.metaKey = true;
          break;
        case "ctrl":
          e.ctrlKey = true;
          break;
        case "alt":
          e.altKey = true;
          break;
        case "shift":
          e.shiftKey = true;
          break;
        default:
          e.code = key;
          break;
      }
    }

    if (e.code in keysMap) {
      e.keyCode = keysMap[e.code];
    }

    if (e.keyCode === 0) {
      throw new Error("Unknown key: " + e.code);
    }

    if (e.code === "Escape" || e.code === "KeyO") {
      e.key = this.getKeyName(e.code, e.shiftKey);
      this.dispatchKeydown(e as KeyboardEvent);
      return;
    }

    this.editor.triggerOnKeyDown(e as KeyboardEvent);
  }

  private getKeyName(code: string, shiftKey: boolean) {
    if (code.startsWith("Key")) {
      const key = code.slice(3);
      return shiftKey ? key : key.toLowerCase();
    }

    return code;
  }

  private dispatchKeydown(e: KeyboardEvent) {
    const view: EditorView = (this.editor as any).view;
    const win = view.dom.ownerDocument.defaultView as any;
    const event = new win.KeyboardEvent("keydown", {
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperty(event, "keyCode", { get: () => e.keyCode });
    view.contentDOM.dispatchEvent(event);
  }

  insertText(text: string) {
    document.execCommand("insertText", false, text);
  }

  async load() {
    await super.load();

    (window as any).ObsidianOutlinerPlugin = this;

    if (process.env.TEST_PLATFORM) {
      setTimeout(async () => {
        await this.wait(1000);
        this.connect();
      }, 0);
    }
  }

  async onunload() {
    await super.onunload();

    delete (window as any).ObsidianOutlinerPlugin;
  }

  protected async prepareSettings() {
    await super.prepareSettings();

    if (process.env.TEST_PLATFORM) {
      this.resetSettings();
    }
  }

  async prepareForTests() {
    const filePath = `test.md`;
    let file = this.app.vault
      .getMarkdownFiles()
      .find((f) => f.path === filePath);
    if (!file) {
      file = await this.app.vault.create(filePath, "");
    }
    for (let i = 0; i < 10; i++) {
      await this.wait(1000);
      if (this.app.workspace.activeLeaf) {
        // TODO: Fix deprecation issue
        this.app.workspace.activeLeaf.openFile(file);
        break;
      }
    }
    await this.wait(1000);

    this.editor = new MyEditor(
      this.app.workspace.getActiveViewOfType(MarkdownView).editor,
    );
  }

  async connect() {
    const ws = new WebSocket("ws://127.0.0.1:8080/");
    await this.prepareForTests();
    ws.send("ready");

    ws.addEventListener("message", async (event) => {
      const { id, type, data } = JSON.parse(event.data);

      let result;
      let error;

      try {
        switch (type) {
          case "applyState":
            await this.applyState(data);
            break;
          case "openPopoutEditor":
            result = await this.openPopoutEditor();
            break;
          case "closePopoutEditor":
            await this.closePopoutEditor();
            break;
          case "selectTestEditor":
            this.selectTestEditor(data);
            break;
          case "getDragAndDropSnapshot":
            result = await this.getDragAndDropSnapshot();
            break;
          case "simulateWindowBlur":
            this.simulateWindowBlur();
            break;
          case "openDropInvalidationEditor":
            result = await this.openDropInvalidationEditor();
            break;
          case "replaceFromDropInvalidationEditor":
            result = await this.replaceFromDropInvalidationEditor(data);
            break;
          case "getDropInvalidationObservations":
            result = await this.getDropInvalidationObservations();
            break;
          case "closeDropInvalidationEditor":
            this.closeDropInvalidationEditor();
            break;
          case "simulateKeydown":
            this.simulateKeydown(data);
            break;
          case "insertText":
            this.insertText(data);
            break;
          case "executeCommandById":
            this.executeCommandById(data);
            break;
          case "drag":
            this.drag(data);
            break;
          case "move":
            this.move(data);
            break;
          case "drop":
            this.drop();
            break;
          case "resetSettings":
            this.resetSettings();
            break;
          case "setSetting":
            this.setSetting(data);
            break;
          case "parseState":
            result = this.parseState(data);
            break;
          case "getCurrentState":
            result = this.getCurrentState();
            break;
        }
      } catch (e) {
        error = String(e);
      }

      ws.send(JSON.stringify({ id, data: result, error }));
    });
  }

  private async openPopoutEditor() {
    if (this.popoutLeaf) {
      throw new Error("A test pop-out is already open");
    }

    const mainView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!mainView?.file) {
      throw new Error("No active Markdown file to open in a pop-out");
    }

    this.mainEditor = this.editor;
    this.mainLeaf = mainView.leaf;
    // A separate file avoids two editors synchronizing the same document
    // while applyState resets its text and selections.
    const filePath = "popout-test.md";
    let file = this.app.vault
      .getMarkdownFiles()
      .find((f) => f.path === filePath);
    if (!file) {
      file = await this.app.vault.create(filePath, "");
    }
    this.popoutLeaf = this.app.workspace.getLeaf("window");
    await this.popoutLeaf.openFile(file, { active: true });

    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const markdownView = this.popoutLeaf.view as MarkdownView;
      const view: EditorView | undefined = (markdownView.editor as any)?.cm;
      if (
        view?.dom.isConnected &&
        view.dom.ownerDocument !== document &&
        view.dom.getBoundingClientRect().width > 0
      ) {
        this.editor = new MyEditor(markdownView.editor);
        this.popoutDocument = view.dom.ownerDocument;
        view.focus();
        return true;
      }
      await this.wait(50);
    }
    throw new Error(
      "Pop-out editor did not become ready in a separate document",
    );
  }

  private async closePopoutEditor() {
    if (!this.popoutLeaf) {
      return;
    }

    const win = this.popoutLeaf.getContainer().win;
    this.popoutLeaf.detach();
    this.popoutLeaf = null;
    this.editor = this.mainEditor;
    this.mainEditor = null;
    this.app.workspace.setActiveLeaf(this.mainLeaf, { focus: true });
    this.mainLeaf = null;

    const deadline = Date.now() + 5000;
    while (!win.closed && Date.now() < deadline) {
      await this.wait(50);
    }
    if (!win.closed) {
      throw new Error("Test pop-out did not close");
    }
  }

  private selectTestEditor(opts: {
    window: "main" | "popout";
    focus?: boolean;
  }) {
    if (opts.window === "popout") {
      if (!this.popoutLeaf) {
        throw new Error("No test pop-out is open");
      }
      this.editor = new MyEditor((this.popoutLeaf.view as MarkdownView).editor);
    } else if (this.mainEditor) {
      this.editor = this.mainEditor;
    }

    // Ownership tests must be able to change only the bridge reference:
    // focusing another window would itself cancel the source drag on blur.
    if (opts.focus !== false) {
      const leaf = opts.window === "popout" ? this.popoutLeaf : this.mainLeaf;
      if (leaf) {
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
      }
      ((this.editor as any).view as EditorView).focus();
    }
  }

  private getDragAndDropFeature() {
    // Read-only introspection is deliberately confined to the test bridge.
    const feature = (this as any).features.find(
      (candidate: any) => candidate.contextsByDocument instanceof Map,
    );
    if (!feature) {
      throw new Error("Drag-and-drop feature not loaded");
    }
    return feature;
  }

  private async openDropInvalidationEditor() {
    if (this.dropInvalidation) {
      throw new Error("A drop-invalidation editor is already open");
    }
    const sourceView: EditorView = (this.editor as any).view;
    let sourceLeaf: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (((leaf.view as MarkdownView).editor as any)?.cm === sourceView) {
        sourceLeaf = leaf;
      }
    });
    const file = (sourceLeaf?.view as MarkdownView)?.file;
    if (!file) {
      throw new Error("No source Markdown file for drop invalidation");
    }

    // Open the same file BEFORE dragging. Later edits must not focus this leaf
    // or switch windows, since blur would cancel the gesture before mouseup.
    this.app.workspace.setActiveLeaf(sourceLeaf, { focus: true });
    const leaf = this.app.workspace.getLeaf("split");
    const documents: Document[] = Array.from(
      this.getDragAndDropFeature().contextsByDocument.keys(),
    );
    const session = (this.dropInvalidation = {
      source: this.editor,
      leaf,
      existingNotices: new Set<Element>(),
      notices: new Map<Element, string>(),
      errors: [] as string[],
      removeListeners: [] as (() => void)[],
    });
    await leaf.openFile(file, { active: false });
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const secondaryView: EditorView | undefined = (
        (leaf.view as MarkdownView).editor as any
      )?.cm;
      if (
        secondaryView?.dom.isConnected &&
        secondaryView !== sourceView &&
        secondaryView.dom.getBoundingClientRect().width > 0
      ) {
        this.app.workspace.setActiveLeaf(sourceLeaf, { focus: true });
        sourceView.focus();
        await this.wait(100);
        for (const doc of documents) {
          for (const notice of Array.from(doc.querySelectorAll(".notice"))) {
            session.existingNotices.add(notice);
          }
          const win = doc.defaultView;
          // Notices expire, so keep their history through the recovery gesture.
          const observer = new (win as any).MutationObserver(() => {
            for (const notice of Array.from(doc.querySelectorAll(".notice"))) {
              const text = notice.textContent.trim();
              if (!session.existingNotices.has(notice) && text) {
                session.notices.set(notice, text);
              }
            }
          });
          observer.observe(doc.body, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          session.removeListeners.push(() => observer.disconnect());
          // dispatchEvent does NOT throw exceptions from DOM event listeners.
          // Listen on the owning windows instead of trusting the RPC response.
          const onError = (event: ErrorEvent) => {
            session.errors.push(event.error?.stack || event.message);
          };
          const onRejection = (event: PromiseRejectionEvent) => {
            session.errors.push(String(event.reason?.stack || event.reason));
          };
          win.addEventListener("error", onError);
          win.addEventListener("unhandledrejection", onRejection);
          session.removeListeners.push(() => {
            win.removeEventListener("error", onError);
            win.removeEventListener("unhandledrejection", onRejection);
          });
        }
        return true;
      }
      await this.wait(50);
    }
    throw new Error("The second editor of the source file did not render");
  }

  private async replaceFromDropInvalidationEditor(value: string) {
    const session = this.dropInvalidation;
    const feature = this.getDragAndDropFeature();
    const state = feature.state;
    if (!session || !state?.dropVariant) {
      throw new Error("Expected an active drag with a selected destination");
    }
    const rootStart = state.root.getContentStart();
    const secondary = new MyEditor((session.leaf.view as MarkdownView).editor);
    secondary.setValue(value);
    const deadline = Date.now() + 5000;
    while (session.source.getValue() !== value && Date.now() < deadline) {
      await this.wait(20);
    }
    if (session.source.getValue() !== value) {
      throw new Error(
        "The source editor did not synchronize the external edit",
      );
    }
    if (feature.state !== state) {
      throw new Error("The gesture was cancelled before the drop");
    }
    // Use precisely the editor and position that applyChanges will reparse.
    return {
      value: session.source.getValue(),
      rootStart,
      parsed: feature.parser.parse(state.editor, rootStart) !== null,
    };
  }

  private async getDropInvalidationObservations() {
    await this.wait(20);
    const session = this.dropInvalidation;
    if (!session) {
      throw new Error("No drop-invalidation observation is active");
    }
    return {
      errors: [...session.errors],
      notices: Array.from(session.notices.values()),
    };
  }

  private closeDropInvalidationEditor() {
    const session = this.dropInvalidation;
    this.dropInvalidation = null;
    if (session) {
      try {
        for (const remove of session.removeListeners) {
          remove();
        }
      } finally {
        session.leaf.detach();
      }
    }
  }

  private async getDragAndDropSnapshot(): Promise<DragAndDropSnapshot> {
    // Let CodeMirror render decoration changes before observing the DOM.
    await this.wait(20);
    const feature = this.getDragAndDropFeature();
    const mainView: EditorView = ((this.mainEditor || this.editor) as any).view;
    const mainDocument = mainView.dom.ownerDocument;
    const nameOf = (doc: Document): "main" | "popout" =>
      doc === mainDocument ? "main" : "popout";
    const documents = [mainDocument];
    if (this.popoutDocument && this.popoutDocument !== mainDocument) {
      documents.push(this.popoutDocument);
    }
    return {
      active: !!feature.state,
      pending: !!feature.preStart,
      destinationSelected: !!feature.state?.dropVariant,
      source: feature.state ? nameOf(feature.state.context.document) : null,
      contextCount: feature.contextsByDocument.size,
      distinctDocuments:
        !!this.popoutLeaf && this.popoutDocument !== mainDocument,
      documents: documents.map((doc) => ({
        window: nameOf(doc),
        registered: feature.contextsByDocument.has(doc),
        enabled: doc.body.classList.contains("outliner-plugin-dnd"),
        dragging: doc.body.classList.contains("outliner-plugin-dragging"),
        dropZones: doc.querySelectorAll(".outliner-plugin-drop-zone").length,
        visibleDropZones: Array.from(
          doc.querySelectorAll<HTMLElement>(".outliner-plugin-drop-zone"),
        ).filter((zone) => zone.style.display !== "none").length,
        draggingLines: doc.querySelectorAll(".outliner-plugin-dragging-line")
          .length,
        droppingLines: doc.querySelectorAll(".outliner-plugin-dropping-line")
          .length,
      })),
    };
  }

  private simulateWindowBlur() {
    const view: EditorView = (this.editor as any).view;
    const win = view.dom.ownerDocument.defaultView as any;
    win.dispatchEvent(new win.Event("blur"));
  }

  private drag(opts: { from: { line: number; ch: number } }) {
    const view: EditorView = (this.editor as any).view;
    const coords = view.coordsAtPos(this.editor.posToOffset(opts.from));
    const x = coords.left;
    const y = coords.top;
    const win = view.dom.ownerDocument.defaultView as any;
    const e = new win.MouseEvent("mousedown", {
      screenX: x,
      screenY: y,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true,
    });
    const { node } = view.domAtPos(this.editor.posToOffset(opts.from));
    let el = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
    while (!el.classList.contains("cm-line")) {
      el = el.parentElement;
    }
    el =
      el.querySelector(".cm-formatting-list") ||
      el.querySelector(".cm-fold-indicator");
    el.dispatchEvent(e);
  }

  private move(opts: {
    to: { line: number; ch: number };
    offsetX: number;
    offsetY: number;
    buttons?: number;
  }) {
    const view: EditorView = (this.editor as any).view;
    const coords = view.coordsAtPos(this.editor.posToOffset(opts.to));
    const x = coords.left + opts.offsetX;
    const y = coords.top + opts.offsetY;
    const doc = view.dom.ownerDocument;
    const win = doc.defaultView as any;
    const e = new win.MouseEvent("mousemove", {
      screenX: x,
      screenY: y,
      clientX: x,
      clientY: y,
      buttons: opts.buttons ?? 1,
      bubbles: true,
      cancelable: true,
    });
    const target = doc.elementFromPoint(x, y) || view.contentDOM;
    target.dispatchEvent(e);
  }

  private drop() {
    const view: EditorView = (this.editor as any).view;
    const win = view.dom.ownerDocument.defaultView as any;
    const e = new win.MouseEvent("mouseup", {
      button: 0,
      buttons: 0,
      bubbles: true,
      cancelable: true,
    });
    view.contentDOM.dispatchEvent(e);
  }

  async applyState(state: string[]): Promise<void>;
  async applyState(state: string): Promise<void>;
  async applyState(state: State): Promise<void>;
  async applyState(state: State | string | string[]) {
    if (typeof state === "string") {
      state = state.split("\n");
    }
    if (Array.isArray(state)) {
      state = this.parseState(state);
    }

    this.editor.setValue("");
    this.editor.setValue(state.value);
    this.editor.setSelections(state.selections);

    // TODO: recursive bottom-top folding, because it's impossible to fold inside already folded range
    for (const l of state.folds) {
      this.editor.fold(l);
    }

    await this.wait(10);
  }

  getCurrentState(): State {
    return {
      folds: this.editor.getAllFoldedLines(),
      selections: this.editor.listSelections().map((range) => ({
        anchor: {
          line: range.anchor.line,
          ch: range.anchor.ch,
        },
        head: {
          line: range.head.line,
          ch: range.head.ch,
        },
      })),
      value: this.editor.getValue(),
    };
  }

  parseState(content: string[]): State;
  parseState(content: string): State;
  parseState(content: string | string[]): State {
    if (typeof content === "string") {
      content = content.split("\n");
    }

    const acc = content.reduce(
      (acc, line, lineNo) => {
        if (line.includes("#folded")) {
          line = line.replace("#folded", "").trimEnd();
          acc.folds.push(lineNo);
        }

        if (!acc.anchor) {
          const dashIndex = line.indexOf("|");
          if (dashIndex >= 0) {
            acc.anchor = {
              line: lineNo,
              ch: dashIndex,
            };
            line = line.substring(0, dashIndex) + line.substring(dashIndex + 1);
          }
        }

        if (!acc.head) {
          const dashIndex = line.indexOf("|");
          if (dashIndex >= 0) {
            acc.head = {
              line: lineNo,
              ch: dashIndex,
            };
            line = line.substring(0, dashIndex) + line.substring(dashIndex + 1);
          }
        }

        acc.lines.push(line);

        return acc;
      },
      {
        anchor: null as MyEditorPosition | null,
        head: null as MyEditorPosition | null,
        lines: [] as string[],
        folds: [] as number[],
      },
    );
    if (!acc.anchor) {
      acc.anchor = { line: 0, ch: 0 };
    }
    if (!acc.head) {
      acc.head = { ...acc.anchor };
    }

    return {
      folds: acc.folds,
      selections: [{ anchor: acc.anchor, head: acc.head }],
      value: acc.lines.join("\n"),
    };
  }

  async setPreviousRelease(previousRelease: string | null = null) {
    this.settings.previousRelease = previousRelease;
    await this.settings.save();
  }
}
