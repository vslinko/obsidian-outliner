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
}): Promise<void>;
declare function drop(): Promise<void>;
