"use client";
// toonstuk-wordmark-finale (Struq showpiece recipe)
// The footer as a finale: the brand name set edge to edge at the full width of the page, its
// letters rising out of a mask as the footer arrives, with one closing line and a live local clock
// (or just the line) above it. The name is measured and fitted to the width, so it never wraps or
// falls short, whatever the face.
// Every site can close with it; it pairs with any lead showpiece.
//
// <WordmarkFinale name="Zout" line="Tot vanavond." place="Amsterdam" timeZone="Europe/Amsterdam" />
//
// Reduced motion and phones: the name stands still at full width; the clock still ticks.
import { useEffect, useRef, useState } from "react";
import { gsap, SplitText, useGSAP } from "../kit/gsap";

type Props = {
  name: string;
  /** One closing line. */
  line?: string;
  /** With a time zone, a live local clock: "Amsterdam 21:42". */
  place?: string;
  timeZone?: string;
  children?: React.ReactNode;
  className?: string;
};

function useClock(timeZone?: string) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    if (!timeZone) return;
    const format = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone });
    const tick = () => setNow(format.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timeZone]);
  return now;
}

export function WordmarkFinale({ name, line, place, timeZone, children, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const mark = useRef<HTMLParagraphElement>(null);
  const now = useClock(timeZone);

  // Fit the name to the full width: measure once at 100px, then scale.
  useEffect(() => {
    const el = mark.current;
    const box = root.current;
    if (!el || !box) return;
    const fit = () => {
      el.style.fontSize = "100px";
      const width = el.scrollWidth || 1;
      const style = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      el.style.fontSize = `${Math.floor((100 * avail) / width)}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [name]);

  useGSAP(
    () => {
      const el = mark.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(el, {
          type: "chars",
          mask: "chars",
          // The shared mask (blocks.css): room for accents and descenders in every face.
          charsClass: "struq-char",
          onSplit(self) {
            return gsap.from(self.chars, {
              yPercent: 105,
              duration: 1.4,
              ease: "expo.out",
              stagger: 0.05,
              scrollTrigger: { trigger: el, start: "top 95%", once: true },
            });
          },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <footer ref={root} data-showpiece="wordmark-finale" className={`overflow-hidden bg-surface-0 px-sheet-margin pb-6 pt-24 ${className}`}>
      <div className="flex flex-col gap-6 border-t border-line pt-6 md:flex-row md:items-end md:justify-between">
        {line ? <p className="font-display text-h3 max-w-[24ch]">{line}</p> : <span />}
        {children}
        {place && timeZone ? (
          <p className="text-small tabular-nums text-ink-muted">
            {place} {now ?? ""}
          </p>
        ) : null}
      </div>
      <p ref={mark} data-wordmark="" aria-label={name} className="font-display mt-10 inline-block whitespace-nowrap leading-[0.8] tracking-[-0.04em]">
        {name}
      </p>
    </footer>
  );
}
