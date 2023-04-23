import { ApplyChangesService } from "./ApplyChangesService";
import { ParserService } from "./ParserService";

import { MyEditor } from "../MyEditor";
import { Operation } from "../operations/Operation";
import { Root } from "../root";

export class PerformOperationService {
  constructor(
    private parser: ParserService,
    private applyChanges: ApplyChangesService
  ) {}

  evalOperation(root: Root, op: Operation, editor: MyEditor) {
    const prevRoot = root.clone();

    op.perform();

    if (op.shouldUpdate()) {
      this.applyChanges.applyChanges(editor, prevRoot, root);
    }

    return {
      shouldUpdate: op.shouldUpdate(),
      shouldStopPropagation: op.shouldStopPropagation(),
    };
  }

  performOperation(
    cb: (root: Root) => Operation,
    editor: MyEditor,
    cursor = editor.getCursor()
  ) {
    const root = this.parser.parse(editor, cursor);

    if (!root) {
      return { shouldUpdate: false, shouldStopPropagation: false };
    }

    const op = cb(root);

    return this.evalOperation(root, op, editor);
  }
}
