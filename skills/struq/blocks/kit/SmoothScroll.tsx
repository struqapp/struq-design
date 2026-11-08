"use client";
// components/struq/SmoothScroll.tsx (Struq recipe)
// Lenis smooth scroll on the GSAP ticker: one requestAnimationFrame for the whole page.
// Mount it once, in app/layout.tsx, around {children}.
//
// Why it is built this way:
// - autoRaf false plus gsap.ticker: Lenis and ScrollTrigger sample scroll on the same frame,
//   so scrubbed timelines never micro-stutter.
// - lagSmoothing(0): GSAP never "catches up" after a long frame, which would jump scrubs.
// - Lenis is created inside the effect, so there is no ref race that can leave the wheel dead.
// - Reduced motion: no Lenis, native scroll. ScrollTrigger keeps working on native scroll.
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "./gsap";

let current: Lenis | null = null;

/**
 * The page's Lenis instance, or null under reduced motion and before mount.
 * An overlay menu calls getLenis()?.stop() when it opens and getLenis()?.start() on EVERY close path.
 */
export function getLenis() {
  return current;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ScrollTrigger.config({ ignoreMobileResize: true });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fonts change line breaks and section heights: re-measure every trigger once they land.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    const late = window.setTimeout(refresh, 600);

    if (reduce) {
      return () => window.clearTimeout(late);
    }

    const lenis = new Lenis({ lerp: 0.1, autoRaf: false, anchors: true });
    const raf = (time: number) => lenis.raf(time * 1000); // GSAP gives seconds, Lenis wants ms
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    current = lenis;

    return () => {
      window.clearTimeout(late);
      gsap.ticker.remove(raf);
      lenis.destroy();
      current = null;
    };
  }, []);

  return <>{children}</>;
}
