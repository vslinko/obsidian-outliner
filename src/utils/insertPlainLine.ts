import { MyEditor } from "src/editor";

type PlainLineEditor = Pick<
  MyEditor,
  "getCursor" | "getLine" | "replaceRange" | "setSelections"
>;

export function insertPlainLine(editor: PlainLineEditor, after: boolean) {
  const cursor = editor.getCursor();

  if (after) {
    const lineEnd = {
      line: cursor.line,
      ch: editor.getLine(cursor.line).length,
    };
    const nextLineStart = { line: cursor.line + 1, ch: 0 };

    editor.replaceRange("\n", lineEnd, lineEnd);
    editor.setSelections([
      {
        anchor: nextLineStart,
        head: nextLineStart,
      },
    ]);

    return;
  }

  const lineStart = { line: cursor.line, ch: 0 };

  editor.replaceRange("\n", lineStart, lineStart);
  editor.setSelections([
    {
      anchor: lineStart,
      head: lineStart,
    },
  ]);
}
