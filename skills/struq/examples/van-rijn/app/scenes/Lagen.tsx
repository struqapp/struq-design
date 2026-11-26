"use client";
// app/scenes/Lagen.tsx: the opening and the signature in one held screen. The first screen sets "Droog, laag voor
// laag." at poster scale beside the finished roof in section, drawn as the preloader lifts, with the water's way run
// over the folie into the goot: a leak travels, so it is never where the stain is. Held for about three and a half
// screens of scroll (sticky, never a GSAP pin), the roof is stripped to the rafters and laid again bottom up (the
// kit's RoofSection: folie, latten, pannen, goot), each layer named on its leader as it lands, while the copy beside
// it trades the opening for the layer that is landing; the water runs once more at the end. Scrubbed, so it reverses.
// Reduced motion: the finished drawing with the water's way, and the copy still follows the scroll without moving.
//
// On a phone the copy sits in a fixed band at the top of the held screen and the drawing fills the rest, above the
// call bar, so no line ever runs under it.
import { useRef, useState } from "react";
import { RoofSection } from "@/components/struq/kit/drawn";
import { SplitHeadline } from "@/components/struq/kit/SplitHeadline";
import { feel, prefersReduced } from "@/components/struq/kit/feel";
import { gsap, ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { HoverLink } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";

/** The scroll beats of the held screen, 0 to 1. */
const HOLD = 0.08; // the opening stands
const SWAP = 0.16; // the copy has traded the opening for the layers
const BUILT = 0.86; // the last layer has landed
const smooth = (t: number) => t * t * (3 - 2 * t);
const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

export function Lagen() {
  const root = useRef<HTMLElement>(null);
  const [q, setQ] = useState(0); // the scroll through the held screen
  const [intro, setIntro] = useState(0); // the roof drawing in on arrival, 0 to 1
  const [still, setStill] = useState(false);
  const { lagen, opening, call: phone, quote } = site;
  const n = lagen.layers.length;

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReduced()) {
      setStill(true);
      setIntro(1);
    } else {
      const o = { v: 0 };
      // The roof draws as the preloader lifts, at the temperament's curtain pace.
      const f = feel(el);
      gsap.to(o, { v: 1, duration: f.duration.curtain * 3, delay: f.duration.curtain, ease: f.ease.swap, onUpdate: () => setIntro(o.v) });
    }
    ScrollTrigger.create({ trigger: el, start: "top top", end: "bottom bottom", onUpdate: (self) => setQ(self.progress) });
  });

  // The rafters land on arrival; the scroll lays the other four.
  const first = 1 / n;
  // On arrival the whole roof draws, and the water's way runs over the folie into the goot: the leak is never where
  // the stain is. Then the scroll strips it back to the rafters and lays it again, layer by layer, and the water
  // runs once more when the goot has landed.
  let build: number;
  let water: number;
  if (still) [build, water] = [1, 1];
  else if (q < HOLD) [build, water] = [Math.min(1, intro * 1.25), span(intro, 0.82, 1)];
  else if (q < SWAP) [build, water] = [1 - (1 - first) * smooth(span(q, HOLD, SWAP)), 1 - span(q, HOLD, HOLD + 0.02)];
  else [build, water] = [first + (1 - first) * smooth(span(q, SWAP, BUILT)), span(q, BUILT, 0.95)];
  // The opening leaves in the first half of the swap, the layers arrive in the second, so the two never overlap.
  const mid = (HOLD + SWAP) / 2;
  const out = smooth(span(q, HOLD, mid));
  const swap = smooth(span(q, mid, SWAP));
  const active = Math.max(0, Math.min(n - 1, Math.floor(build * n - 1e-6)));

  return (
    <section ref={root} id="lagen" data-beat="lagen" data-scene="lagen" data-energy="3" data-bar-tone="ground" className="relative h-[440svh] bg-surface-0">
      <div className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col px-4 pt-[4.5rem] pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:grid md:grid-cols-12 md:gap-x-6 md:px-[4vw] md:pt-20 md:pb-8">
        {/* The copy: the opening, then the layers, in one band that never changes height. */}
        <div className="relative h-[18rem] flex-none md:col-span-5 md:h-auto">
          <div
            className="absolute inset-0 flex flex-col md:justify-center"
            style={{ opacity: 1 - out, transform: `translateY(${-out * 1.5}rem)`, visibility: out >= 1 ? "hidden" : "visible" }}
          >
            <SplitHeadline as="h1" className="font-display text-[15vw] leading-[0.95] tracking-[-0.025em] text-ink max-w-[9ch] md:text-display">
              {opening.title}
            </SplitHeadline>
            <p className="text-lead text-ink mt-4 max-w-[34ch] md:mt-8">{opening.lead}</p>
            <p className="mt-5 hidden gap-8 md:mt-10 md:flex">
              <HoverLink href={phone.href} data-door-placeholder="" className="text-lead text-accent whitespace-nowrap">
                {opening.call}
              </HoverLink>
              <HoverLink href={quote.href} data-door-placeholder="" className="text-lead text-ink whitespace-nowrap">
                {quote.label}
              </HoverLink>
            </p>
          </div>

          <div
            className="absolute inset-0 flex flex-col md:justify-center"
            aria-hidden={swap < 0.5}
            style={{ opacity: swap, transform: `translateY(${(1 - swap) * 1.5}rem)`, visibility: swap <= 0 ? "hidden" : "visible" }}
          >
            <h2 className="font-display text-h2 text-ink max-w-[14ch]">{lagen.title}</h2>
            <p className="text-body text-ink-muted mt-3 hidden max-w-[36ch] md:block">{lagen.lead}</p>
            <ol className="mt-4 grid md:mt-10">
              {lagen.layers.map((layer, i) => {
                const on = i === active;
                return (
                  <li key={layer.key} className={`border-t border-line py-2 md:py-3 ${on ? "" : "max-md:hidden"}`}>
                    <p className={`font-display text-h3 transition-colors duration-500 ${on ? "text-ink" : "text-ink-muted"}`}>
                      {layer.name}
                    </p>
                    <div className={`grid transition-[grid-template-rows,opacity] duration-500 ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <p className="text-body text-ink overflow-hidden max-w-[36ch] pt-1">{layer.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* The drawing: fits the rest of the held screen, ink on the bone ground, the tiles in the accent. */}
        <div className="relative min-h-0 flex-1 md:col-span-7 md:col-start-6 md:h-full">
          <RoofSection
            progress={build}
            water={water}
            locale={site.locale}
            labels={Object.fromEntries(lagen.layers.map((l) => [l.key, l.name]))}
            title={lagen.drawing}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </section>
  );
}
