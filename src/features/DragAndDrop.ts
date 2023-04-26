import { Notice, Platform, Plugin_2, editorInfoField } from "obsidian";

import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor } from "../MyEditor";
import { MoveListToDifferentPosition } from "../operations/MoveListToDifferentPosition";
import { List, Root, cmpPos } from "../root";
import { ObsidianService } from "../services/ObsidianService";
import { ParserService } from "../services/ParserService";
import { PerformOperationService } from "../services/PerformOperationService";
import { SettingsService } from "../services/SettingsService";

export class DragAndDrop implements Feature {
  private dropZone: HTMLDivElement;
  private state: DragAndDropState | null = null;

  constructor(
    private plugin: Plugin_2,
    private settings: SettingsService,
    private obisidian: ObsidianService,
    private parser: ParserService,
    private performOperation: PerformOperationService
  ) {}

  async load() {
    this.plugin.registerEditorExtension(dndStateField);
    this.enableFeatureToggle();
    this.createDropZone();
    this.addEventListeners();
  }

  async unload() {
    this.removeEventListeners();
    this.removeDropZone();
    this.disableFeatureToggle();
  }

  private enableFeatureToggle() {
    this.settings.onChange("dndExperiment", this.handleSettingsChange);
    this.handleSettingsChange(this.settings.dndExperiment);
  }

  private disableFeatureToggle() {
    this.settings.removeCallback("dndExperiment", this.handleSettingsChange);
    this.handleSettingsChange(false);
  }

  private createDropZone() {
    this.dropZone = document.createElement("div");
    this.dropZone.classList.add("outliner-plugin-drop-zone");
    this.dropZone.style.display = "none";
    document.body.appendChild(this.dropZone);
  }

  private removeDropZone() {
    document.body.removeChild(this.dropZone);
    this.dropZone = null;
  }

  private addEventListeners() {
    document.addEventListener("mousedown", this.handleMouseDown, {
      capture: true,
    });
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("keydown", this.handleKeyDown);
  }

  private removeEventListeners() {
    document.removeEventListener("mousedown", this.handleMouseDown, {
      capture: true,
    });
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  private handleSettingsChange(dndExperiment: boolean) {
    if (!isFeatureSupported()) {
      return;
    }

    if (dndExperiment) {
      document.body.classList.add("outliner-plugin-dnd");
    } else {
      document.body.classList.remove("outliner-plugin-dnd");
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (
      !isFeatureSupported() ||
      !this.settings.dndExperiment ||
      !isClickOnBullet(e)
    ) {
      return;
    }

    const view = getEditorViewFromHTMLElement(e.target as HTMLElement);
    if (!view) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    this.startDragging(e.x, e.y, view);
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.state) {
      this.detectAndDrawDropZone(e.x, e.y);
    }
  };

  private handleMouseUp = () => {
    if (this.state) {
      this.stopDragging();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.state && e.code === "Escape") {
      this.cancelDragging();
    }
  };

  private startDragging(x: number, y: number, view: EditorView) {
    const editor = new MyEditor(view.state.field(editorInfoField).editor);
    const pos = editor.offsetToPos(view.posAtCoords({ x, y }));
    const root = this.parser.parse(editor, pos);
    const list = root.getListUnderLine(pos.line);
    const state = new DragAndDropState(view, editor, root, list);

    if (!state.hasDropVariants()) {
      return;
    }

    this.state = state;
    this.highlightDraggingLines();
    this.detectAndDrawDropZone(x, y);
  }

  private detectAndDrawDropZone(x: number, y: number) {
    this.state.calculateNearestDropVariant(x, y);
    this.drawDropZone();
  }

  private cancelDragging() {
    this.state.dropVariant = null;
    this.stopDragging();
  }

  private stopDragging() {
    this.unhightlightDraggingLines();
    this.hideDropZone();
    this.applyChanges();
    this.state = null;
  }

  private applyChanges() {
    if (!this.state.dropVariant) {
      return;
    }

    const { state } = this;
    const { dropVariant, editor, root, list } = state;

    const newRoot = this.parser.parse(editor, root.getRange()[0]);
    if (!isSameRoots(root, newRoot)) {
      new Notice(
        `The item cannot be moved. The page content changed during the move.`,
        5000
      );
      return;
    }

    this.performOperation.evalOperation(
      root,
      new MoveListToDifferentPosition(
        root,
        list,
        dropVariant.placeToMove,
        dropVariant.whereToMove,
        this.obisidian.getDefaultIndentChars()
      ),
      editor
    );
  }

  private highlightDraggingLines() {
    const { state } = this;
    const { list, editor, view } = state;

    const lines = [];
    const fromLine = list.getFirstLineContentStart().line;
    const tillLine = list.getContentEndIncludingChildren().line;
    for (let i = fromLine; i <= tillLine; i++) {
      lines.push(editor.posToOffset({ line: i, ch: 0 }));
    }
    view.dispatch({
      effects: [dndStarted.of(lines)],
    });

    document.body.classList.add("outliner-plugin-dragging");
  }

  private unhightlightDraggingLines() {
    document.body.classList.remove("outliner-plugin-dragging");

    this.state.view.dispatch({
      effects: [dndEnded.of()],
    });
  }

  private drawDropZone() {
    const { state } = this;
    const { view, editor, list, dropVariant } = state;

    const width = Math.round(
      view.contentDOM.offsetWidth -
        (dropVariant.left -
          view.coordsAtPos(
            editor.posToOffset({
              line: list.getFirstLineContentStart().line,
              ch: 0,
            })
          ).left)
    );

    this.dropZone.style.display = "block";
    this.dropZone.style.top = dropVariant.top + "px";
    this.dropZone.style.left = dropVariant.left + "px";
    this.dropZone.style.width = width + "px";

    if (
      dropVariant.whereToMove === "before" &&
      !this.dropZone.classList.contains("outliner-plugin-drop-zone-before")
    ) {
      this.dropZone.classList.remove("outliner-plugin-drop-zone-after");
      this.dropZone.classList.add("outliner-plugin-drop-zone-before");
    } else if (
      (dropVariant.whereToMove === "after" ||
        dropVariant.whereToMove === "inside") &&
      !this.dropZone.classList.contains("outliner-plugin-drop-zone-after")
    ) {
      this.dropZone.classList.remove("outliner-plugin-drop-zone-before");
      this.dropZone.classList.add("outliner-plugin-drop-zone-after");
    }
  }

  private hideDropZone() {
    this.dropZone.style.display = "none";
  }
}

interface DropVariant {
  line: number;
  level: number;
  left: number;
  top: number;
  placeToMove: List;
  whereToMove: "after" | "before" | "inside";
}

class DragAndDropState {
  private dropVariants: Map<string, DropVariant> = new Map();
  public dropVariant: DropVariant = null;

  constructor(
    public readonly view: EditorView,
    public readonly editor: MyEditor,
    public readonly root: Root,
    public readonly list: List
  ) {
    this.collectDropVariants();
  }

  getDropVariants() {
    return Array.from(this.dropVariants.values());
  }

  hasDropVariants() {
    return this.dropVariants.size > 0;
  }

  calculateNearestDropVariant(x: number, y: number) {
    const { view, editor } = this;

    this.dropVariant = this.getDropVariants()
      .map((v) => {
        const { placeToMove } = v;

        switch (v.whereToMove) {
          case "before":
          case "after":
            v.left = Math.round(
              view.coordsAtPos(
                editor.posToOffset({
                  line: placeToMove.getFirstLineContentStart().line,
                  ch: placeToMove.getFirstLineIndent().length,
                })
              ).left
            );
            break;

          case "inside":
            v.left = Math.round(
              view.coordsAtPos(
                editor.posToOffset({
                  line: placeToMove.getFirstLineContentStart().line,
                  ch: placeToMove.getFirstLineIndent().length,
                })
              ).left +
                view.defaultCharacterWidth * 2
            );
            break;
        }

        switch (v.whereToMove) {
          case "before":
            v.top = Math.round(
              view.coordsAtPos(
                editor.posToOffset(placeToMove.getFirstLineContentStart())
              ).top
            );
            break;

          case "after":
          case "inside":
            v.top = Math.round(
              view.coordsAtPos(
                editor.posToOffset(placeToMove.getContentEndIncludingChildren())
              ).top + view.defaultLineHeight
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
  }

  private addDropVariant(v: DropVariant) {
    this.dropVariants.set(`${v.line} ${v.level}`, v);
  }

  private collectDropVariants() {
    const visit = (lists: List[]) => {
      for (const placeToMove of lists) {
        const lineBefore = placeToMove.getFirstLineContentStart().line;
        const lineAfter = placeToMove.getContentEndIncludingChildren().line + 1;

        const level = placeToMove.getLevel();

        this.addDropVariant({
          line: lineBefore,
          level,
          left: 0,
          top: 0,
          placeToMove,
          whereToMove: "before",
        });
        this.addDropVariant({
          line: lineAfter,
          level,
          left: 0,
          top: 0,
          placeToMove,
          whereToMove: "after",
        });

        if (placeToMove.isEmpty()) {
          this.addDropVariant({
            line: lineAfter,
            level: level + 1,
            left: 0,
            top: 0,
            placeToMove,
            whereToMove: "inside",
          });
        }

        if (placeToMove !== this.list) {
          visit(placeToMove.getChildren());
        }
      }
    };

    visit(this.root.getChildren());
  }
}

const dndStarted = StateEffect.define<number[]>({
  map: (lines, change) => lines.map((l) => change.mapPos(l)),
});

const dndEnded = StateEffect.define<void>();

const draggingLineDecoration = Decoration.line({
  class: "outliner-plugin-dragging-line",
});

const dndStateField = StateField.define<DecorationSet>({
  create: () => Decoration.none,

  update: (dndState, tr) => {
    dndState = dndState.map(tr.changes);

    for (const e of tr.effects) {
      if (e.is(dndStarted)) {
        dndState = dndState.update({
          add: e.value.map((l) => draggingLineDecoration.range(l, l)),
        });
      }

      if (e.is(dndEnded)) {
        dndState = Decoration.none;
      }
    }

    return dndState;
  },

  provide: (f) => EditorView.decorations.from(f),
});

function getEditorViewFromHTMLElement(e: HTMLElement) {
  while (e && !e.classList.contains("cm-editor")) {
    e = e.parentElement;
  }

  if (!e) {
    return null;
  }

  return EditorView.findFromDOM(e);
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

function isSameRoots(a: Root, b: Root) {
  const aRange = a.getRange();
  const bRange = b.getRange();

  if (
    cmpPos(aRange[0], bRange[0]) !== 0 ||
    cmpPos(aRange[1], bRange[1]) !== 0
  ) {
    return false;
  }

  return a.print() === b.print();
}

function isFeatureSupported() {
  return Platform.isDesktop;
}
