import { makeEditor, makeRoot } from "../../__mocks__";
import { recalculateNumericBullets } from "../recalculateNumericBullets";

describe("recalculateNumericBullets", () => {
  test("should return list under line", () => {
    const root = makeRoot({
      editor: makeEditor({
        text: "4. one\n\t3. two\n\t2. three\n1. four",
        cursor: { line: 0, ch: 0 },
      }),
    });

    recalculateNumericBullets(root);

    expect(root.print()).toBe("1. one\n\t1. two\n\t2. three\n2. four");
  });
});
