// components/struq/kit/subject/build.ts (Struq recipe)
// The subject pieces' one motion: a build tied to the scroll. A piece sets itself as it scrolls through the reveal
// band (lines set in, a total counts up, an outline draws) and stands finished once its foot is in view; scrolling
// back takes it apart again. Under reduced motion, with `on` false or without scripts nothing moves: the piece is
// rendered finished and stays so. GSAP only through ../gsap.
//
// useScrollBuild(ref, build === "scroll", (root, tl) => {
//   tl.from(root.querySelectorAll("[data-line]"), { autoAlpha: 0, y: 8, stagger: 0.2 });
// });
import type { RefObject } from "react";
import { gsap, useGSAP } from "../gsap";

export type Timeline = ReturnType<typeof gsap.timeline>;

export function useScrollBuild(
  ref: RefObject<HTMLElement | null>,
  on: boolean,
  make: (root: HTMLElement, tl: Timeline) => void,
  deps: unknown[] = [],
  range: { start?: string; end?: string } = {},
) {
  useGSAP(
    () => {
      const root = ref.current;
      if (!root || !on) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // A counting figure's own text comes back when the build is taken down (a resize, reduced motion turned on).
        const counts = Array.from(root.querySelectorAll<HTMLElement>("[data-count]")).map((el) => [el, el.textContent] as const);
        const tl = gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: { trigger: root, start: range.start ?? "top 82%", end: range.end ?? "bottom 78%", scrub: 0.6 },
        });
        make(root, tl);
        return () => {
          for (const [el, text] of counts) el.textContent = text;
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [on, ...deps], revertOnUpdate: true },
  );
}

/**
 * A figure that counts up inside a build: from zero to its `data-count` value, written with `format` on every step.
 * The element is rendered with its final text, so without the build it already reads right.
 */
export function countUp(tl: Timeline, el: HTMLElement | null, format: (value: number) => string, at?: number | string) {
  if (!el) return;
  const target = Number(el.dataset.count ?? "0");
  const state = { v: 0 };
  el.textContent = format(0);
  tl.fromTo(
    state,
    { v: 0 },
    {
      v: target,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = format(state.v);
      },
    },
    at,
  );
}
