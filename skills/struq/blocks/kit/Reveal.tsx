"use client";
// components/struq/Reveal.tsx (Struq recipe)
// Staggered rise for a group of text blocks: every direct child rises 48px from a fade as the
// group scrolls into view. Opacity AND transform, never opacity alone, expo.out, fired once.
//
// <Reveal className="grid gap-6">
//   <h2 className="text-h2">...</h2>
//   <p className="text-lead">...</p>
// </Reveal>
//
// Before hydration the children are hidden only when JavaScript runs (the `js` class from the
// layout), and a CSS failsafe shows them after 3s if hydration never comes (globals.css).
import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "ul" | "ol";
  /** Distance each child rises, in px. 24 to 80. */
  y?: number;
  stagger?: number;
  delay?: number;
  /** "scroll" waits for the viewport; "load" plays on mount (for the hero). */
  on?: "scroll" | "load";
};

export function Reveal({ children, className = "", as = "div", y = 48, stagger = 0.08, delay = 0, on = "scroll" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const items = Array.from(el.children);
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const reduce = ctx.conditions?.reduce;
          gsap.from(items, {
            y: reduce ? 0 : y,
            autoAlpha: 0,
            duration: reduce ? 0.5 : 0.9,
            ease: "expo.out",
            stagger,
            delay,
            scrollTrigger: on === "scroll" ? { trigger: el, start: "top 85%", once: true } : undefined,
          });
        },
      );
      el.dataset.ready = "1";
      return () => mm.revert();
    },
    { scope: ref },
  );

  const Tag = as as "div";
  return (
    <Tag ref={ref} data-reveal="" className={className}>
      {children}
    </Tag>
  );
}
