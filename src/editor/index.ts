import { Editor, editorInfoField } from "obsidian";

import {
  foldEffect,
  foldable,
  foldedRanges,
  unfoldEffect,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
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

export function getEditorFromState(state: EditorState) {
  const { editor } = state.field(editorInfoField);

  if (!editor) {
    return null;
  }

  return new MyEditor(editor);
}

declare global {
  interface Window {
    ObsidianZoomPlugin?: {
      getZoomRange(e: Editor): MyEditorRange;
      zoomOut(e: Editor): void;
      zoomIn(e: Editor, line: number): void;
      refreshZoom?(e: Editor): void;
    };
  }
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

  getAllFoldedLines(): number[] {
    const c = foldedRanges(this.view.state).iter();
    const res: number[] = [];
    while (c.value) {
      res.push(this.offsetToPos(c.from).line);
      c.next();
    }
    return res;
  }

  triggerOnKeyDown(e: KeyboardEvent): void {
    runScopeHandlers(this.view, e, "editor");
  }

  getZoomRange(): MyEditorRange | null {
    if (!window.ObsidianZoomPlugin) {
      return null;
    }

    return window.ObsidianZoomPlugin.getZoomRange(this.e);
  }

  zoomOut() {
    if (!window.ObsidianZoomPlugin) {
      return;
    }

    window.ObsidianZoomPlugin.zoomOut(this.e);
  }

  zoomIn(line: number) {
    if (!window.ObsidianZoomPlugin) {
      return;
    }

    window.ObsidianZoomPlugin.zoomIn(this.e, line);
  }

  tryRefreshZoom(line: number) {
    if (!window.ObsidianZoomPlugin) {
      return;
    }

    if (window.ObsidianZoomPlugin.refreshZoom) {
      window.ObsidianZoomPlugin.refreshZoom(this.e);
    } else {
      window.ObsidianZoomPlugin.zoomIn(this.e, line);
    }
  }
}
