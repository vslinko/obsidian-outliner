import { MyEditor } from "../MyEditor";
import { List, Root, cmpPos } from "../root";

function getAllChildrenReduceFn(acc: Map<number, List>, child: List) {
  acc.set(child.getID(), child);
  child.getChildren().reduce(getAllChildrenReduceFn, acc);
  return acc;
}

function getAllChildren(root: Root): Map<number, List> {
  return root.getChildren().reduce(getAllChildrenReduceFn, new Map());
}

function areSelectionsSame(a: Root, b: Root) {
  const aSelections = a.getSelections();
  const bSelections = b.getSelections();

  if (aSelections.length !== bSelections.length) {
    return false;
  }

  for (let i = 0; i < aSelections.length; i++) {
    const aSelection = aSelections[i];
    const bSelection = bSelections[i];

    if (
      cmpPos(aSelection.anchor, bSelection.anchor) !== 0 ||
      cmpPos(aSelection.head, bSelection.head) !== 0
    ) {
      return false;
    }
  }

  return true;
}

export class ApplyChangesService {
  applyChanges(editor: MyEditor, prevRoot: Root, newRoot: Root) {
    const prevLists = getAllChildren(prevRoot);
    const newLists = getAllChildren(newRoot);
    const operations: any = [];

    for (const newList of newLists.values()) {
      const prevList = prevLists.get(newList.getID());

      if (prevList) {
        if (newList.getID() === 7) {
          console.log(
            prevList.getParent().getID(),
            newList.getParent().getID()
          );
        }
        if (
          prevList.getParent().getID() !== newList.getParent().getID() ||
          prevList.getParent().getChildren().indexOf(prevList) !==
            newList.getParent().getChildren().indexOf(newList)
        ) {
          operations.push([
            "move",
            prevList.getParent().getID(),
            newList.getParent().getID(),
          ]);
        }

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

    if (!areSelectionsSame(prevRoot, newRoot)) {
      operations.push(["updateSelections"]);
    }

    console.log(prevRoot.print());
    console.log(newRoot.print());
    console.log(operations);
  }

  private applyChangesOld(editor: MyEditor, root: Root) {
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

    function recursive(list: List) {
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
