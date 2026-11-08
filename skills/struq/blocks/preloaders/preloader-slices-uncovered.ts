// preloader-slices-uncovered (Struq helper, ships with preloader-slices and page-transition-slices)
// The one handover signal of the slice language. While a cover is closed, <html> carries data-curtain="closed"; the
// moment the slices start to leave, the attribute goes and "curtain:lift" fires on window. A hero runs its entrance
// through whenUncovered, so the same entrance serves the first load and every navigation.
//
//   useGSAP((_, contextSafe) => whenUncovered(contextSafe!(() => { ...the entrance... })), { scope })

export const CURTAIN_LIFT = "curtain:lift";

/** True while a slice cover is closed over the page. */
export function covered(): boolean {
  return document.documentElement.dataset.curtain === "closed";
}

/** Marks the cover closed: whenUncovered now waits. */
export function closeCurtain(): void {
  document.documentElement.dataset.curtain = "closed";
}

/** The slices start to leave: whatever waits in whenUncovered runs now. */
export function liftCurtain(): void {
  delete document.documentElement.dataset.curtain;
  window.dispatchEvent(new Event(CURTAIN_LIFT));
}

/**
 * Runs `play` once nothing covers the page: at once when nothing does, or the moment the slices start to leave.
 * The ceiling keeps a cover that never reports from leaving the page without its entrance. Returns the cancel.
 */
export function whenUncovered(play: () => void, ceilingMs = 4000): () => void {
  if (!covered()) {
    play();
    return () => {};
  }
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    window.removeEventListener(CURTAIN_LIFT, fire);
    window.clearTimeout(ceiling);
    play();
  };
  window.addEventListener(CURTAIN_LIFT, fire);
  const ceiling = window.setTimeout(fire, ceilingMs);
  return () => {
    fired = true;
    window.removeEventListener(CURTAIN_LIFT, fire);
    window.clearTimeout(ceiling);
  };
}
