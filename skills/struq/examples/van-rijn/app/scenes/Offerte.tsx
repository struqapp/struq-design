"use client";
// app/scenes/Offerte.tsx: the close, over the world: the finished roof stands dry on the right (world.tsx), the rain
// over. On the left the motif's last line (a rule draws, then a small gable over a gutter), the one question, and the
// kit's door close: the quote as a large pressable door and the phone number set large under it. The services are
// not listed again: Werk showed them. On a phone the roof sits above and the doors in the lower half.
import { RevealText, ScrubLine } from "@/components/struq/kit/motion";
import { Close } from "@/components/struq/kit/quiet";
import { site } from "@/lib/site";

export function Offerte() {
  return (
    <section id="offerte" data-beat="offerte" data-scene="offerte" data-energy="1" data-bar-tone="ground" className="relative flex min-h-[110svh] flex-col justify-end pt-[48svh] md:justify-center md:pt-0">
      <div className="mx-auto w-full max-w-[96rem] px-4 md:px-[4vw]">
        {/* data-world-clear: on a phone the roof rises ahead of this block, so the type never runs into it. */}
        <div data-world-clear="" className="md:w-[46%]">
          <ScrubLine axis="x" className="h-px w-full max-w-[22rem] text-ink-muted" start="top 90%" end="top 50%" />
          <svg viewBox="0 0 120 44" className="mt-6 h-11 w-[7.5rem] text-ink" aria-hidden>
            <path d="M4 34 L60 6 L116 34" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M14 29 L60 6 L106 29" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
            <path d="M104 35 h14 a7 7 0 0 1 -14 0 Z" className="fill-accent" />
          </svg>
          <RevealText as="h2" className="font-display text-h2 text-ink mt-8 max-w-[14ch]">
            {site.offerte.title}
          </RevealText>
        </div>
      </div>
      <div className="md:w-[54%]">
        <Close shape="door" doors={[site.quote, site.phone]} className="bg-transparent pt-8! pb-16! md:pt-10!" />
      </div>
    </section>
  );
}
