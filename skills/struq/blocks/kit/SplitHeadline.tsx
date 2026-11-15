"use client";
// components/struq/SplitHeadline.tsx (Struq recipe)
// The hero headline: SplitText cuts it into lines, each line rises out of its own mask.
// autoSplit re-cuts it when the width or the webfont changes, so mobile line breaks stay right. The rise is the site's
// temperament (./feel): travel.text, duration.line, the enter ease, stagger.line. Reduced motion: the finished text.
//
// <SplitHeadline as="h1" className="font-display text-display max-w-[14ch]">
//   Vis en groente, van het seizoen.
// </SplitHeadline>
//
// Pass plain text (or text with <em>): SplitText needs text nodes, not components. The accent helper's no-wrap unit
// (the mark with the punctuation touching it, ./accent) is cut as one piece, so it always lands whole on one line.
import { useRef } from "react";
import { feel, prefersReduced } from "./feel";
import { gsap, SplitText, useGSAP } from "./gsap";
import { timeIn } from "./tempo";

type Props = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  /** "load" for the hero, "scroll" for a statement further down. */
  on?: "load" | "scroll";
  delay?: number;
  /** Mark it as copy the hero canvas hushes behind. On by default for the h1. */
  quiet?: boolean;
};

export function SplitHeadline({ children, as = "h1", className = "", on = "load", delay = 0.15, quiet = as === "h1" }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      // Reduced motion: the finished headline at once, full ink. No fade: a fade that never runs leaves it grey.
      if (prefersReduced()) {
        el.dataset.ready = "1";
        return;
      }

      const f = feel(el);
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "struq-line",
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: f.travel.text,
            duration: f.duration.line,
            ease: f.ease.enter,
            stagger: f.stagger.line,
            delay: timeIn(f, delay),
            scrollTrigger: on === "scroll" ? { trigger: el, start: "top 80%", once: true } : undefined,
          });
        },
      });
      el.dataset.ready = "1";
      return () => split.revert();
    },
    { scope: ref },
  );

  const Tag = as as "h1";
  return (
    <Tag ref={ref} data-split="" data-quiet={quiet ? "" : undefined} className={className}>
      {children}
    </Tag>
  );
}
