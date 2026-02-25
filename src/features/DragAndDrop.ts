import { Notice, Platform, Plugin } from "obsidian";

import { getIndentUnit, indentString } from "@codemirror/language";
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
  private contextsByDocument = new Map<Document, DragAndDropDocumentContext>();
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
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("window-open", (workspaceWindow, window) => {
        this.registerDocument(workspaceWindow.doc || window.document);
      }),
    );
    this.plugin.registerEvent(
      this.plugin.app.workspace.on(
        "window-close",
        (workspaceWindow, window) => {
          this.unregisterDocument(workspaceWindow.doc || window.document);
        },
      ),
    );
    this.registerExistingDocuments();
    this.enableFeatureToggle();
  }

  async unload() {
    for (const doc of Array.from(this.contextsByDocument.keys())) {
      this.unregisterDocument(doc);
    }
    this.disableFeatureToggle();
  }

  private enableFeatureToggle() {
    this.settings.onChange(this.handleSettingsChange);
    this.handleSettingsChange();
  }

  private disableFeatureToggle() {
    this.settings.removeCallback(this.handleSettingsChange);
    for (const context of this.contextsByDocument.values()) {
      context.document.body.classList.remove(BODY_CLASS);
      context.document.body.classList.remove("outliner-plugin-dragging");
    }
  }

  private registerExistingDocuments() {
    const docs = new Set<Document>();
    docs.add(this.plugin.app.workspace.containerEl.ownerDocument);
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      docs.add(leaf.getContainer().doc);
    });

    for (const doc of docs) {
      this.registerDocument(doc);
    }
  }

  private registerDocument(doc: Document | null | undefined) {
    if (!doc || this.contextsByDocument.has(doc) || !doc.body) {
      return;
    }

    const dropZonePadding = doc.createElement("div");
    dropZonePadding.classList.add("outliner-plugin-drop-zone-padding");
    const dropZone = doc.createElement("div");
    dropZone.classList.add("outliner-plugin-drop-zone");
    dropZone.style.display = "none";
    dropZone.appendChild(dropZonePadding);
    doc.body.appendChild(dropZone);

    const context: DragAndDropDocumentContext = {
      document: doc,
      dropZone,
      dropZonePadding,
    };
    this.contextsByDocument.set(doc, context);
    this.updateBodyClass(context);

    doc.addEventListener("mousedown", this.handleMouseDown, {
      capture: true,
    });
    doc.addEventListener("mousemove", this.handleMouseMove);
    doc.addEventListener("mouseup", this.handleMouseUp);
    doc.addEventListener("keydown", this.handleKeyDown);
  }

  private unregisterDocument(doc: Document | null | undefined) {
    if (!doc) {
      return;
    }

    const context = this.contextsByDocument.get(doc);
    if (!context) {
      return;
    }

    if (this.preStart?.document === doc) {
      this.preStart = null;
    }
    if (this.state?.context.document === doc) {
      this.cancelDragging();
    }

    doc.removeEventListener("mousedown", this.handleMouseDown, {
      capture: true,
    });
    doc.removeEventListener("mousemove", this.handleMouseMove);
    doc.removeEventListener("mouseup", this.handleMouseUp);
    doc.removeEventListener("keydown", this.handleKeyDown);

    doc.body.classList.remove(BODY_CLASS);
    doc.body.classList.remove("outliner-plugin-dragging");
    if (context.dropZone.parentElement) {
      context.dropZone.parentElement.removeChild(context.dropZone);
    }

    this.contextsByDocument.delete(doc);
  }

  private getContextByView(view: EditorView) {
    return this.contextsByDocument.get(view.dom.ownerDocument);
  }

  private updateBodyClass(context: DragAndDropDocumentContext) {
    if (!isFeatureSupported()) {
      context.document.body.classList.remove(BODY_CLASS);
      return;
    }

    if (this.settings.dragAndDrop) {
      context.document.body.classList.add(BODY_CLASS);
    } else {
      context.document.body.classList.remove(BODY_CLASS);
    }
  }

  private handleSettingsChange = () => {
    for (const context of this.contextsByDocument.values()) {
      this.updateBodyClass(context);
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

    const context = this.getContextByView(view);
    if (!context) {
      return;
    }

    this.preStart = {
      x: e.clientX,
      y: e.clientY,
      view,
      document: context.document,
    };
  };

  private handleMouseMove = (e: MouseEvent) => {
    const eventDocument = getEventDocument(e);

    if (this.preStart && eventDocument === this.preStart.document) {
      this.startDragging();
    }
    if (this.state && eventDocument === this.state.context.document) {
      this.detectAndDrawDropZone(e.clientX, e.clientY);
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    const eventDocument = getEventDocument(e);

    if (this.preStart && eventDocument === this.preStart.document) {
      this.preStart = null;
    }
    if (this.state && eventDocument === this.state.context.document) {
      this.stopDragging();
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (
      this.state &&
      e.code === "Escape" &&
      getEventDocument(e) === this.state.context.document
    ) {
      this.cancelDragging();
    }
  };

  private startDragging() {
    const { x, y, view } = this.preStart;
    this.preStart = null;

    const editor = getEditorFromState(view.state);
    if (!editor) {
      return;
    }

    const dropContext = this.getContextByView(view);
    if (!dropContext) {
      return;
    }

    const posOffset = view.posAtCoords({ x, y });
    if (posOffset === null) {
      return;
    }
    const pos = editor.offsetToPos(posOffset);
    const root = this.parser.parse(editor, pos);
    const list = root.getListUnderLine(pos.line);
    if (!list) {
      return;
    }
    const state = new DragAndDropState(dropContext, view, editor, root, list);

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

    state.context.document.body.classList.add("outliner-plugin-dragging");
  }

  private unhightlightDraggingLines() {
    this.state.context.document.body.classList.remove(
      "outliner-plugin-dragging",
    );

    this.state.view.dispatch({
      effects: [dndEnded.of()],
    });
  }

  private drawDropZone() {
    const { state } = this;
    const { view, editor, dropVariant } = state;
    const { dropZone, dropZonePadding, document } = state.context;

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

      dropZone.style.display = "block";
      dropZone.style.top = dropVariant.top + "px";
      dropZone.style.left = dropVariant.left + "px";
      dropZone.style.width = width + "px";
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

      dropZonePadding.style.width = `${width}px`;
      dropZonePadding.style.marginLeft = `-${width}px`;
      dropZonePadding.style.backgroundImage = `url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20${width}%204%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%22${width}%22%20y2%3D%220%22%20stroke%3D%22${color}%22%20stroke-width%3D%228%22%20stroke-dasharray%3D%22${dashWidth}%20${dashPadding}%22%2F%3E%3C%2Fsvg%3E')`;
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
    this.state.context.dropZone.style.display = "none";
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
  document: Document;
}

interface DragAndDropDocumentContext {
  document: Document;
  dropZone: HTMLDivElement;
  dropZonePadding: HTMLDivElement;
}

class DragAndDropState {
  private dropVariants: Map<string, DropVariant> = new Map();
  public dropVariant: DropVariant = null;
  public leftPadding = 0;
  public tabWidth = 0;

  constructor(
    public readonly context: DragAndDropDocumentContext,
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
    const possibleDropVariants = [];

    for (const v of dropVariants) {
      const { placeToMove } = v;

      const positionAfterList =
        v.whereToMove === "after" || v.whereToMove === "inside";
      const line = positionAfterList
        ? placeToMove.getContentEndIncludingChildren().line
        : placeToMove.getFirstLineContentStart().line;
      const linePos = editor.posToOffset({
        line,
        ch: 0,
      });

      const coords = view.coordsAtPos(linePos, -1);

      if (!coords) {
        continue;
      }

      v.left = this.leftPadding + (v.level - 1) * this.tabWidth;
      v.top = coords.top;

      if (positionAfterList) {
        v.top += view.lineBlockAt(linePos).height;
      }

      // Better vertical alignment
      v.top -= 8;

      possibleDropVariants.push(v);
    }

    const nearestLineTop = possibleDropVariants
      .sort((a, b) => Math.abs(y - a.top) - Math.abs(y - b.top))
      .first().top;

    const variansOnNearestLine = possibleDropVariants.filter(
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
    const cmLine = this.view.dom.querySelector("div.cm-line");
    this.leftPadding = cmLine.getBoundingClientRect().left;
  }

  private calculateTabWidth() {
    const { view } = this;

    const indentDom = view.dom.querySelector(".cm-indent");
    if (indentDom) {
      this.tabWidth = (indentDom as HTMLElement).offsetWidth;
      return;
    }

    const singleIndent = indentString(view.state, getIndentUnit(view.state));

    for (let i = 1; i <= view.state.doc.lines; i++) {
      const line = view.state.doc.line(i);

      if (line.text.startsWith(singleIndent)) {
        const a = view.coordsAtPos(line.from, -1);
        if (!a) {
          continue;
        }

        const b = view.coordsAtPos(line.from + singleIndent.length, -1);
        if (!b) {
          continue;
        }

        this.tabWidth = b.left - a.left;
        return;
      }
    }

    this.tabWidth = view.defaultCharacterWidth * getIndentUnit(view.state);
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

function getEventDocument(e: Event) {
  const target = e.target;
  if (!target || typeof target !== "object") {
    return null;
  }

  const maybeNode = target as {
    nodeType?: number;
    ownerDocument?: Document | null;
  };
  if (maybeNode.nodeType === 9) {
    return target as Document;
  }
  if ("ownerDocument" in maybeNode) {
    return maybeNode.ownerDocument || null;
  }
  return null;
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
