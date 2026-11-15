"use client";
// components/struq/kit/motion/RevealText.tsx (Struq recipe)
// Text that rises out of a mask, line by line or word by word. Use it for every headline or statement that should
// arrive; never hand-roll a SplitText reveal. Extracted from kit/SplitHeadline (lines: SplitText, autoSplit re-cuts on
// resize and font load) and the live site's word reveal (words set in their own masks at render, no layout cost).
//
// <RevealText as="h2" by="lines" className="font-display text-h2 max-w-[18ch]">Grown slowly, poured by hand.</RevealText>
//
// Props
// - children: plain text (lines may carry an <em> accent; words take a string only).
// - as: "h1" | "h2" | "h3" | "p" | "span" | "div" (default "h2").
// - by: "lines" (default) or "words".
// - on: "scroll" (default, once at the feel's trigger), "load" (on mount, for a hero) or "scrub" (tied to the scroll
//   while the text crosses the lower half of the screen, reverses going back).
// - delay: seconds before it starts (load and scroll only). className: on the element.
//
// Motion: each line or word starts feel().travel.text percent below its mask and rises on the feel's enter ease, over
// duration.line, staggered by stagger.line or stagger.word; scrubbed it runs linear with scrub.flow smoothing. The
// masks use the shared .struq-line-mask room, so g, j, p and y are never clipped and the layout never moves. Reduced
// motion, no scripts or the server render: the finished text.
import { useRef, type ReactNode } from "react";
import { feel, LOCKED, prefersReduced } from "../feel";
import { gsap, SplitText, useGSAP } from "../gsap";

type Props = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  by?: "lines" | "words";
  on?: "scroll" | "load" | "scrub";
  delay?: number;
  className?: string;
};

/** The words of a string, each in its own shared mask, with the spaces kept as text so the line breaks as before. */
function wordsOf(text: string) {
  const parts = text.split(/(\s+)/).filter((part) => part !== "");
  return parts.map((part, i) =>
    /^\s+$/.test(part) ? (
      part
    ) : (
      <span key={i} className="struq-line-mask" data-word="">
        <span data-word-rise="">{part}</span>
      </span>
    ),
  );
}

export function RevealText({ children, as = "h2", by = "lines", on = "scroll", delay = 0, className = "" }: Props) {
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
      const trigger =
        on === "scrub"
          ? { trigger: el, start: "top 90%", end: "top 50%", scrub: f.scrub.flow }
          : on === "scroll"
            ? { trigger: el, start: LOCKED.trigger.start, once: LOCKED.trigger.once }
            : undefined;
      const rise = (targets: Element[], stagger: number) =>
        gsap.from(targets, {
          yPercent: f.travel.text,
          duration: f.duration.line,
          ease: on === "scrub" ? f.ease.scrub : f.ease.enter,
          stagger,
          delay: on === "scrub" ? 0 : delay,
          scrollTrigger: trigger,
        });

      if (by === "words") {
        rise(Array.from(el.querySelectorAll("[data-word-rise]")), f.stagger.word);
        el.dataset.ready = "1";
        return;
      }
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "struq-line",
        autoSplit: true,
        onSplit(self) {
          return rise(self.lines, f.stagger.line);
        },
      });
      el.dataset.ready = "1";
      return () => split.revert();
    },
    { scope: ref, dependencies: [by, on, delay] },
  );

  const Tag = as as "h2";
  const content = by === "words" && typeof children === "string" ? wordsOf(children) : children;
  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement>} data-reveal-text={by} className={className}>
      {content}
    </Tag>
  );
}
