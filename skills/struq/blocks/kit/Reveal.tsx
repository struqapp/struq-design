"use client";
// components/struq/Reveal.tsx (Struq recipe)
// Staggered rise for a group of text blocks: every direct child rises from a fade as the group scrolls into view, on
// the site's temperament (./feel): travel.block px, duration.enter, the enter ease, stagger.block. Opacity AND
// transform, never opacity alone, fired once. Reduced motion: the children at rest, at once.
//
// <Reveal className="grid gap-6">
//   <h2 className="text-h2">...</h2>
//   <p className="text-lead">...</p>
// </Reveal>
//
// Before hydration the children are hidden only when JavaScript runs (the `js` class from the
// layout), and a CSS failsafe shows them after 3s if hydration never comes (globals.css).
import { useRef } from "react";
import { feel, LOCKED, prefersReduced } from "./feel";
import { gsap, useGSAP } from "./gsap";
import { staggerIn, travelIn } from "./tempo";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "ul" | "ol";
  /** Distance each child rises, in px as measured in the weighted feel (24 to 80); the feel's travel.block when unset. */
  y?: number;
  /** Seconds between children as measured in the weighted feel; the feel's stagger.block when unset. */
  stagger?: number;
  delay?: number;
  /** "scroll" waits for the viewport; "load" plays on mount (for the hero). */
  on?: "scroll" | "load";
};

export function Reveal({ children, className = "", as = "div", y, stagger, delay = 0, on = "scroll" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      el.dataset.ready = "1";
      if (prefersReduced()) return;
      const f = feel(el);
      // fromTo, so the pre-paint gate's opacity is never read as the end state.
      gsap.fromTo(
        Array.from(el.children),
        { y: y === undefined ? f.travel.block : travelIn(f, y), autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: f.duration.enter,
          ease: f.ease.enter,
          stagger: stagger === undefined ? f.stagger.block : staggerIn(f, stagger, "block"),
          delay,
          scrollTrigger: on === "scroll" ? { trigger: el, start: LOCKED.trigger.start, once: LOCKED.trigger.once } : undefined,
        },
      );
    },
    { scope: ref, dependencies: [y, stagger, delay, on] },
  );

  const Tag = as as "div";
  return (
    <Tag ref={ref} data-reveal="" className={className}>
      {children}
    </Tag>
  );
}
