import { Plugin_2, editorViewField } from "obsidian";

import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

import { Feature } from "./Feature";

import { MyCMEditor, MyEditor } from "../MyEditor";
import { List } from "../root";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { SettingsService } from "../services/SettingsService";

const WRAPPER_TOP_MARGIN = 10;

interface LineData {
  top: number;
  left: number;
  height: number;
  list: List;
}

class ListLinesViewPluginValue implements PluginValue {
  private scheduled: ReturnType<typeof setImmediate>;
  private scroller: HTMLElement;
  private contentContainer: HTMLElement;
  private editor: MyCMEditor;
  private lastLine: number;
  private lines: LineData[];
  private lineElements: HTMLElement[] = [];

  constructor(
    private settings: SettingsService,
    private obsidian: ObsidianService,
    private parser: ParserService,
    private view: EditorView
  ) {
    this.editor = new MyCMEditor(view);

    this.view.scrollDOM.addEventListener("scroll", this.onScroll);
    this.settings.onChange("listLines", this.scheduleRecalculate);

    this.prepareDom();
    this.scheduleRecalculate();
  }

  private prepareDom() {
    this.contentContainer = document.createElement("div");
    this.contentContainer.classList.add(
      "outliner-plugin-list-lines-content-container"
    );

    this.scroller = document.createElement("div");
    this.scroller.classList.add("outliner-plugin-list-lines-scroller");

    this.scroller.appendChild(this.contentContainer);
    this.view.dom.appendChild(this.scroller);
  }

  private onScroll = (e: Event) => {
    const { scrollLeft, scrollTop } = e.target as HTMLElement;
    this.scroller.scrollTo(scrollLeft, scrollTop);
  };

  private scheduleRecalculate = () => {
    clearImmediate(this.scheduled);
    this.scheduled = setImmediate(this.calculate);
  };

  update(update: ViewUpdate) {
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.geometryChanged ||
      update.transactions.some((tr) => tr.reconfigured)
    ) {
      this.scheduleRecalculate();
    }
  }

  private calculate = () => {
    this.lines = [];

    if (
      this.settings.listLines &&
      this.view.viewportLineBlocks.length > 0 &&
      this.view.visibleRanges.length > 0
    ) {
      const fromLine = this.editor.offsetToPos(this.view.viewport.from).line;
      const toLine = this.editor.offsetToPos(this.view.viewport.to).line;
      const lists = this.parser.parseRange(this.editor, fromLine, toLine);

      for (const list of lists) {
        this.lastLine = list.getRange()[1].line;

        for (const c of list.getChildren()) {
          this.recursive(c);
        }
      }

      this.lines.sort((a, b) =>
        a.top === b.top ? a.left - b.left : a.top - b.top
      );
    }

    this.updateDom();
  };

  private getNextSibling(list: List): List | null {
    let listTmp = list;
    let p = listTmp.getParent();
    while (p) {
      const nextSibling = p.getNextSiblingOf(listTmp);
      if (nextSibling) {
        return nextSibling;
      }
      listTmp = p;
      p = listTmp.getParent();
    }
    return null;
  }

  private recursive(list: List) {
    const children = list.getChildren();

    if (children.length === 0) {
      return;
    }

    for (const child of children) {
      if (!child.isEmpty()) {
        this.recursive(child);
      }
    }

    const fromOffset = this.editor.posToOffset({
      line: list.getFirstLineContentStart().line,
      ch: list.getFirstLineIndent().length,
    });
    const nextSibling = this.getNextSibling(list);
    const tillOffset = this.editor.posToOffset({
      line: nextSibling
        ? nextSibling.getFirstLineContentStart().line - 1
        : this.lastLine,
      ch: 0,
    });

    const visibleFrom = this.view.visibleRanges[0].from;
    const visibleTo =
      this.view.visibleRanges[this.view.visibleRanges.length - 1].to;

    if (fromOffset > visibleTo || tillOffset < visibleFrom) {
      return;
    }

    const top =
      fromOffset < visibleFrom
        ? -WRAPPER_TOP_MARGIN
        : this.view.lineBlockAt(fromOffset).top;
    const bottom =
      tillOffset > visibleTo
        ? this.view.lineBlockAt(visibleTo - 1).top
        : this.view.lineBlockAt(tillOffset).top;
    const height = bottom - top;

    if (height > 0) {
      this.lines.push({
        top,
        left: this.getIndentSize(list),
        height,
        list,
      });
    }
  }

  private getIndentSize(list: List) {
    const { tabSize } = this.obsidian.getObsidianTabsSettings();
    const indent = list.getFirstLineIndent();
    const spaceSize = 4.5;

    let spaces = 0;
    for (const char of indent) {
      if (char === "\t") {
        spaces += tabSize;
      } else {
        spaces += 1;
      }
    }

    return spaces * spaceSize;
  }

  private onClick = (e: MouseEvent) => {
    e.preventDefault();

    const line = this.lines[Number((e.target as HTMLElement).dataset.index)];

    switch (this.settings.listLineAction) {
      case "zoom-in":
        this.zoomIn(line);
        break;

      case "toggle-folding":
        this.toggleFolding(line);
        break;
    }
  };

  private zoomIn(line: LineData) {
    const editor = new MyEditor(this.view.state.field(editorViewField).editor);

    editor.zoomIn(line.list.getFirstLineContentStart().line);
  }

  private toggleFolding(line: LineData) {
    const { list } = line;

    if (list.isEmpty()) {
      return;
    }

    let needToUnfold = true;
    const linesToToggle: number[] = [];
    for (const c of list.getChildren()) {
      if (c.isEmpty()) {
        continue;
      }
      if (!c.isFolded()) {
        needToUnfold = false;
      }
      linesToToggle.push(c.getFirstLineContentStart().line);
    }

    const editor = new MyEditor(this.view.state.field(editorViewField).editor);

    for (const l of linesToToggle) {
      if (needToUnfold) {
        editor.unfold(l);
      } else {
        editor.fold(l);
      }
    }
  }

  private updateDom() {
    this.scroller.style.top = this.view.scrollDOM.offsetTop + "px";
    this.scroller.style.width = this.view.scrollDOM.clientWidth + "px";
    this.contentContainer.style.height =
      this.view.contentDOM.clientHeight + "px";

    for (let i = 0; i < this.lines.length; i++) {
      if (this.lineElements.length === i) {
        const e = document.createElement("div");
        e.classList.add("outliner-plugin-list-line");
        e.dataset.index = String(i);
        e.addEventListener("mousedown", this.onClick);
        this.contentContainer.appendChild(e);
        this.lineElements.push(e);
      }

      const l = this.lines[i];
      const e = this.lineElements[i];
      e.style.top = l.top + "px";
      e.style.left = l.left + "px";
      e.style.height = l.height + "px";
      e.style.display = "block";
    }

    for (let i = this.lines.length; i < this.lineElements.length; i++) {
      const e = this.lineElements[i];
      e.style.top = "0px";
      e.style.left = "0px";
      e.style.height = "0px";
      e.style.display = "none";
    }
  }

  destroy() {
    this.settings.removeCallback("listLines", this.scheduleRecalculate);
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    this.view.dom.removeChild(this.scroller);
    clearImmediate(this.scheduled);
  }
}

export class LinesFeature implements Feature {
  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private obsidian: ObsidianService,
    private parser: ParserService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      ViewPlugin.define(
        (view) =>
          new ListLinesViewPluginValue(
            this.settings,
            this.obsidian,
            this.parser,
            view
          )
      )
    );
  }

  async unload() {}
}
