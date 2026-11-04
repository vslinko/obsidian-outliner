declare namespace jest {
  interface Matchers<R> {
    toEqualEditorState(s: string): Promise<R>;
    toEqualEditorState(s: string[]): Promise<R>;
  }
}

interface StatePosition {
  line: number;
  ch: number;
}

interface StateSelection {
  anchor: StatePosition;
  head: StatePosition;
}

interface State {
  folds: number[];
  selections: StateSelection[];
  value: string;
}

declare function applyState(state: string): Promise<void>;
declare function applyState(state: string[]): Promise<void>;
declare function parseState(state: string): Promise<State>;
declare function parseState(state: string[]): Promise<State>;
declare function simulateKeydown(keys: string): Promise<void>;
declare function insertText(text: string): Promise<void>;
declare function executeCommandById(keys: string): Promise<void>;
declare function setSetting(opts: { k: string; v: any }): Promise<void>;
declare function resetSettings(): Promise<void>;
declare function getCurrentState(): Promise<State>;
declare function drag(opts: {
  from: { line: number; ch: number };
}): Promise<void>;
declare function move(opts: {
  to: { line: number; ch: number };
  offsetX: number;
  offsetY: number;
  buttons?: number;
}): Promise<void>;
declare function drop(): Promise<void>;
declare function openPopoutEditor(): Promise<boolean>;
declare function closePopoutEditor(): Promise<void>;
declare function selectTestEditor(opts: {
  window: "main" | "popout";
  focus?: boolean;
}): Promise<void>;
declare function simulateWindowBlur(): Promise<void>;

interface DragAndDropDocumentSnapshot {
  window: "main" | "popout";
  registered: boolean;
  enabled: boolean;
  dragging: boolean;
  dropZones: number;
  visibleDropZones: number;
  draggingLines: number;
  droppingLines: number;
}

interface DragAndDropSnapshot {
  active: boolean;
  pending: boolean;
  destinationSelected: boolean;
  source: "main" | "popout" | null;
  contextCount: number;
  distinctDocuments: boolean;
  documents: DragAndDropDocumentSnapshot[];
}

declare function getDragAndDropSnapshot(): Promise<DragAndDropSnapshot>;

interface TestHandleCommand {
  action: "install" | "snapshot" | "clear" | "programmaticClick" | "focus";
  kind?: "widget" | "checkbox";
  line?: number;
  attribute?: boolean;
}

interface TestHandleEvent {
  type: string;
  trusted: boolean;
  detail: number;
  button: number;
}

interface NativePoint {
  x: number;
  y: number;
}

interface TestHandleSnapshot {
  clicks: number;
  events: TestHandleEvent[];
  handle: NativePoint | null;
  nested: NativePoint | null;
  top: NativePoint;
  nativeBulletAncestor: boolean;
  checked: boolean | null;
  focused: boolean;
  activeElement: string;
  hitHandle: string | null;
  value: string;
  trace: string[];
}

declare function testHandle(
  opts: TestHandleCommand,
): Promise<TestHandleSnapshot>;
declare function nativeInput(opts: {
  action: "down" | "move" | "up" | "escape" | "enter" | "reset";
  window?: "main" | "popout";
  x?: number;
  y?: number;
}): Promise<void>;

declare function openDropInvalidationEditor(): Promise<boolean>;
declare function replaceFromDropInvalidationEditor(value: string): Promise<{
  value: string;
  rootStart: StatePosition;
  parsed: boolean;
}>;
declare function getDropInvalidationObservations(): Promise<{
  errors: string[];
  notices: string[];
}>;
declare function closeDropInvalidationEditor(): Promise<void>;
