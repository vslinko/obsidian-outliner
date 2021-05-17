export class EditorUtils {
  containsSingleCursor(editor: CodeMirror.Editor) {
    const selections = editor.listSelections();

    return selections.length === 1 && this.rangeIsCursor(selections[0]);
  }

  private rangeIsCursor(selection: CodeMirror.Range) {
    return (
      selection.anchor.line === selection.head.line &&
      selection.anchor.ch === selection.head.ch
    );
  }
}
