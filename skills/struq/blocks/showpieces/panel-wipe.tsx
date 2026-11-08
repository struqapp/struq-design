"use client";
// toonstuk-panel-wipe (Struq showpiece recipe)
// Two ground-colour panels meet in the middle, each carrying one word of the headline. As you
// scroll the stage pins, the panels part to the edges and reveal a full-bleed photo behind them,
// the photo settling from a push-in; the panels then close again over it, so the headline carries
// you into the next scene. A scene change by mask, never a fade between boxes.
// Lead for restaurants and hospitality (with toonstuk-manifesto-scrub as the supporting move).
//
// <PanelWipe image={images.band[0]} left="Vuur" right="Zout" caption="De oven brandt vanaf vier uur." />
//
// Reduced motion and phones: the composed still, both words above the full-bleed photo.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Props = {
  image: StruqImage;
  left: string;
  right: string;
  /** One quiet line on the open photo. */
  caption?: string;
  /** Close the panels again at the end (default), or leave the photo open. */
  close?: boolean;
  className?: string;
};

export function PanelWipe({ image, left, right, caption, close = true, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(q("[data-photo]"), { scale: 1.25 });
        gsap.set(q("[data-caption]"), { autoAlpha: 0, yPercent: 60 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: close ? "+=260%" : "+=170%", pin: true, scrub: 1 },
        });
        tl.to({}, { duration: 0.15 })
          .to(q("[data-panel-left]"), { xPercent: -100, duration: 1, ease: "power3.inOut" })
          .to(q("[data-panel-right]"), { xPercent: 100, duration: 1, ease: "power3.inOut" }, "<")
          .to(q("[data-photo]"), { scale: 1, duration: 1.2, ease: "power2.out" }, "<")
          .to(q("[data-caption]"), { autoAlpha: 1, yPercent: 0, duration: 0.4, ease: "expo.out" }, "-=0.3")
          .to({}, { duration: 0.5 });
        if (close) {
          tl.to(q("[data-caption]"), { autoAlpha: 0, duration: 0.2 })
            .to(q("[data-panel-left]"), { xPercent: 0, duration: 1, ease: "power3.inOut" }, "<")
            .to(q("[data-panel-right]"), { xPercent: 0, duration: 1, ease: "power3.inOut" }, "<")
            .to({}, { duration: 0.15 });
        }
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  const word = "font-display block text-[15vw] leading-[0.85] tracking-[-0.04em] md:text-[11vw]";
  return (
    <section ref={stage} data-showpiece="panel-wipe" className={`relative overflow-hidden bg-surface-0 motion-safe:md:h-svh ${className}`}>
      {/* Still layout (phones, reduced motion): the words, then the photo. */}
      <div className="flex justify-between px-6 pb-8 pt-24 md:hidden motion-reduce:md:flex">
        <span className={word}>{left}</span>
        <span className={word}>{right}</span>
      </div>
      <div className="relative aspect-[4/5] overflow-hidden motion-safe:md:absolute motion-safe:md:inset-0 motion-safe:md:aspect-auto motion-reduce:md:aspect-[16/9]">
        <div data-photo="" className="absolute inset-0">
          <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
        </div>
        {caption ? (
          <p data-caption="" className="absolute z-10 bottom-[8vh] left-6 max-w-[34ch] text-lead text-on-photo md:left-[8vw]">
            <span aria-hidden className="absolute -inset-x-4 -inset-y-3 -z-10 bg-black opacity-35" />
            {caption}
          </p>
        ) : null}
      </div>
      <div data-panel-left="" className="absolute inset-y-0 left-0 hidden w-[calc(50%+1px)] items-center justify-end bg-surface-0 pr-[1.5vw] motion-safe:md:flex">
        <span className={word}>{left}</span>
      </div>
      <div data-panel-right="" className="absolute inset-y-0 right-0 hidden w-[calc(50%+1px)] items-center justify-start bg-surface-0 pl-[1.5vw] motion-safe:md:flex">
        <span className={word}>{right}</span>
      </div>
    </section>
  );
}
