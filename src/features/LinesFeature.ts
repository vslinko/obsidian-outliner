import { Plugin_2 } from "obsidian";

import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

import { Feature } from "./Feature";

import { MyCMEditor } from "../MyEditor";
import { List } from "../root";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { SettingsService } from "../services/SettingsService";

const WRAPPER_TOP_MARGIN = 10;

interface LineData {
  top: number;
  left: number;
  height: number;
}

class ListLinesViewPluginValue implements PluginValue {
  private scheduled: ReturnType<typeof setImmediate>;
  private root: HTMLElement;
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
    this.root = document.createElement("div");
    this.root.classList.add("outliner-plugin-list-lines-wrapper");
    view.dom.appendChild(this.root);
    view.scrollDOM.addEventListener("scroll", this.onScroll);
    this.scheduleRecalculate();
    this.settings.onChange("listLines", this.scheduleRecalculate);
  }

  private onScroll = (e: Event) => {
    const scrollTop = (e.target as HTMLElement).scrollTop;
    this.root.style.top = -scrollTop + "px";
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

  private updateDom() {
    this.root.style.width = this.view.scrollDOM.clientWidth + "px";
    this.root.style.height = this.view.scrollDOM.clientHeight + "px";
    this.root.style.marginTop =
      this.view.scrollDOM.offsetTop + WRAPPER_TOP_MARGIN + "px";

    for (let i = 0; i < this.lines.length; i++) {
      if (this.lineElements.length === i) {
        const e = document.createElement("div");
        e.classList.add("outliner-plugin-list-line");
        e.addEventListener("mousedown", (e) => {
          e.preventDefault();
        });
        this.root.appendChild(e);
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
    this.view.dom.removeChild(this.root);
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
