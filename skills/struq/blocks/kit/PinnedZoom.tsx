"use client";
// components/struq/PinnedZoom.tsx (Struq recipe): SHOWPIECE
// The stage pins; a small framed photo opens to full bleed while the statement above it lifts
// away and a closing line arrives over the photo. One scrubbed timeline, so it plays with the
// scroll in both directions. Under reduced motion it is a still full-bleed photo with the text.
//
// <PinnedZoom
//   image={images.band[0]}
//   statement="Veertig plekken, één kaart."
//   closing="Reserveer voor vanavond, of voor zaterdag."
// />
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import type { StruqImage } from "./images";

type Props = {
  image: StruqImage;
  statement: string;
  closing?: string;
  className?: string;
};

export function PinnedZoom({ image, statement, closing, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Two numbers drive the clip, never a tweened string: the browser shortens a symmetric inset to two
        // values, GSAP pairs them with four end values, and two edges jump open in one frame.
        const frame = q("[data-zoom-frame]")[0] as HTMLElement;
        const clip = { y: 22, x: 30 };
        const paint = () => {
          frame.style.clipPath = `inset(${clip.y}% ${clip.x}% ${clip.y}% ${clip.x}%)`;
        };
        paint();
        gsap.set(q("[data-zoom-closing]"), { autoAlpha: 0, yPercent: 40 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "+=160%", pin: true, scrub: 1 },
        });
        tl.to(clip, { y: 0, x: 0, duration: 1, onUpdate: paint }, 0)
          .fromTo(q("[data-zoom-photo]"), { scale: 1.35 }, { scale: 1, duration: 1 }, 0)
          .to(q("[data-zoom-statement]"), { yPercent: -60, autoAlpha: 0, duration: 0.45 }, 0)
          .to(q("[data-zoom-closing]"), { yPercent: 0, autoAlpha: 1, duration: 0.35 }, 0.62);
        return () => {
          frame.style.clipPath = "";
        };
      });
      // Still version: the photo is full bleed from the start, so the statement turns light.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(q("[data-zoom-statement]"), { color: "var(--on-photo)" });
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  return (
    <section ref={stage} className={`relative h-svh overflow-hidden bg-surface-0 ${className}`}>
      <div data-zoom-frame="" className="absolute inset-0 overflow-hidden">
        <div data-zoom-photo="" className="absolute inset-0">
          <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
        </div>
        {/* A flat black scrim, so the closing line reads on any photo, on light and dark palettes. */}
        <div aria-hidden className="absolute inset-0 bg-black opacity-35" />
      </div>
      <p
        data-zoom-statement=""
        className="font-display text-h2 absolute inset-x-6 top-[9vh] mx-auto max-w-[22ch] text-center text-ink md:inset-x-[8vw]"
      >
        {statement}
      </p>
      {closing ? (
        <p
          data-zoom-closing=""
          className="font-display text-h2 absolute inset-x-6 bottom-[12vh] max-w-[20ch] text-on-photo md:left-[8vw]"
        >
          {closing}
        </p>
      ) : null}
    </section>
  );
}
