export function getDragAndDropLeftPadding(view: {
  dom: Pick<HTMLElement, "querySelector">;
}) {
  const cmLine = view.dom.querySelector("div.cm-line");
  if (isElementLike(cmLine)) {
    return cmLine.getBoundingClientRect().left;
  }

  const scroller = view.dom.querySelector("div.cm-scroller");
  if (isElementLike(scroller)) {
    return (
      scroller.getBoundingClientRect().left +
      Number.parseFloat(getComputedStyleFor(scroller).paddingLeft || "0")
    );
  }

  return 0;
}

function isElementLike(
  value: unknown,
): value is Pick<HTMLElement, "getBoundingClientRect"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "getBoundingClientRect" in value &&
    typeof value.getBoundingClientRect === "function"
  );
}

function getComputedStyleFor(
  element: Element,
): Pick<CSSStyleDeclaration, "paddingLeft"> {
  if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
    return window.getComputedStyle(element);
  }

  return { paddingLeft: "0" };
}
