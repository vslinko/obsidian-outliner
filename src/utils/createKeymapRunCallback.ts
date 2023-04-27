import { EditorView } from "@codemirror/view";

import { MyEditor, getEditorFromState } from "../editor";

export function createKeymapRunCallback(config: {
  check?: (editor: MyEditor) => boolean;
  run: (editor: MyEditor) => {
    shouldUpdate: boolean;
    shouldStopPropagation: boolean;
  };
}) {
  const check = config.check || (() => true);
  const { run } = config;

  return (view: EditorView): boolean => {
    const editor = getEditorFromState(view.state);

    if (!check(editor)) {
      return false;
    }

    const { shouldUpdate, shouldStopPropagation } = run(editor);

    return shouldUpdate || shouldStopPropagation;
  };
}
