import { Plugin } from "obsidian";

import {
  makeEditor,
  makeLogger,
  makeRoot,
  makeSettings,
} from "../../__mocks__";
import { OperationPerformer } from "../../services/OperationPerformer";
import { Parser } from "../../services/Parser";
import { EnterBehaviourOverride } from "../EnterBehaviourOverride";

jest.mock(
  "obsidian",
  () => ({
    Editor: class {},
    Plugin: class {},
    editorInfoField: {},
  }),
  { virtual: true },
);

describe("EnterBehaviourOverride", () => {
  test("should let Obsidian handle ordered lists when smart lists are disabled", () => {
    const editor = makeEditor({
      text: "9. item\n",
      cursor: { line: 0, ch: 7 },
    }) as ReturnType<typeof makeEditor> & {
      getZoomRange: () => null;
    };
    editor.getZoomRange = () => null;
    const logger = makeLogger();
    const settings = makeSettings();
    const parser = new Parser(logger, settings);
    const root = makeRoot({ editor, logger, settings });
    const changesApplicator = {
      apply: jest.fn(),
    };
    const operationPerformer = new OperationPerformer(
      parser,
      changesApplicator as unknown as ConstructorParameters<
        typeof OperationPerformer
      >[1],
    );
    const feature = new EnterBehaviourOverride(
      { registerEditorExtension: jest.fn() } as unknown as Plugin,
      { overrideEnterBehaviour: true } as ConstructorParameters<
        typeof EnterBehaviourOverride
      >[1],
      { isOpened: () => false } as ConstructorParameters<
        typeof EnterBehaviourOverride
      >[2],
      {
        getDefaultIndentChars: () => "  ",
        isSmartIndentListEnabled: () => false,
      } as ConstructorParameters<typeof EnterBehaviourOverride>[3],
      {
        parse: jest.fn().mockReturnValue(root),
      } as unknown as ConstructorParameters<typeof EnterBehaviourOverride>[4],
      operationPerformer,
    );

    const result = (
      feature as unknown as {
        run: (currentEditor: typeof editor) => {
          shouldStopPropagation: boolean;
          shouldUpdate: boolean;
        };
      }
    ).run(editor);

    expect(result).toEqual({
      shouldStopPropagation: false,
      shouldUpdate: false,
    });
    expect(changesApplicator.apply).not.toHaveBeenCalled();
  });
});
