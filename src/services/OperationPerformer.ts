import { ChangesApplicator } from "./ChangesApplicator";
import { Parser } from "./Parser";

import { MyEditor } from "../editor";
import { Operation } from "../operations/Operation";
import { Root } from "../root";

export class OperationPerformer {
  constructor(
    private parser: Parser,
    private changesApplicator: ChangesApplicator,
  ) {}

  eval(root: Root, op: Operation, editor: MyEditor) {
    const prevRoot = root.clone();

    op.perform();

    if (op.shouldUpdate()) {
      this.changesApplicator.apply(editor, prevRoot, root);
    }

    return {
      shouldUpdate: op.shouldUpdate(),
      shouldStopPropagation: op.shouldStopPropagation(),
    };
  }

  perform(
    cb: (root: Root) => Operation,
    editor: MyEditor,
    cursor = editor.getCursor(),
  ) {
    const root = this.parser.parse(editor, cursor);

    if (!root) {
      return { shouldUpdate: false, shouldStopPropagation: false };
    }

    const op = cb(root);

    return this.eval(root, op, editor);
  }
}
