"use client";
// components/struq/SplitHeadline.tsx (Struq recipe)
// The hero headline: SplitText cuts it into lines, each line rises out of its own mask.
// autoSplit re-cuts it when the width or the webfont changes, so mobile line breaks stay right.
//
// <SplitHeadline as="h1" className="font-display text-display max-w-[14ch]">
//   Vis en groente, van het seizoen.
// </SplitHeadline>
//
// Pass plain text (or text with <em>): SplitText needs text nodes, not components.
import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "./gsap";

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
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        el.dataset.ready = "1";
        gsap.from(el, { autoAlpha: 0, duration: 0.6 });
        return;
      }

      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "struq-line",
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 115,
            duration: 1.25,
            ease: "expo.out",
            stagger: 0.09,
            delay,
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
