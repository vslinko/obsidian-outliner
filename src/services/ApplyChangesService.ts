export interface ApplyChangesEditorPosition {
  line: number;
  ch: number;
}

export interface ApplyChangesEditorSelection {
  anchor: ApplyChangesEditorPosition;
  head: ApplyChangesEditorPosition;
}

export interface ApplyChangesEditor {
  getRange(
    from: ApplyChangesEditorPosition,
    to: ApplyChangesEditorPosition
  ): string;
  replaceRange(
    replacement: string,
    from: ApplyChangesEditorPosition,
    to: ApplyChangesEditorPosition
  ): void;
  setSelections(selections: ApplyChangesEditorSelection[]): void;
  fold(n: number): void;
  unfold(n: number): void;
}

export interface ApplyChangesList {
  isFoldRoot(): boolean;
}

export interface ApplyChangesRoot {
  getRange(): [ApplyChangesEditorPosition, ApplyChangesEditorPosition];
  getSelections(): {
    anchor: ApplyChangesEditorPosition;
    head: ApplyChangesEditorPosition;
  }[];
  print(): string;
  getListUnderLine(l: number): ApplyChangesList;
}

export class ApplyChangesService {
  applyChanges(editor: ApplyChangesEditor, root: ApplyChangesRoot) {
    const rootRange = root.getRange();
    const oldString = editor.getRange(rootRange[0], rootRange[1]);
    const newString = root.print();

    const fromLine = rootRange[0].line;
    const toLine = rootRange[1].line;

    for (let l = fromLine; l <= toLine; l++) {
      editor.unfold(l);
    }

    const changeFrom = { ...rootRange[0] };
    const changeTo = { ...rootRange[1] };
    let oldTmp = oldString;
    let newTmp = newString;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const nlIndex = oldTmp.indexOf("\n");
      if (nlIndex < 0) {
        break;
      }
      const oldLine = oldTmp.slice(0, nlIndex + 1);
      const newLine = newTmp.slice(0, oldLine.length);
      if (oldLine !== newLine) {
        break;
      }
      changeFrom.line++;
      oldTmp = oldTmp.slice(oldLine.length);
      newTmp = newTmp.slice(oldLine.length);
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const nlIndex = oldTmp.lastIndexOf("\n");
      if (nlIndex < 0) {
        break;
      }
      const oldLine = oldTmp.slice(nlIndex);
      const newLine = newTmp.slice(-oldLine.length);
      if (oldLine !== newLine) {
        break;
      }
      oldTmp = oldTmp.slice(0, -oldLine.length);
      newTmp = newTmp.slice(0, -oldLine.length);

      const nlIndex2 = oldTmp.lastIndexOf("\n");
      changeTo.ch =
        nlIndex2 >= 0 ? oldTmp.length - nlIndex2 - 1 : oldTmp.length;
      changeTo.line--;
    }

    if (oldTmp !== newTmp) {
      editor.replaceRange(newTmp, changeFrom, changeTo);
    }

    editor.setSelections(root.getSelections());

    // TODO: lines could be different because of deletetion
    for (let l = fromLine; l <= toLine; l++) {
      const line = root.getListUnderLine(l);
      if (line && line.isFoldRoot()) {
        editor.fold(l);
      }
    }
  }
}
