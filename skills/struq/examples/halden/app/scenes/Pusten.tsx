"use client";
// app/scenes/Pusten.tsx: the opening. The h1 on the left over the world, the lamp on the right (world.tsx blows it
// from the hot gather into the clear globe). Held on the screen for two screens of scroll (sticky, never a GSAP pin,
// so the beats measure its real length); the lead line rises as the glass clears. On a phone the type sits in the
// lower half, under the lamp.
import { useRef } from "react";
import { SplitHeadline } from "@/components/struq/kit/SplitHeadline";
import { prefersReduced } from "@/components/struq/kit/feel";
import { gsap, useGSAP } from "@/components/struq/kit/gsap";
import { site } from "@/lib/site";
import { useLeave } from "./leave";

export function Pusten() {
  const root = useRef<HTMLElement>(null);
  const lead = useRef<HTMLParagraphElement>(null);
  const type = useRef<HTMLDivElement>(null);
  useLeave(root, type);

  useGSAP(() => {
    if (!root.current || !lead.current || prefersReduced()) return;
    gsap
      .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: true } })
      .fromTo(lead.current, { yPercent: 115 }, { yPercent: 0, duration: 0.15 }, 0.35)
      .set({}, {}, 1);
  });

  return (
    <section ref={root} id="pusten" data-beat="pusten" data-scene="pusten" data-energy="3" data-bar-tone="ground" className="relative h-[300svh]">
      <div ref={type} className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col justify-end px-4 pb-[9svh] md:justify-center md:px-[4vw] md:pb-0">
        <div className="md:max-w-[48%]">
          <SplitHeadline as="h1" className="font-display text-display text-ink max-w-[11ch]">
            {site.opening.title}
          </SplitHeadline>
        </div>
        <div className="struq-line-mask mt-6 md:mt-11">
          <p ref={lead} className="text-lead text-ink max-w-[34ch]">
            {site.opening.lead}
          </p>
        </div>
      </div>
    </section>
  );
}
