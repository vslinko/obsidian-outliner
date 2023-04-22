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
  getID(): number;
  isFoldRoot(): boolean;
  getChildren(): ApplyChangesList[];
  getFirstLineContentStart(): { line: number };
  compareContent(list: ApplyChangesList): boolean;
  getParent(): ApplyChangesList;
  getPrevSiblingOf(list: ApplyChangesList): ApplyChangesList | null;
}

export interface ApplyChangesRoot {
  getRange(): [ApplyChangesEditorPosition, ApplyChangesEditorPosition];
  getSelections(): {
    anchor: ApplyChangesEditorPosition;
    head: ApplyChangesEditorPosition;
  }[];
  print(): string;
  getChildren(): ApplyChangesList[];
}

function getAllChildrenReduceFn(
  acc: Map<number, ApplyChangesList>,
  child: ApplyChangesList
) {
  acc.set(child.getID(), child);
  child.getChildren().reduce(getAllChildrenReduceFn, acc);
  return acc;
}

function getAllChildren(root: ApplyChangesRoot): Map<number, ApplyChangesList> {
  return root.getChildren().reduce(getAllChildrenReduceFn, new Map());
}

export class ApplyChangesService {
  applyChanges(
    editor: ApplyChangesEditor,
    prevRoot: ApplyChangesRoot,
    newRoot: ApplyChangesRoot
  ) {
    const prevLists = getAllChildren(prevRoot);
    const newLists = getAllChildren(newRoot);
    const operations: any = [];

    for (const newList of newLists.values()) {
      const prevList = prevLists.get(newList.getID());

      if (prevList) {
        if (!prevList.compareContent(newList)) {
          operations.push(["update", prevList.getID()]);
        }
        prevLists.delete(prevList.getID());
      } else {
        operations.push([
          "insertAfter",
          newList.getParent().getPrevSiblingOf(newList).getID(),
          newList.getID(),
        ]);
      }
    }

    for (const prevList of prevLists.values()) {
      operations.push(["delete", prevList.getID()]);
    }

    console.log(prevRoot.print());
    console.log(newRoot.print());
    console.log(operations);
  }

  private applyChangesOld(editor: ApplyChangesEditor, root: ApplyChangesRoot) {
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

    if (oldTmp !== newTmp) {
      editor.replaceRange(newTmp, changeFrom, changeTo);
    }

    editor.setSelections(root.getSelections());

    function recursive(list: ApplyChangesList) {
      for (const c of list.getChildren()) {
        recursive(c);
      }
      if (list.isFoldRoot()) {
        editor.fold(list.getFirstLineContentStart().line);
      }
    }
    for (const c of root.getChildren()) {
      recursive(c);
    }
  }
}
