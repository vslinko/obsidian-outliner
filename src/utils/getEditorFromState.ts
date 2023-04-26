import { editorInfoField } from "obsidian";

import { EditorState } from "@codemirror/state";

import { MyEditor } from "../MyEditor";

export function getEditorFromState(state: EditorState) {
  const { editor } = state.field(editorInfoField);

  if (!editor) {
    return null;
  }

  return new MyEditor(editor);
}
