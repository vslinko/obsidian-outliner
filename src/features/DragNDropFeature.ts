import { Plugin_2, editorInfoField } from "obsidian";

import { EditorView } from "@codemirror/view";

import { MyEditor } from "src/MyEditor";
import { MoveListToDifferentPositionOperation } from "src/operations/MoveListToDifferentPositionOperation";
import { List, Root } from "src/root";
import { ParserService } from "src/services/ParserService";
import { PerformOperationService } from "src/services/PerformOperationService";

import { Feature } from "../features/Feature";

function isClickOnBullet(e: MouseEvent) {
  let el = e.target as HTMLElement;

  while (el) {
    if (el.classList.contains("cm-formatting-list")) {
      return true;
    }

    el = el.parentElement;
  }

  return false;
}

export class DragNDropFeature implements Feature {
  private dragging = false;
  private activeView: EditorView;
  private editor: MyEditor;
  private root: Root;
  private list: List;
  private content: HTMLPreElement;
  private box: HTMLDivElement;
  private dropZone: HTMLDivElement;
  private nearest: List;
  private before: boolean;

  constructor(
    private plugin: Plugin_2,
    private parser: ParserService,
    private performOperation: PerformOperationService
  ) {
    this.content = document.createElement("pre");
    this.content.style.fontFamily = "sans-serif";
    this.content.style.fontStyle = "italic";

    this.box = document.createElement("div");
    this.box.style.width = "300px";
    this.box.style.maxHeight = "100px";
    this.box.style.background = "red";
    this.box.style.zIndex = "1000";
    this.box.style.position = "absolute";
    this.box.style.display = "none";
    this.box.style.pointerEvents = "none";
    this.box.style.margin = "16px 0 0 16px";
    this.box.style.padding = "4px";
    this.box.style.overflow = "hidden";
    this.box.appendChild(this.content);
    document.body.appendChild(this.box);

    this.dropZone = document.createElement("div");
    this.dropZone.style.width = "300px";
    this.dropZone.style.height = "4px";
    this.dropZone.style.background = "green";
    this.dropZone.style.zIndex = "999";
    this.dropZone.style.position = "absolute";
    this.dropZone.style.display = "none";
    this.dropZone.style.pointerEvents = "none";
    document.body.appendChild(this.dropZone);
  }

  async load() {
    document.addEventListener("mouseup", () => {
      if (this.dragging) {
        this.activeView = null;
        this.dragging = false;
        this.box.style.display = "none";
        this.dropZone.style.display = "none";

        if (this.nearest) {
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
    });

    document.addEventListener("mousemove", (e) => {
      if (this.dragging) {
        this.box.style.top = e.y + "px";
        this.box.style.left = e.x + "px";

        const startH = this.activeView.coordsAtPos(
          this.editor.posToOffset(this.root.getRange()[0])
        ).top;
        const endH = this.activeView.coordsAtPos(
          this.editor.posToOffset(this.root.getRange()[1])
        ).top;

        let nearest: List | null = null;
        let before = true;
        if (e.y > endH) {
          before = false;
          nearest = this.root.getListUnderLine(this.root.getRange()[1].line);
        } else if (e.y < startH) {
          nearest = this.root.getListUnderLine(this.root.getRange()[0].line);
        } else {
          const pos = this.editor.offsetToPos(
            this.activeView.posAtCoords({ x: e.x, y: e.y })
          );
          nearest = this.root.getListUnderLine(pos.line);
        }

        this.nearest = nearest;
        this.before = before;

        if (!nearest) {
          this.dropZone.style.display = "none";
          return;
        }

        const offset = before
          ? this.editor.posToOffset(nearest.getFirstLineContentStart())
          : this.editor.posToOffset(nearest.getLastLineContentEnd()) + 1;
        const start = this.activeView.coordsAtPos(offset);

        this.dropZone.style.display = "block";
        this.dropZone.style.top = start.top + "px";
        this.dropZone.style.left = start.left + "px";
      }
    });

    this.plugin.registerEditorExtension(
      EditorView.domEventHandlers({
        mousedown: (e, view) => {
          if (!isClickOnBullet(e)) {
            return;
          }
          const coords = { x: e.x, y: e.y };
          const editor = new MyEditor(view.state.field(editorInfoField).editor);
          const pos = editor.offsetToPos(view.posAtCoords(coords));
          const root = this.parser.parse(editor, pos);
          const list = root.getListUnderLine(pos.line);
          this.box.style.display = "block";
          this.box.style.top = e.y + "px";
          this.box.style.left = e.x + "px";
          this.dragging = true;
          this.activeView = view;
          this.root = root;
          this.editor = editor;
          this.list = list;
          this.content.innerText = list.print();
          e.preventDefault();
          e.stopPropagation();
        },
      })
    );
  }

  async unload() {}
}
