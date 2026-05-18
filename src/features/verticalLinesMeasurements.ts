export function getVerticalLinesContentLeft(view: {
  contentDOM: {
    parentElement: Pick<HTMLElement, "offsetLeft"> | null;
  };
  dom: Pick<HTMLElement, "querySelector">;
  scrollDOM: Pick<HTMLElement, "getBoundingClientRect" | "scrollLeft">;
}) {
  const cmLine = view.dom.querySelector("div.cm-line");
  if (isElementLike(cmLine)) {
    return (
      cmLine.getBoundingClientRect().left -
      view.scrollDOM.getBoundingClientRect().left +
      view.scrollDOM.scrollLeft
    );
  }

  return view.contentDOM.parentElement?.offsetLeft ?? 0;
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
