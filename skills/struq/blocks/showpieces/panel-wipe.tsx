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
// Both words share one size, fitted after the display face loads: each holds its own half with a clear gap at the
// seam, so a long pair never runs together or off the edge. One word or a short phrase per side.
//
// Reduced motion and phones: the composed still, both words above the full-bleed photo (the second on its own line
// when the pair is too long for one).
import Image from "next/image";
import { useEffect, useRef } from "react";
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

// Inline, because the kit balances display type (text-wrap), which would let a two-word word break inside itself.
const NOWRAP = { whiteSpace: "nowrap", textWrap: "nowrap" } as React.CSSProperties;

/** A word's width at 100px, its own padding included, on a fresh copy (the word itself may be mid-move). */
function widthAt100(w: HTMLElement) {
  const c = w.cloneNode(true) as HTMLElement;
  Object.assign(c.style, { position: "absolute", left: "0", top: "0", visibility: "hidden", fontSize: "100px", display: "inline-block" });
  w.parentElement?.appendChild(c);
  const width = c.offsetWidth;
  c.remove();
  return width;
}

const contentWidth = (box: HTMLElement) => {
  const cs = getComputedStyle(box);
  return box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
};

export function PanelWipe({ image, left, right, caption, close = true, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  // Fit both words to one size that holds the width: in the panels each word inside its own half, in the still layout
  // the longer word inside the line. Measured with the display face in, and again whenever the width or a face changes.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const panels = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const fit = () => {
      const W = el.clientWidth;
      if (!W) return;
      const max = (W >= 768 ? 0.11 : 0.15) * W;
      let size = max;
      if (panels.matches) {
        for (const side of ["[data-panel-left]", "[data-panel-right]"]) {
          const box = el.querySelector<HTMLElement>(side);
          const w = box?.querySelector<HTMLElement>("[data-pw-word]");
          if (!box || !w) continue;
          const width = widthAt100(w);
          if (width > 0) size = Math.min(size, (100 * contentWidth(box)) / width);
        }
      } else {
        const box = el.querySelector<HTMLElement>("[data-pw-still]");
        if (box) {
          const room = contentWidth(box);
          for (const w of Array.from(box.querySelectorAll<HTMLElement>("[data-pw-word]"))) {
            const width = widthAt100(w);
            if (width > 0) size = Math.min(size, (100 * room) / width);
          }
        }
      }
      el.style.setProperty("--pw-size", `${Math.floor(size)}px`);
    };
    fit();
    document.fonts?.ready.then(fit);
    document.fonts?.addEventListener?.("loadingdone", fit);
    panels.addEventListener("change", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      ro.disconnect();
      panels.removeEventListener("change", fit);
      document.fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [left, right]);

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

  // Both words at one fitted size (--pw-size), never above 15vw on phones and 11vw on wider screens.
  const word =
    "font-display block w-fit leading-[0.85] tracking-[-0.04em] text-[length:var(--pw-size,15vw)] md:text-[length:var(--pw-size,11vw)]";
  return (
    <section ref={stage} data-showpiece="panel-wipe" className={`relative overflow-hidden bg-surface-0 motion-safe:md:h-svh ${className}`}>
      {/* Still layout (phones, reduced motion): the words, then the photo. Side by side when both fit at the full
          size, else the second word drops to its own line on the right; a gap of its own size keeps them apart. */}
      <div
        data-pw-still=""
        className="flex flex-wrap justify-between gap-x-[0.3em] gap-y-[0.16em] px-sheet-margin pb-8 pt-24 text-[length:var(--pw-size,15vw)] md:hidden motion-reduce:md:flex md:text-[length:var(--pw-size,11vw)]"
      >
        <span data-pw-word="" className={word} style={NOWRAP}>
          {left}
        </span>
        <span data-pw-word="" className={`${word} ml-auto`} style={NOWRAP}>
          {right}
        </span>
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
      {/* Each word holds its half: the page margin outside, and on the seam side a third of its own size, so the two
          meet with a clear gap and never run together or off the edge. */}
      <div data-panel-left="" className="absolute inset-y-0 left-0 hidden w-[calc(50%+1px)] items-center justify-end bg-surface-0 pl-sheet-margin motion-safe:md:flex">
        <span data-pw-word="" className={`${word} pr-[0.3em]`} style={NOWRAP}>
          {left}
        </span>
      </div>
      <div data-panel-right="" className="absolute inset-y-0 right-0 hidden w-[calc(50%+1px)] items-center justify-start bg-surface-0 pr-sheet-margin motion-safe:md:flex">
        <span data-pw-word="" className={`${word} pl-[0.3em]`} style={NOWRAP}>
          {right}
        </span>
      </div>
    </section>
  );
}
