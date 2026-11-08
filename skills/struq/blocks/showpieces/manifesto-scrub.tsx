"use client";
// toonstuk-manifesto-scrub (Struq showpiece recipe)
// One large statement paragraph that fills word by word as it scrolls through the screen, from a
// faint ink to full ink. Type only: the photos that used to open inside the line were dropped on
// 2026-11-06 (Roy: they read as glitchy), so the statement carries the move on its own.
// Lead for editorial sites; the supporting move for restaurants and hospitality.
//
// <ManifestoScrub text="Wij koken met wat de zee en het land die week geven, en verder niets." />
//
// Reduced motion and phones: the composed still, the whole paragraph in full ink.
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";

type Props = { text: string; className?: string };

export function ManifestoScrub({ text, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(q("[data-word]"), { opacity: 0.16 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "+=200%", pin: true, scrub: 1 },
        });
        q("[data-word]").forEach((node: Element, i: number) => {
          tl.to(node, { opacity: 1, duration: 0.3 }, i * 0.12);
        });
        tl.to({}, { duration: 0.6 });
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  return (
    <section ref={stage} data-showpiece="manifesto-scrub" className={`relative flex items-center bg-surface-0 px-6 py-32 md:min-h-svh md:px-[8vw] md:py-0 ${className}`}>
      <p className="font-display max-w-[22ch] text-[9vw] leading-[1.02] tracking-[-0.025em] md:text-[5.2vw]">
        {text.split(/(\s+)/).map((w, j) => (w.trim() ? <span key={j} data-word="">{w}</span> : w))}
      </p>
    </section>
  );
}
