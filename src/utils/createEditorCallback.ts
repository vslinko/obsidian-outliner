import { Editor } from "obsidian";

import { MyEditor } from "../editor";

export function createEditorCallback(cb: (editor: MyEditor) => boolean) {
  return (editor: Editor) => {
    const myEditor = new MyEditor(editor);
    const shouldStopPropagation = cb(myEditor);

    if (
      !shouldStopPropagation &&
      window.event &&
      window.event.type === "keydown"
    ) {
      myEditor.triggerOnKeyDown(window.event as KeyboardEvent);
    }
  };
}
