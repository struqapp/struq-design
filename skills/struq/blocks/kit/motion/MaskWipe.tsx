"use client";
// components/struq/kit/motion/MaskWipe.tsx (Struq recipe)
// Wipes an element or a photo in from one edge with a clip-path, on enter or with the scroll. Use it for media,
// panels and blocks of colour that should open rather than fade. Extracted from kit/MediaFrame's curtain (inset clip
// from one edge, the photo settling inside it) with the edge made a prop.
//
// <MaskWipe from="left" settle className="aspect-[4/5]"><img src="/work/vase.jpg" alt="A celadon vase" className="h-full w-full object-cover" /></MaskWipe>
//
// Props
// - children: what is wiped in. Give the wrapper its size (className) when the child is absolutely placed.
// - from: the edge it opens from: "bottom" (default), "top", "left" or "right".
// - on: "scroll" (default, once at the feel's trigger), "load" (on mount) or "scrub" (opens with the scroll, closes
//   going back).
// - settle: the first child also settles from feel().travel.media scale to 1 (for a photo). Default false.
// - delay: seconds before it starts (load and scroll only). as: "div" (default) or "figure". className: on the wrapper.
//
// Motion: the clip opens on the feel's curtain ease over dur("curtain", height), so a tall photo opens slower than a
// strip; settle runs over dur("settle", height) on the enter ease; scrubbed both run linear with scrub.flow. Reduced
// motion, no scripts or the server render: fully open, at rest. No layout shift: only clip-path and transform move.
import { useRef, type ReactNode } from "react";
import { feel, LOCKED, prefersReduced } from "../feel";
import { gsap, useGSAP } from "../gsap";

type Edge = "bottom" | "top" | "left" | "right";

type Props = {
  children: ReactNode;
  from?: Edge;
  on?: "scroll" | "load" | "scrub";
  settle?: boolean;
  delay?: number;
  as?: "div" | "figure";
  className?: string;
};

/** The closed clip for each edge: everything inset from the opposite side. */
export const CLOSED: Record<Edge, string> = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};
const OPEN = "inset(0% 0% 0% 0%)";

export function MaskWipe({ children, from = "bottom", on = "scroll", settle = false, delay = 0, as = "div", className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReduced()) {
        el.dataset.ready = "1";
        return;
      }
      const f = feel(el);
      const size = el.offsetHeight;
      const scrub = on === "scrub";
      const scrollTrigger = scrub
        ? { trigger: el, start: "top 95%", end: "top 40%", scrub: f.scrub.flow }
        : on === "scroll"
          ? { trigger: el, start: LOCKED.trigger.start, once: LOCKED.trigger.once }
          : undefined;
      const tl = gsap.timeline({ delay: scrub ? 0 : delay, scrollTrigger });
      tl.fromTo(
        el,
        { clipPath: CLOSED[from] },
        { clipPath: OPEN, duration: f.dur("curtain", size), ease: scrub ? f.ease.scrub : f.ease.curtain },
        0,
      );
      const media = el.firstElementChild;
      if (settle && media) {
        tl.fromTo(
          media,
          { scale: f.travel.media },
          { scale: 1, duration: f.dur("settle", size), ease: scrub ? f.ease.scrub : f.ease.enter },
          0,
        );
      }
      el.dataset.ready = "1";
    },
    { scope: ref, dependencies: [from, on, settle, delay] },
  );

  const Tag = as as "div";
  return (
    <Tag ref={ref} data-wipe={from} className={`relative overflow-hidden ${className}`}>
      {children}
    </Tag>
  );
}
