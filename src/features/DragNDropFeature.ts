import { Notice, Plugin_2, editorInfoField } from "obsidian";

import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

import { MyEditor } from "src/MyEditor";
import { MoveListToDifferentPositionOperation } from "src/operations/MoveListToDifferentPositionOperation";
import { List, Position, Root } from "src/root";
import { ParserService } from "src/services/ParserService";
import { PerformOperationService } from "src/services/PerformOperationService";

import { Feature } from "../features/Feature";

function isPlaceToMoveIsInsideListToMove(listToMove: List, placeToMove: List) {
  const visit = (cur: List, check: List) => {
    if (cur === check) {
      return true;
    }

    for (const child of cur.getChildren()) {
      if (visit(child, check)) {
        return true;
      }
    }

    return false;
  };

  return visit(listToMove, placeToMove);
}

function isClickOnBullet(e: MouseEvent) {
  let el = e.target as HTMLElement;

  while (el) {
    if (
      el.classList.contains("cm-formatting-list") ||
      el.classList.contains("cm-fold-indicator")
    ) {
      return true;
    }

    el = el.parentElement;
  }

  return false;
}

function isSamePositions(a: Position, b: Position) {
  return a.line === b.line && a.ch === b.ch;
}

function isSameRoots(a: Root, b: Root) {
  const aRange = a.getRange();
  const bRange = b.getRange();

  if (
    !isSamePositions(aRange[0], bRange[0]) ||
    !isSamePositions(aRange[1], bRange[1])
  ) {
    return false;
  }

  return a.print() === b.print();
}

const dragStart = StateEffect.define<number[]>({
  map: (lines, change) => lines.map((l) => change.mapPos(l)),
});
const dragEnd = StateEffect.define<void>();

const draggingMark = Decoration.line({
  class: "outliner-plugin-dragging-line",
});

const draggingField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(draggingLines, tr) {
    draggingLines = draggingLines.map(tr.changes);

    for (const e of tr.effects) {
      if (e.is(dragEnd)) {
        draggingLines = Decoration.none;
      }
      if (e.is(dragStart)) {
        draggingLines = draggingLines.update({
          add: e.value.map((l) => draggingMark.range(l, l)),
        });
      }
    }

    return draggingLines;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export class DragNDropFeature implements Feature {
  private dragging = false;
  private activeView: EditorView;
  private editor: MyEditor;
  private root: Root;
  private list: List;
  private dropZone: HTMLDivElement;
  private nearest: List;
  private before: boolean;

  constructor(
    private plugin: Plugin_2,
    private parser: ParserService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.dropZone = document.createElement("div");
    this.dropZone.classList.add("outliner-plugin-drop-zone");
    this.dropZone.style.display = "none";
    document.body.appendChild(this.dropZone);

    this.plugin.registerEditorExtension(draggingField);

    document.addEventListener("mousedown", this.handleMouseDown, {
      capture: true,
    });
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
  }

  async unload() {}

  private handleMouseDown = (e: MouseEvent) => {
    if (!isClickOnBullet(e)) {
      return;
    }

    let viewElement = e.target as HTMLElement;
    while (viewElement && !viewElement.classList.contains("cm-editor")) {
      viewElement = viewElement.parentElement;
    }
    const view = EditorView.findFromDOM(viewElement);

    if (!view) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.startDragging(e.x, e.y, view);
  };

  private handleMouseMove = (e: MouseEvent) => {
    this.detectDropZone(e.x, e.y);
  };

  private handleMouseUp = () => {
    this.stopDragging();
  };

  private startDragging(x: number, y: number, view: EditorView) {
    const editor = new MyEditor(view.state.field(editorInfoField).editor);
    const pos = editor.offsetToPos(view.posAtCoords({ x, y }));
    const root = this.parser.parse(editor, pos);
    const list = root.getListUnderLine(pos.line);
    this.dragging = true;
    this.activeView = view;
    this.root = root;
    this.editor = editor;
    this.list = list;

    let lastChild = list;
    while (lastChild.getChildren().length > 0) {
      lastChild = lastChild.getChildren().last();
    }
    const lines = [];
    for (
      let i = list.getFirstLineContentStart().line;
      i <= lastChild.getLastLineContentEnd().line;
      i++
    ) {
      lines.push(editor.posToOffset({ line: i, ch: 0 }));
    }
    this.activeView.dispatch({
      effects: [dragStart.of(lines)],
    });

    document.body.classList.add("outliner-plugin-dragging");

    this.detectDropZone(x, y);
  }

  private detectDropZone(x: number, y: number) {
    if (!this.dragging) {
      return;
    }

    const startH = this.activeView.coordsAtPos(
      this.editor.posToOffset(this.root.getRange()[0])
    ).top;
    const endH = this.activeView.coordsAtPos(
      this.editor.posToOffset(this.root.getRange()[1])
    ).top;

    let nearest: List | null = null;
    let before = true;
    if (y > endH) {
      before = false;
      nearest = this.root.getListUnderLine(this.root.getRange()[1].line);
    } else if (y < startH) {
      nearest = this.root.getListUnderLine(this.root.getRange()[0].line);
    } else {
      const pos = this.editor.offsetToPos(
        this.activeView.posAtCoords({ x: x, y: y })
      );
      nearest = this.root.getListUnderLine(pos.line);
    }

    if (isPlaceToMoveIsInsideListToMove(this.list, nearest)) {
      nearest = null;
    }

    this.nearest = nearest;
    this.before = before;

    if (!nearest) {
      this.dropZone.style.display = "none";
      return;
    }

    const left = this.activeView.coordsAtPos(
      this.editor.posToOffset({
        line: nearest.getFirstLineContentStart().line,
        ch: nearest.getFirstLineIndent().length,
      })
    ).left;

    const top =
      this.activeView.coordsAtPos(
        this.editor.posToOffset(
          before
            ? nearest.getFirstLineContentStart()
            : nearest.getLastLineContentEnd()
        )
      ).top + (before ? 0 : this.activeView.defaultLineHeight);

    if (
      before &&
      !this.dropZone.classList.contains("outliner-plugin-drop-zone-before")
    ) {
      this.dropZone.classList.remove("outliner-plugin-drop-zone-after");
      this.dropZone.classList.add("outliner-plugin-drop-zone-before");
    } else if (
      !before &&
      !this.dropZone.classList.contains("outliner-plugin-drop-zone-after")
    ) {
      this.dropZone.classList.remove("outliner-plugin-drop-zone-before");
      this.dropZone.classList.add("outliner-plugin-drop-zone-after");
    }

    this.dropZone.style.display = "block";
    this.dropZone.style.top = top + "px";
    this.dropZone.style.left = left + "px";
  }

  private stopDragging() {
    if (!this.dragging) {
      return;
    }

    document.body.classList.remove("outliner-plugin-dragging");

    this.activeView.dispatch({
      effects: [dragEnd.of()],
    });

    this.activeView = null;
    this.dragging = false;
    this.dropZone.style.display = "none";

    if (this.nearest) {
      const newRoot = this.parser.parse(this.editor, this.root.getRange()[0]);
      if (!isSameRoots(this.root, newRoot)) {
        new Notice(
          `The item cannot be moved. The page content changed during the move.`,
          5000
        );
        return;
      }

      this.performOperation.evalOperation(
        this.root,
        new MoveListToDifferentPositionOperation(
          this.root,
          this.list,
          this.nearest,
          this.before ? "before" : "after"
        ),
        this.editor
      );
    }
  }
}
