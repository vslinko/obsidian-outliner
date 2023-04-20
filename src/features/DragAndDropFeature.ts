import { Notice, Platform, Plugin_2, editorInfoField } from "obsidian";

import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

import { MyEditor } from "src/MyEditor";
import { MoveListToDifferentPositionOperation } from "src/operations/MoveListToDifferentPositionOperation";
import { List, Position, Root } from "src/root";
import { ObsidianService } from "src/services/ObsidianService";
import { ParserService } from "src/services/ParserService";
import { PerformOperationService } from "src/services/PerformOperationService";
import { SettingsService } from "src/services/SettingsService";

import { Feature } from "./Feature";

interface DropVariant {
  line: number;
  level: number;
  left: number;
  top: number;
  placeToMove: List;
  lastChild: List;
  whereToMove: "after" | "before" | "inside";
}

function getLastChild(list: List) {
  let lastChild = list;
  while (lastChild.getChildren().length > 0) {
    lastChild = lastChild.getChildren().last();
  }

  return lastChild;
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

function isSupported() {
  return Platform.isDesktop;
}

export class DragAndDropFeature implements Feature {
  private dragging = false;
  private view: EditorView;
  private editor: MyEditor;
  private root: Root;
  private list: List;
  private dropZone: HTMLDivElement;
  private dropVariants: Map<string, DropVariant> = new Map();
  private dropVariant: DropVariant;

  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private obisidian: ObsidianService,
    private parser: ParserService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.settings.onChange("dndExperiment", this.handleSettingsChange);
    this.handleSettingsChange(this.settings.dndExperiment);

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
    document.addEventListener("keydown", this.handleKeyDown);
  }

  async unload() {
    this.settings.removeCallback("dndExperiment", this.handleSettingsChange);
    this.handleSettingsChange(false);

    document.body.removeChild(this.dropZone);
    this.dropZone = null;

    document.removeEventListener("mousedown", this.handleMouseDown, {
      capture: true,
    });
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleSettingsChange(dndExperiment: boolean) {
    if (!isSupported()) {
      return;
    }
    if (dndExperiment) {
      document.body.classList.add("outliner-plugin-dnd");
    } else {
      document.body.classList.remove("outliner-plugin-dnd");
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (!isSupported() || !this.settings.dndExperiment || !isClickOnBullet(e)) {
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

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.dragging && e.code === "Escape") {
      this.dropVariant = null;
      this.stopDragging();
    }
  };

  private startDragging(x: number, y: number, view: EditorView) {
    const editor = new MyEditor(view.state.field(editorInfoField).editor);
    const pos = editor.offsetToPos(view.posAtCoords({ x, y }));
    const root = this.parser.parse(editor, pos);
    const list = root.getListUnderLine(pos.line);

    this.dropVariants.clear();
    const visit = (lists: List[]) => {
      for (const placeToMove of lists) {
        let lastChild = placeToMove;
        while (lastChild.getChildren().length > 0) {
          lastChild = lastChild.getChildren().last();
        }

        const lineBefore = placeToMove.getFirstLineContentStart().line;
        const lineAfter = lastChild.getLastLineContentEnd().line + 1;

        const level = placeToMove.getLevel();

        this.dropVariants.set(`${lineBefore} ${level}`, {
          line: lineBefore,
          level,
          left: 0,
          top: 0,
          placeToMove,
          lastChild,
          whereToMove: "before",
        });
        this.dropVariants.set(`${lineAfter} ${level}`, {
          line: lineAfter,
          level,
          left: 0,
          top: 0,
          placeToMove,
          lastChild,
          whereToMove: "after",
        });

        if (placeToMove.getChildren().length === 0) {
          this.dropVariants.set(`${lineAfter} ${level + 1}`, {
            line: lineAfter,
            level: level + 1,
            left: 0,
            top: 0,
            placeToMove,
            lastChild,
            whereToMove: "inside",
          });
        }

        if (placeToMove !== list) {
          visit(placeToMove.getChildren());
        }
      }
    };
    visit(root.getChildren());

    if (this.dropVariants.size === 0) {
      return;
    }

    this.dragging = true;
    this.view = view;
    this.root = root;
    this.editor = editor;
    this.list = list;

    const fromLine = list.getFirstLineContentStart().line;
    const tillLine = getLastChild(list).getLastLineContentEnd().line;
    const lines = [];
    for (let i = fromLine; i <= tillLine; i++) {
      lines.push(editor.posToOffset({ line: i, ch: 0 }));
    }
    this.view.dispatch({
      effects: [dragStart.of(lines)],
    });

    document.body.classList.add("outliner-plugin-dragging");

    this.detectDropZone(x, y);
  }

  private detectDropZone(x: number, y: number) {
    if (!this.dragging) {
      return;
    }

    const variant = Array.from(this.dropVariants.values())
      .map((v) => {
        const { placeToMove } = v;

        switch (v.whereToMove) {
          case "before":
          case "after":
            v.left = Math.round(
              this.view.coordsAtPos(
                this.editor.posToOffset({
                  line: placeToMove.getFirstLineContentStart().line,
                  ch: placeToMove.getFirstLineIndent().length,
                })
              ).left
            );
            break;

          case "inside":
            v.left = Math.round(
              this.view.coordsAtPos(
                this.editor.posToOffset({
                  line: placeToMove.getFirstLineContentStart().line,
                  ch: placeToMove.getFirstLineIndent().length,
                })
              ).left +
                this.view.defaultCharacterWidth * 2
            );
            break;
        }

        switch (v.whereToMove) {
          case "before":
            v.top = Math.round(
              this.view.coordsAtPos(
                this.editor.posToOffset(placeToMove.getFirstLineContentStart())
              ).top
            );
            break;

          case "after":
          case "inside":
            v.top = Math.round(
              this.view.coordsAtPos(
                this.editor.posToOffset(v.lastChild.getLastLineContentEnd())
              ).top + this.view.defaultLineHeight
            );
            break;
        }

        return v;
      })
      .sort((a, b) => {
        if (a.top === b.top) {
          return Math.abs(x - a.left) - Math.abs(x - b.left);
        }

        return Math.abs(y - a.top) - Math.abs(y - b.top);
      })
      .first();

    this.dropVariant = variant;

    const width = Math.round(
      this.view.contentDOM.offsetWidth -
        (variant.left - this.view.coordsAtPos(0).left)
    );

    this.dropZone.style.display = "block";
    this.dropZone.style.top = variant.top + "px";
    this.dropZone.style.left = variant.left + "px";
    this.dropZone.style.width = width + "px";

    if (
      variant.whereToMove === "before" &&
      !this.dropZone.classList.contains("outliner-plugin-drop-zone-before")
    ) {
      this.dropZone.classList.remove("outliner-plugin-drop-zone-after");
      this.dropZone.classList.add("outliner-plugin-drop-zone-before");
    } else if (
      (variant.whereToMove === "after" || variant.whereToMove === "inside") &&
      !this.dropZone.classList.contains("outliner-plugin-drop-zone-after")
    ) {
      this.dropZone.classList.remove("outliner-plugin-drop-zone-before");
      this.dropZone.classList.add("outliner-plugin-drop-zone-after");
    }
  }

  private stopDragging() {
    if (!this.dragging) {
      return;
    }

    document.body.classList.remove("outliner-plugin-dragging");

    this.view.dispatch({
      effects: [dragEnd.of()],
    });

    this.dropZone.style.display = "none";

    if (this.dropVariant) {
      const newRoot = this.parser.parse(this.editor, this.root.getRange()[0]);
      if (isSameRoots(this.root, newRoot)) {
        this.performOperation.evalOperation(
          this.root,
          new MoveListToDifferentPositionOperation(
            this.root,
            this.list,
            this.dropVariant.placeToMove,
            this.dropVariant.whereToMove,
            this.obisidian.getDefaultIndentChars()
          ),
          this.editor
        );
      } else {
        new Notice(
          `The item cannot be moved. The page content changed during the move.`,
          5000
        );
        return;
      }
    }

    this.dragging = false;
    this.dropVariant = null;
    this.view = null;
    this.root = null;
    this.editor = null;
    this.list = null;
  }
}
