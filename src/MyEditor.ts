/* eslint-disable @typescript-eslint/no-unused-vars */
import { Editor } from "obsidian";

import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/fold";
import { foldable } from "@codemirror/language";
import { EditorView, runScopeHandlers } from "@codemirror/view";

export class MyEditorPosition {
  line: number;
  ch: number;
}

export class MyEditorRange {
  from: MyEditorPosition;
  to: MyEditorPosition;
}

export class MyEditorSelection {
  anchor: MyEditorPosition;
  head: MyEditorPosition;
}

function foldInside(view: EditorView, from: number, to: number) {
  let found: { from: number; to: number } | null = null;
  foldedRanges(view.state).between(from, to, (from, to) => {
    if (!found || found.from > from) found = { from, to };
  });
  return found;
}

export class MyCMEditor {
  constructor(protected view: EditorView) {}

  fold(n: number): void {
    const { view } = this;
    const l = view.lineBlockAt(view.state.doc.line(n + 1).from);
    const range = foldable(view.state, l.from, l.to);

    if (!range || range.from === range.to) {
      return;
    }

    view.dispatch({ effects: [foldEffect.of(range)] });
  }

  unfold(n: number): void {
    const { view } = this;
    const l = view.lineBlockAt(view.state.doc.line(n + 1).from);
    const range = foldInside(view, l.from, l.to);

    if (!range) {
      return;
    }

    view.dispatch({ effects: [unfoldEffect.of(range)] });
  }

  isFolded(n: number): boolean {
    return this.getFirstLineOfFolding(n) !== null;
  }

  getFirstLineOfFolding(n: number): number | null {
    const { view } = this;
    const l = view.lineBlockAt(view.state.doc.line(n + 1).from);
    const range = foldInside(view, l.from, l.to);

    if (!range) {
      return null;
    }

    return view.state.doc.lineAt(range.from).number - 1;
  }

  triggerOnKeyDown(e: KeyboardEvent): void {
    runScopeHandlers(this.view, e, "editor");
  }

  getCursor(): MyEditorPosition {
    return this.offsetToPos(this.view.state.selection.main.anchor);
  }

  getLine(n: number): string {
    return this.view.state.doc.line(n + 1).text;
  }

  lastLine(): number {
    return this.view.state.doc.lines - 1;
  }

  listSelections(): MyEditorSelection[] {
    return this.view.state.selection.ranges.map((r) => ({
      anchor: this.offsetToPos(r.anchor),
      head: this.offsetToPos(r.head),
    }));
  }

  offsetToPos(offset: number): MyEditorPosition {
    const line = this.view.state.doc.lineAt(offset);

    return {
      line: line.number - 1,
      ch: offset - line.from,
    };
  }

  posToOffset(pos: MyEditorPosition): number {
    const line = this.view.state.doc.line(pos.line + 1);

    return line.from + pos.ch;
  }
}

export class MyEditor {
  private cmEditor: MyCMEditor;

  constructor(private e: Editor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const view: EditorView = (this.e as any).cm;
    this.cmEditor = new MyCMEditor(view);
  }

  getCursor(): MyEditorPosition {
    return this.cmEditor.getCursor();
  }

  getLine(n: number): string {
    return this.cmEditor.getLine(n);
  }

  lastLine(): number {
    return this.cmEditor.lastLine();
  }

  listSelections(): MyEditorSelection[] {
    return this.cmEditor.listSelections();
  }

  getRange(from: MyEditorPosition, to: MyEditorPosition): string {
    return this.e.getRange(from, to);
  }

  replaceRange(
    replacement: string,
    from: MyEditorPosition,
    to: MyEditorPosition
  ): void {
    return this.e.replaceRange(replacement, from, to);
  }

  setSelections(selections: MyEditorSelection[]): void {
    this.e.setSelections(selections);
  }

  setValue(text: string): void {
    this.e.setValue(text);
  }

  getValue(): string {
    return this.e.getValue();
  }

  fold(n: number): void {
    this.cmEditor.fold(n);
  }

  unfold(n: number): void {
    this.cmEditor.unfold(n);
  }

  isFolded(n: number): boolean {
    return this.cmEditor.isFolded(n);
  }

  getFirstLineOfFolding(n: number): number | null {
    return this.cmEditor.getFirstLineOfFolding(n);
  }

  triggerOnKeyDown(e: KeyboardEvent): void {
    this.cmEditor.triggerOnKeyDown(e);
  }

  getZoomRange(): MyEditorRange | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).ObsidianZoomPlugin;

    if (!api || !api.getZoomRange) {
      return null;
    }

    return api.getZoomRange(this.e);
  }

  zoomOut() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).ObsidianZoomPlugin;

    if (!api || !api.zoomOut) {
      return;
    }

    api.zoomOut(this.e);
  }

  zoomIn(line: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).ObsidianZoomPlugin;

    if (!api || !api.zoomIn) {
      return;
    }

    api.zoomIn(this.e, line);
  }
}
