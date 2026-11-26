"use client";
// app/scenes/Blatimen.tsx: the centerpiece. World.tsx brings the lamp to the middle, looked up at from below, and
// lights it while the wall's pool opens round it. The type stays under the lamp: the line at once, the body rising
// when the lamp is lit. Held for two and a half screens (sticky).
import { useRef } from "react";
import { prefersReduced } from "@/components/struq/kit/feel";
import { gsap, useGSAP } from "@/components/struq/kit/gsap";
import { site } from "@/lib/site";
import { useLeave } from "./leave";

export function Blatimen() {
  const root = useRef<HTMLElement>(null);
  const body = useRef<HTMLParagraphElement>(null);
  const type = useRef<HTMLDivElement>(null);
  useLeave(root, type);

  useGSAP(() => {
    if (!root.current || !body.current || prefersReduced()) return;
    gsap
      .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: true } })
      .fromTo(body.current, { yPercent: 115 }, { yPercent: 0, duration: 0.15 }, 0.4)
      .set({}, {}, 1);
  });

  return (
    <section ref={root} id="blatimen" data-beat="blatimen" data-scene="blatimen" data-energy="3" data-bar-tone="ground" className="relative h-[340svh]">
      <div ref={type} className="sticky top-0 mx-auto flex h-svh max-w-[96rem] flex-col items-center justify-end px-4 pb-[6svh] text-center md:px-[4vw]">
        <h2 className="font-display text-h2 text-ink max-w-[16ch] md:max-w-none">{site.blatimen.title}</h2>
        <div className="struq-line-mask mt-4">
          <p ref={body} className="text-body text-ink mx-auto max-w-[34ch] md:max-w-[52ch]">
            {site.blatimen.body}
          </p>
        </div>
      </div>
    </section>
  );
}
