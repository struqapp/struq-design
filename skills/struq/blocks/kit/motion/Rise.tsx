"use client";
// components/struq/kit/motion/Rise.tsx (Struq recipe)
// A block that rises a little and comes up from clear as it enters: a paragraph, a list of rows, a caption, a row of
// doors. Use it for everything that arrives after a heading; RevealText is for the heading itself. Extracted from the
// kit's Reveal and the soft rise the sections share (a short travel in px with the opacity), put on the feel.
//
// <Rise as="ul" each className="grid gap-4">{rows.map((row) => <li key={row.term}>{row.text}</li>)}</Rise>
//
// Props
// - children: what rises.
// - as: "div" (default), "p", "ul", "ol", "figure", "figcaption" or "span".
// - each: the direct children rise one after another, staggered by the feel's stagger.block (default false: the
//   element rises whole).
// - on: "scroll" (default, once at the feel's trigger) or "load" (on mount).
// - delay: seconds before it starts. className: on the element.
//
// riseFrom(feel) and riseTo(feel) return the same start and end state, so a scene that orders its own parts in one
// timeline rises its details exactly as Rise does.
//
// Motion: from feel().travel.block px below and clear, to rest, over duration.enter on the feel's enter ease; with
// each, stagger.block between children. Crisp travels 24px quickly, weighted 48px, slow 72px over a long settle.
// Reduced motion, no scripts or the server render: the block at rest. No layout shift: only transform and opacity.
import { useRef, type ReactNode } from "react";
import { feel, LOCKED, prefersReduced, type Feel } from "../feel";
import { gsap, useGSAP } from "../gsap";

type Props = {
  children: ReactNode;
  as?: "div" | "p" | "ul" | "ol" | "figure" | "figcaption" | "span";
  each?: boolean;
  on?: "scroll" | "load";
  delay?: number;
  className?: string;
};

/** The start of a rise in this feel: a block's travel below, clear. */
export function riseFrom(f: Feel): gsap.TweenVars {
  return { y: f.travel.block, autoAlpha: 0 };
}

/** The end of a rise in this feel: at rest, over duration.enter on the enter ease. */
export function riseTo(f: Feel): gsap.TweenVars {
  return { y: 0, autoAlpha: 1, duration: f.duration.enter, ease: f.ease.enter };
}

export function Rise({ children, as = "div", each = false, on = "scroll", delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReduced()) {
        el.dataset.ready = "1";
        return;
      }
      const f = feel(el);
      const targets = each ? Array.from(el.children) : [el];
      // fromTo, so the pre-paint gate's opacity is never read as the end state.
      gsap.fromTo(targets, riseFrom(f), {
        ...riseTo(f),
        stagger: each ? f.stagger.block : 0,
        delay,
        scrollTrigger: on === "scroll" ? { trigger: el, start: LOCKED.trigger.start, once: LOCKED.trigger.once } : undefined,
      });
      el.dataset.ready = "1";
    },
    { scope: ref, dependencies: [each, on, delay] },
  );

  const Tag = as as "div";
  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} data-rise={each ? "each" : ""} className={className}>
      {children}
    </Tag>
  );
}
