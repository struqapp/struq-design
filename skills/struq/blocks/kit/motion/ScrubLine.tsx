"use client";
// components/struq/kit/motion/ScrubLine.tsx (Struq recipe)
// A rule or a drawn path that draws itself as the reader scrolls and undraws going back. Use it for a divider that
// grows into a section, a timeline's spine, a route on a map, an underline under a statement. Extracted from
// sections/approach's thread (a line drawn by scroll progress, linear, with the in-flow smoothing).
//
// <ScrubLine className="my-16" />
// <ScrubLine path="M2 40 C 120 0, 240 80, 398 30" viewBox="0 0 400 80" className="h-20 w-full text-accent" />
//
// Props
// - path: an SVG path's d. Without it, a straight rule.
// - viewBox: the path's viewBox (default "0 0 100 100"). strokeWidth: in the viewBox's units (default 1.5).
// - axis: the rule's direction, "x" (default, drawn left to right) or "y" (top to bottom; give it a height).
// - thickness: the rule's weight in px (default 1).
// - start, end: ScrollTrigger positions for the line's own top (default "top 85%" to "top 35%").
// - className: on the rule or the svg. It draws in currentColor.
//
// Motion: progress follows the scroll, linear, with the feel's scrub.flow smoothing; a path draws along its length
// (one dash as long as the measured path, so any path draws at an even pace). Reduced motion, no scripts or the server render: fully drawn.
import { useRef } from "react";
import { feel, prefersReduced } from "../feel";
import { gsap, useGSAP } from "../gsap";

type Props = {
  path?: string;
  viewBox?: string;
  strokeWidth?: number;
  axis?: "x" | "y";
  thickness?: number;
  start?: string;
  end?: string;
  className?: string;
};

export function ScrubLine({
  path,
  viewBox = "0 0 100 100",
  strokeWidth = 1.5,
  axis = "x",
  thickness = 1,
  start = "top 85%",
  end = "top 35%",
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement & SVGSVGElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReduced()) {
        el.dataset.ready = "1";
        return;
      }
      const f = feel(el);
      const scrollTrigger = { trigger: el, start, end, scrub: f.scrub.flow };
      const line = path ? el.querySelector("path") : el;
      if (!line) return;
      if (path) {
        // The path's own measured length: one dash as long as the path, offset by all of it, then by none.
        const length = (line as SVGPathElement).getTotalLength();
        gsap.set(line, { attr: { "stroke-dasharray": `${length} ${length}` } });
        gsap.fromTo(
          line,
          { attr: { "stroke-dashoffset": length } },
          { attr: { "stroke-dashoffset": 0 }, ease: f.ease.scrub, scrollTrigger },
        );
      } else {
        gsap.fromTo(
          line,
          axis === "x" ? { scaleX: 0 } : { scaleY: 0 },
          { ...(axis === "x" ? { scaleX: 1 } : { scaleY: 1 }), ease: f.ease.scrub, scrollTrigger },
        );
      }
      el.dataset.ready = "1";
    },
    { scope: ref, dependencies: [path, axis, start, end] },
  );

  if (path) {
    return (
      <svg
        ref={ref}
        data-scrub-line="path"
        viewBox={viewBox}
        fill="none"
        aria-hidden
        className={`block ${className}`}
      >
        <path
          d={path}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
      </svg>
    );
  }
  return (
    <span
      ref={ref}
      aria-hidden
      data-scrub-line={axis}
      className={`block bg-current ${className}`}
      style={axis === "x" ? { height: thickness } : { width: thickness }}
    />
  );
}
