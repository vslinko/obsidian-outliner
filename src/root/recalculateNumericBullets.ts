import { List, Root } from ".";

export function recalculateNumericBullets(root: Root) {
  function visit(parent: Root | List) {
    let index = 1;

    for (const child of parent.getChildren()) {
      if (/\d+\./.test(child.getBullet())) {
        child.replateBullet(`${index++}.`);
      }

      visit(child);
    }
  }

  visit(root);
}
