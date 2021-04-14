import { Plugin_2 } from "obsidian";
import { ListUtils } from "src/list_utils";
import { ObsidianUtils } from "src/obsidian_utils";
import { IFeature } from "../feature";

class ZoomState {
  constructor(public line: CodeMirror.LineHandle, public header: HTMLElement) {}
}

export class ZoomFeature implements IFeature {
  private zoomStates: WeakMap<CodeMirror.Editor, ZoomState> = new WeakMap();

  constructor(
    private plugin: Plugin_2,
    private obsidianUtils: ObsidianUtils,
    private listsUtils: ListUtils
  ) {
    this.zoomStates = new WeakMap();
  }

  async load() {
    this.plugin.registerCodeMirror((cm) => {
      cm.on("beforeChange", this.handleBeforeChange);
      cm.on("change", this.handleChange);
      cm.on("beforeSelectionChange", this.handleBeforeSelectionChange);

      this.plugin.registerDomEvent(cm.getWrapperElement(), "click", (e) =>
        this.handleClick(cm, e)
      );
    });

    this.plugin.addCommand({
      id: "zoom-in",
      name: "Zoom in to the current list item",
      callback: this.obsidianUtils.createCommandCallback(
        this.zoomIn.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: ".",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-out",
      name: "Zoom out the entire document",
      callback: this.obsidianUtils.createCommandCallback(
        this.zoomOut.bind(this)
      ),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: ".",
        },
      ],
    });
  }

  async unload() {
    this.plugin.app.workspace.iterateCodeMirrors((cm) => {
      cm.off("beforeSelectionChange", this.handleBeforeSelectionChange);
      cm.off("change", this.handleChange);
      cm.off("beforeChange", this.handleBeforeChange);
    });
  }

  private handleClick = (cm: CodeMirror.Editor, e: MouseEvent) => {
    const target = e.target as HTMLElement | null;

    if (!target || !target.classList.contains("cm-formatting-list-ul")) {
      return;
    }

    const pos = cm.coordsChar({
      left: e.x,
      top: e.y,
    });

    if (!pos) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.zoomIn(cm, pos);

    cm.setCursor({
      line: pos.line,
      ch: cm.getLine(pos.line).length,
    });
  };

  private handleBeforeChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => {
    const zoomState = this.zoomStates.get(cm);

    if (
      !zoomState ||
      changeObj.origin !== "setValue" ||
      changeObj.from.line !== 0 ||
      changeObj.from.ch !== 0
    ) {
      return;
    }

    const tillLine = cm.lastLine();
    const tillCh = cm.getLine(tillLine).length;

    if (changeObj.to.line !== tillLine || changeObj.to.ch !== tillCh) {
      return;
    }

    this.zoomOut(cm);
  };

  private handleChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorChangeCancellable
  ) => {
    const zoomState = this.zoomStates.get(cm);

    if (!zoomState || changeObj.origin !== "setValue") {
      return;
    }

    this.zoomIn(cm, {
      line: cm.getLineNumber(zoomState.line),
      ch: 0,
    });
  };

  private handleBeforeSelectionChange = (
    cm: CodeMirror.Editor,
    changeObj: CodeMirror.EditorSelectionChange
  ) => {
    if (!this.zoomStates.has(cm)) {
      return;
    }

    let visibleFrom: CodeMirror.Position | null = null;
    let visibleTill: CodeMirror.Position | null = null;

    for (let i = cm.firstLine(); i <= cm.lastLine(); i++) {
      const wrapClass = cm.lineInfo(i).wrapClass || "";
      const isHidden = wrapClass.includes("outliner-plugin-hidden-row");
      if (visibleFrom === null && !isHidden) {
        visibleFrom = { line: i, ch: 0 };
      }
      if (visibleFrom !== null && visibleTill !== null && isHidden) {
        break;
      }
      if (visibleFrom !== null) {
        visibleTill = { line: i, ch: cm.getLine(i).length };
      }
    }

    let changed = false;

    for (const range of changeObj.ranges) {
      if (range.anchor.line < visibleFrom.line) {
        changed = true;
        range.anchor.line = visibleFrom.line;
        range.anchor.ch = visibleFrom.ch;
      }
      if (range.anchor.line > visibleTill.line) {
        changed = true;
        range.anchor.line = visibleTill.line;
        range.anchor.ch = visibleTill.ch;
      }
      if (range.head.line < visibleFrom.line) {
        changed = true;
        range.head.line = visibleFrom.line;
        range.head.ch = visibleFrom.ch;
      }
      if (range.head.line > visibleTill.line) {
        changed = true;
        range.head.line = visibleTill.line;
        range.head.ch = visibleTill.ch;
      }
    }

    if (changed) {
      changeObj.update(changeObj.ranges);
    }
  };

  private zoomOut(editor: CodeMirror.Editor) {
    const zoomState = this.zoomStates.get(editor);

    if (!zoomState) {
      return false;
    }

    for (let i = editor.firstLine(), l = editor.lastLine(); i <= l; i++) {
      editor.removeLineClass(i, "wrap", "outliner-plugin-hidden-row");
    }

    zoomState.header.parentElement.removeChild(zoomState.header);

    this.zoomStates.delete(editor);

    return true;
  }

  private zoomIn(
    editor: CodeMirror.Editor,
    cursor: CodeMirror.Position = editor.getCursor()
  ) {
    const lineNo = cursor.line;
    const root = this.listsUtils.parseList(editor, cursor);

    if (!root) {
      return false;
    }

    this.zoomOut(editor);

    const { indentLevel } = this.listsUtils.getListLineInfo(
      editor.getLine(lineNo),
      root.getIndentSign()
    );

    let after = false;
    for (let i = editor.firstLine(), l = editor.lastLine(); i <= l; i++) {
      if (i < lineNo) {
        editor.addLineClass(i, "wrap", "outliner-plugin-hidden-row");
      } else if (i > lineNo && !after) {
        const afterLineInfo = this.listsUtils.getListLineInfo(
          editor.getLine(i),
          root.getIndentSign()
        );
        after = !afterLineInfo || afterLineInfo.indentLevel <= indentLevel;
      }

      if (after) {
        editor.addLineClass(i, "wrap", "outliner-plugin-hidden-row");
      }
    }

    const createSeparator = () => {
      const span = document.createElement("span");
      span.textContent = " > ";
      return span;
    };

    const createTitle = (content: string, cb: () => void) => {
      const a = document.createElement("a");
      a.className = "outliner-plugin-zoom-title";
      if (content) {
        a.textContent = content;
      } else {
        a.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
      }
      a.onclick = (e) => {
        e.preventDefault();
        cb();
      };
      return a;
    };

    const createHeader = () => {
      const div = document.createElement("div");
      div.className = "outliner-plugin-zoom-header";

      let list = root.getListUnderLine(lineNo).getParent();
      while (list && list.getParent()) {
        const lineNo = root.getLineNumberOf(list);
        div.prepend(
          createTitle(list.getContent(), () =>
            this.zoomIn(editor, { line: lineNo, ch: 0 })
          )
        );
        div.prepend(createSeparator());
        list = list.getParent();
      }

      div.prepend(
        createTitle(this.obsidianUtils.getActiveLeafDisplayText(), () =>
          this.zoomOut(editor)
        )
      );

      return div;
    };

    const zoomHeader = createHeader();
    editor.getWrapperElement().prepend(zoomHeader);

    this.zoomStates.set(
      editor,
      new ZoomState(editor.getLineHandle(lineNo), zoomHeader)
    );

    return true;
  }
}
