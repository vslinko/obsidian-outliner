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

export class MyEditor {
  private view: EditorView;

  constructor(private e: Editor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.view = (this.e as any).cm;
  }

  getCursor(): MyEditorPosition {
    return this.e.getCursor();
  }

  getLine(n: number): string {
    return this.e.getLine(n);
  }

  lastLine(): number {
    return this.e.lastLine();
  }

  listSelections(): MyEditorSelection[] {
    return this.e.listSelections();
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

  offsetToPos(offset: number): MyEditorPosition {
    return this.e.offsetToPos(offset);
  }

  posToOffset(pos: MyEditorPosition): number {
    return this.e.posToOffset(pos);
  }

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

  getAllPossibleLinesToFold(from = 0, till = this.lastLine()): number[] {
    const state = this.view.state;
    const doc = state.doc;
    const result: number[] = [];

    for (let i = from; i <= till; i++) {
      const l = doc.line(i + 1);
      const range = foldable(state, l.from, l.to);
      if (range && range.from === l.to) {
        result.push(i);
      }
    }

    return result;
  }

  getAllFoldedLines(from = 0, till = this.lastLine()): number[] {
    const state = this.view.state;
    const res: number[] = [];

    foldedRanges(state).between(
      this.posToOffset({ line: from, ch: 0 }),
      this.posToOffset({ line: till + 1, ch: 0 }),
      (from) => {
        res.push(this.offsetToPos(from).line);
      }
    );

    return res;
  }

  triggerOnKeyDown(e: KeyboardEvent): void {
    runScopeHandlers(this.view, e, "editor");
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
