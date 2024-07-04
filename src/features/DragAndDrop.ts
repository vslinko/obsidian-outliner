import { Notice, Platform, Plugin } from "obsidian";

import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";

import { Feature } from "./Feature";

import { MyEditor, getEditorFromState } from "../editor";
import { MoveListToDifferentPosition } from "../operations/MoveListToDifferentPosition";
import { List, Root, cmpPos } from "../root";
import { ObsidianSettings } from "../services/ObsidianSettings";
import { OperationPerformer } from "../services/OperationPerformer";
import { Parser } from "../services/Parser";
import { Settings } from "../services/Settings";

const BODY_CLASS = "outliner-plugin-dnd";

export class DragAndDrop implements Feature {
  private dropZone: HTMLDivElement;
  private dropZonePadding: HTMLDivElement;
  private preStart: DragAndDropPreStartState | null = null;
  private state: DragAndDropState | null = null;

  constructor(
    private plugin: Plugin,
    private settings: Settings,
    private obisidian: ObsidianSettings,
    private parser: Parser,
    private operationPerformer: OperationPerformer,
  ) {}

  async load() {
    this.plugin.registerEditorExtension([
      draggingLinesStateField,
      droppingLinesStateField,
    ]);
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
    this.settings.onChange(this.handleSettingsChange);
    this.handleSettingsChange();
  }

  private disableFeatureToggle() {
    this.settings.removeCallback(this.handleSettingsChange);
    document.body.classList.remove(BODY_CLASS);
  }

  private createDropZone() {
    this.dropZonePadding = document.createElement("div");
    this.dropZonePadding.classList.add("outliner-plugin-drop-zone-padding");
    this.dropZone = document.createElement("div");
    this.dropZone.classList.add("outliner-plugin-drop-zone");
    this.dropZone.style.display = "none";
    this.dropZone.appendChild(this.dropZonePadding);
    document.body.appendChild(this.dropZone);
  }

  private removeDropZone() {
    document.body.removeChild(this.dropZone);
    this.dropZonePadding = null;
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

  private handleSettingsChange = () => {
    if (!isFeatureSupported()) {
      return;
    }

    if (this.settings.dragAndDrop) {
      document.body.classList.add(BODY_CLASS);
    } else {
      document.body.classList.remove(BODY_CLASS);
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (
      !isFeatureSupported() ||
      !this.settings.dragAndDrop ||
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

    this.preStart = {
      x: e.x,
      y: e.y,
      view,
    };
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.preStart) {
      this.startDragging();
    }
    if (this.state) {
      this.detectAndDrawDropZone(e.x, e.y);
    }
  };

  private handleMouseUp = () => {
    if (this.preStart) {
      this.preStart = null;
    }
    if (this.state) {
      this.stopDragging();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.state && e.code === "Escape") {
      this.cancelDragging();
    }
  };

  private startDragging() {
    const { x, y, view } = this.preStart;
    this.preStart = null;

    const editor = getEditorFromState(view.state);
    const pos = editor.offsetToPos(view.posAtCoords({ x, y }));
    const root = this.parser.parse(editor, pos);
    const list = root.getListUnderLine(pos.line);
    const state = new DragAndDropState(view, editor, root, list);

    if (!state.hasDropVariants()) {
      return;
    }

    this.state = state;
    this.highlightDraggingLines();
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

    const newRoot = this.parser.parse(editor, root.getContentStart());
    if (!isSameRoots(root, newRoot)) {
      new Notice(
        `The item cannot be moved. The page content changed during the move.`,
        5000,
      );
      return;
    }

    this.operationPerformer.eval(
      root,
      new MoveListToDifferentPosition(
        root,
        list,
        dropVariant.placeToMove,
        dropVariant.whereToMove,
        this.obisidian.getDefaultIndentChars(),
      ),
      editor,
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
    const { view, editor, dropVariant } = state;

    const newParent =
      dropVariant.whereToMove === "inside"
        ? dropVariant.placeToMove
        : dropVariant.placeToMove.getParent();
    const newParentIsRootList = !newParent.getParent();

    {
      const width = Math.round(
        view.contentDOM.offsetWidth -
          (dropVariant.left - this.state.leftPadding),
      );

      this.dropZone.style.display = "block";
      this.dropZone.style.top = dropVariant.top + "px";
      this.dropZone.style.left = dropVariant.left + "px";
      this.dropZone.style.width = width + "px";
    }

    {
      const level = newParent.getLevel();
      const indentWidth = this.state.tabWidth;
      const width = indentWidth * level;
      const dashPadding = 3;
      const dashWidth = indentWidth - dashPadding;
      const color = getComputedStyle(document.body).getPropertyValue(
        "--color-accent",
      );

      this.dropZonePadding.style.width = `${width}px`;
      this.dropZonePadding.style.marginLeft = `-${width}px`;
      this.dropZonePadding.style.backgroundImage = `url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20${width}%204%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%22${width}%22%20y2%3D%220%22%20stroke%3D%22${color}%22%20stroke-width%3D%228%22%20stroke-dasharray%3D%22${dashWidth}%20${dashPadding}%22%2F%3E%3C%2Fsvg%3E')`;
    }

    this.state.view.dispatch({
      effects: [
        dndMoved.of(
          newParentIsRootList
            ? null
            : editor.posToOffset({
                line: newParent.getFirstLineContentStart().line,
                ch: 0,
              }),
        ),
      ],
    });
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

interface DragAndDropPreStartState {
  x: number;
  y: number;
  view: EditorView;
}

class DragAndDropState {
  private dropVariants: Map<string, DropVariant> = new Map();
  public dropVariant: DropVariant = null;
  public leftPadding = 0;
  public tabWidth = 0;

  constructor(
    public readonly view: EditorView,
    public readonly editor: MyEditor,
    public readonly root: Root,
    public readonly list: List,
  ) {
    this.collectDropVariants();
    this.calculateLeftPadding();
    this.calculateTabWidth();
  }

  getDropVariants() {
    return Array.from(this.dropVariants.values());
  }

  hasDropVariants() {
    return this.dropVariants.size > 0;
  }

  calculateNearestDropVariant(x: number, y: number) {
    const { view, editor } = this;

    const dropVariants = this.getDropVariants();

    for (const v of dropVariants) {
      const { placeToMove } = v;

      v.left = this.leftPadding + (v.level - 1) * this.tabWidth;

      const positionAfterList =
        v.whereToMove === "after" || v.whereToMove === "inside";
      const line = positionAfterList
        ? placeToMove.getContentEndIncludingChildren().line
        : placeToMove.getFirstLineContentStart().line;
      const linePos = editor.posToOffset({
        line,
        ch: 0,
      });

      v.top =
        view.coordsAtPos(linePos, -1)?.top ??
        view.dom.getBoundingClientRect().top + view.contentHeight;

      if (positionAfterList) {
        v.top += view.lineBlockAt(linePos).height;
      }

      // Better vertical alignment
      v.top -= 8;
    }

    const nearestLineTop = dropVariants
      .sort((a, b) => Math.abs(y - a.top) - Math.abs(y - b.top))
      .first().top;

    const variansOnNearestLine = dropVariants.filter(
      (v) => Math.abs(v.top - nearestLineTop) <= 4,
    );

    this.dropVariant = variansOnNearestLine
      .sort((a, b) => Math.abs(x - a.left) - Math.abs(x - b.left))
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

        if (placeToMove === this.list) {
          continue;
        }

        if (placeToMove.isEmpty()) {
          this.addDropVariant({
            line: lineAfter,
            level: level + 1,
            left: 0,
            top: 0,
            placeToMove,
            whereToMove: "inside",
          });
        } else {
          visit(placeToMove.getChildren());
        }
      }
    };

    visit(this.root.getChildren());
  }

  private calculateLeftPadding() {
    const dom = this.view.dom.querySelector("div.cm-scroller");
    this.leftPadding =
      dom.getBoundingClientRect().left +
      Number.parseFloat(
        document.defaultView
          .getComputedStyle(dom, "")
          .getPropertyValue("padding-left"),
      );
  }

  private calculateTabWidth() {
    const { view } = this;

    this.tabWidth = (<HTMLElement>(
      view.dom.querySelector(".cm-indent")
    )).offsetWidth;
  }
}

const dndStarted = StateEffect.define<number[]>({
  map: (lines, change) => lines.map((l) => change.mapPos(l)),
});

const dndMoved = StateEffect.define<number | null>({
  map: (line, change) => (line !== null ? change.mapPos(line) : line),
});

const dndEnded = StateEffect.define<void>();

const draggingLineDecoration = Decoration.line({
  class: "outliner-plugin-dragging-line",
});

const droppingLineDecoration = Decoration.line({
  class: "outliner-plugin-dropping-line",
});

const draggingLinesStateField = StateField.define<DecorationSet>({
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

const droppingLinesStateField = StateField.define<DecorationSet>({
  create: () => Decoration.none,

  update: (dndDroppingState, tr) => {
    dndDroppingState = dndDroppingState.map(tr.changes);

    for (const e of tr.effects) {
      if (e.is(dndMoved)) {
        dndDroppingState =
          e.value === null
            ? Decoration.none
            : Decoration.set(droppingLineDecoration.range(e.value, e.value));
      }

      if (e.is(dndEnded)) {
        dndDroppingState = Decoration.none;
      }
    }

    return dndDroppingState;
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
      el.classList.contains("cm-fold-indicator") ||
      el.classList.contains("task-list-item-checkbox")
    ) {
      return true;
    }

    el = el.parentElement;
  }

  return false;
}

function isSameRoots(a: Root, b: Root) {
  const [aStart, aEnd] = a.getContentRange();
  const [bStart, bEnd] = b.getContentRange();

  if (cmpPos(aStart, bStart) !== 0 || cmpPos(aEnd, bEnd) !== 0) {
    return false;
  }

  return a.print() === b.print();
}

function isFeatureSupported() {
  return Platform.isDesktop;
}
