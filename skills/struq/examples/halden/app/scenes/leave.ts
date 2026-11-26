"use client";
// app/scenes/leave.ts: on a phone the world's lamp sits in the upper half, so a scene's type, scrolling up as its
// sticky screen lets go, would pass behind it. useLeave fades the type out in the first tenth of a screen after the
// section lets go, scrubbed, so it comes back on the way up. Wide screens keep the type: the lamp is beside it there.
import type { RefObject } from "react";
import { prefersReduced } from "@/components/struq/kit/feel";
import { gsap, useGSAP } from "@/components/struq/kit/gsap";

export function useLeave(section: RefObject<HTMLElement | null>, type: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const [s, t] = [section.current, type.current];
    if (!s || !t || prefersReduced()) return;
    const mm = gsap.matchMedia();
    mm.add("(max-width: 767px)", () => {
      gsap.fromTo(t, { opacity: 1 }, { opacity: 0, ease: "none", scrollTrigger: { trigger: s, start: "bottom bottom", end: "bottom 90%", scrub: true } });
    });
    return () => mm.revert();
  });
}
