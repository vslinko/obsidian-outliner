import { Plugin_2 } from "obsidian";

import {
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { List } from "../root";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";
import { getEditorFromState } from "../utils/getEditorFromState";

const VERTICAL_LINES_BODY_CLASS = "outliner-plugin-vertical-lines";

interface LineData {
  top: number;
  left: number;
  height: string;
  list: List;
}

class VerticalLinesPluginValue implements PluginValue {
  private scheduled: ReturnType<typeof setTimeout>;
  private scroller: HTMLElement;
  private contentContainer: HTMLElement;
  private editor: MyEditor;
  private lastLine: number;
  private lines: LineData[];
  private lineElements: HTMLElement[] = [];

  constructor(
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser,
    private view: EditorView
  ) {
    this.view.scrollDOM.addEventListener("scroll", this.onScroll);
    this.settings.onChange(this.scheduleRecalculate);

    this.prepareDom();
    this.waitForEditor();
  }

  private waitForEditor = () => {
    const editor = getEditorFromState(this.view.state);
    if (!editor) {
      setTimeout(this.waitForEditor, 0);
      return;
    }
    this.editor = editor;
    this.scheduleRecalculate();
  };

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
    clearTimeout(this.scheduled);
    this.scheduled = setTimeout(this.calculate, 0);
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
      this.settings.verticalLines &&
      this.obsidianSettings.isDefaultThemeEnabled() &&
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

  private recursive(list: List, parentCtx: { rootLeft?: number } = {}) {
    const children = list.getChildren();

    if (children.length === 0) {
      return;
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

    let visibleFrom = this.view.visibleRanges[0].from;
    let visibleTo =
      this.view.visibleRanges[this.view.visibleRanges.length - 1].to;
    const zoomRange = this.editor.getZoomRange();
    if (zoomRange) {
      visibleFrom = Math.max(
        visibleFrom,
        this.editor.posToOffset(zoomRange.from)
      );
      visibleTo = Math.min(visibleTo, this.editor.posToOffset(zoomRange.to));
    }

    if (fromOffset > visibleTo || tillOffset < visibleFrom) {
      return;
    }

    const coords = this.view.coordsAtPos(fromOffset, 1);
    if (parentCtx.rootLeft === undefined) {
      parentCtx.rootLeft = coords.left;
    }
    const left = Math.floor(coords.right - parentCtx.rootLeft);

    const top =
      visibleFrom > 0 && fromOffset < visibleFrom
        ? -20
        : this.view.lineBlockAt(fromOffset).top;
    const bottom =
      tillOffset > visibleTo
        ? this.view.lineBlockAt(visibleTo - 1).bottom
        : this.view.lineBlockAt(tillOffset).bottom;
    const height = bottom - top;

    if (height > 0 && !list.isFolded()) {
      const nextSibling = list.getParent().getNextSiblingOf(list);
      const hasNextSibling =
        !!nextSibling &&
        this.editor.posToOffset(nextSibling.getFirstLineContentStart()) <=
          visibleTo;

      this.lines.push({
        top,
        left,
        height: `calc(${height}px ${hasNextSibling ? "- 1.5em" : "- 2em"})`,
        list,
      });
    }

    for (const child of children) {
      if (!child.isEmpty()) {
        this.recursive(child, parentCtx);
      }
    }
  }

  private onClick = (e: MouseEvent) => {
    e.preventDefault();

    const line = this.lines[Number((e.target as HTMLElement).dataset.index)];

    switch (this.settings.verticalLinesAction) {
      case "zoom-in":
        this.zoomIn(line);
        break;

      case "toggle-folding":
        this.toggleFolding(line);
        break;
    }
  };

  private zoomIn(line: LineData) {
    const editor = getEditorFromState(this.view.state);

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

    const editor = getEditorFromState(this.view.state);

    for (const l of linesToToggle) {
      if (needToUnfold) {
        editor.unfold(l);
      } else {
        editor.fold(l);
      }
    }
  }

  private updateDom() {
    const cmScroll = this.view.scrollDOM;
    const cmContent = this.view.contentDOM;
    const cmContentContainer = cmContent.parentElement;
    const cmSizer = cmContentContainer.parentElement;

    /**
     * Obsidian can add additional elements into Content Manager.
     * The most obvious case is the 'embedded-backlinks' core plugin that adds a menu inside a Content Manager.
     * We must take heights of all of these elements into account
     * to be able to calculate the correct size of lines' container.
     */
    let cmSizerChildrenSumHeight = 0;
    for (let i = 0; i < cmSizer.children.length; i++) {
      cmSizerChildrenSumHeight += cmSizer.children[i].clientHeight;
    }

    this.scroller.style.top = cmScroll.offsetTop + "px";
    this.contentContainer.style.height = cmSizerChildrenSumHeight + "px";
    this.contentContainer.style.marginLeft =
      cmContentContainer.offsetLeft + "px";
    this.contentContainer.style.marginTop =
      (cmContent.firstElementChild as HTMLElement).offsetTop - 24 + "px";

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
      e.style.height = l.height;
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
    this.settings.removeCallback(this.scheduleRecalculate);
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll);
    this.view.dom.removeChild(this.scroller);
    clearTimeout(this.scheduled);
  }
}

export class VerticalLines implements Feature {
  private updateBodyClassInterval: number;

  constructor(
    private plugin: Plugin_2,
    private settings: Settings,
    private obsidianSettings: ObsidianSettings,
    private parser: Parser
  ) {}

  async load() {
    this.updateBodyClass();
    this.updateBodyClassInterval = window.setInterval(() => {
      this.updateBodyClass();
    }, 1000);

    this.plugin.registerEditorExtension(
      ViewPlugin.define(
        (view) =>
          new VerticalLinesPluginValue(
            this.settings,
            this.obsidianSettings,
            this.parser,
            view
          )
      )
    );
  }

  async unload() {
    clearInterval(this.updateBodyClassInterval);
    document.body.classList.remove(VERTICAL_LINES_BODY_CLASS);
  }

  private updateBodyClass = () => {
    const shouldExists =
      this.obsidianSettings.isDefaultThemeEnabled() &&
      this.settings.verticalLines;
    const exists = document.body.classList.contains(VERTICAL_LINES_BODY_CLASS);

    if (shouldExists && !exists) {
      document.body.classList.add(VERTICAL_LINES_BODY_CLASS);
    }

    if (!shouldExists && exists) {
      document.body.classList.remove(VERTICAL_LINES_BODY_CLASS);
    }
  };
}
