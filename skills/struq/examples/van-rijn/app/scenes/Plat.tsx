"use client";
// app/scenes/Plat.tsx: the flat roof, the drawing's second use. The same kit piece (RoofSection) with cover="flat":
// joists, boarding, insulation, bitumen and the gutter at the roof's edge, built by this scene's own scroll as it
// rises through the view, scrubbed and reversing. The heading and one line on the left, a step below display; the
// drawing large on the right. On a phone the drawing stands under the copy, full width. Reduced motion: finished.
import { useRef, useState } from "react";
import { RoofSection } from "@/components/struq/kit/drawn";
import { prefersReduced } from "@/components/struq/kit/feel";
import { ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";

export function Plat() {
  const root = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const { plat } = site;

  useGSAP(() => {
    if (!root.current) return;
    if (prefersReduced()) return setP(1);
    ScrollTrigger.create({ trigger: root.current, start: "top 85%", end: "bottom 75%", scrub: true, onUpdate: (self) => setP(self.progress) });
  });

  return (
    <section id="plat" data-scene="plat" data-energy="2" data-bar-tone="ground" className="relative bg-surface-0">
      <div className="mx-auto grid max-w-[96rem] gap-10 px-4 py-24 md:grid-cols-12 md:items-center md:gap-x-6 md:px-[4vw] md:py-36">
        <div className="md:col-span-4 md:pt-8">
          <RevealText as="h2" className="font-display text-h2 text-ink max-w-[11ch]">
            {plat.title}
          </RevealText>
          <p className="text-lead text-ink-muted mt-6 max-w-[32ch]">{plat.text}</p>
        </div>
        <div ref={root} className="md:col-span-8">
          <RoofSection cover="flat" progress={Math.min(1, p * 1.2)} water={Math.max(0, p * 6 - 5)} locale={site.locale} labels={plat.labels} title={plat.drawing} className="w-full" />
        </div>
      </div>
    </section>
  );
}
