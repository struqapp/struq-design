"use client";
// toonstuk-image-to-fullbleed (Struq showpiece recipe)
// A small image in the middle of the ground, the name split to either side of it. As you scroll
// the stage pins, the image unclips to the full viewport while the two words travel apart and off
// the edges, the photo settles from a push-in, and one closing line rises over it. Then it holds.
// Lead for a product launch (with the hero scene) and for a studio portfolio.
//
// <ImageToFullbleed image={images.hero[0]} left="Zout" right="Noord" line="Koken met wat het seizoen geeft." />
//
// Reduced motion and phones: the composed still, the photo full bleed with both words and the line.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Props = {
  image: StruqImage;
  left: string;
  right: string;
  /** One closing line over the open photo. */
  line?: string;
  className?: string;
};

export function ImageToFullbleed({ image, left, right, line, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        el.dataset.motion = "1";
        // The clip is driven from two numbers, never tweened as a string: the browser shortens a symmetric
        // inset(31% 40% 31% 40%) to inset(31% 40%), GSAP then pairs two start numbers with four end numbers,
        // and two edges jump open in one frame while the other two slide.
        const frame = q("[data-frame]")[0] as HTMLElement;
        const clip = { y: 31, x: 40 };
        const paint = () => {
          frame.style.clipPath = `inset(${clip.y}% ${clip.x}% ${clip.y}% ${clip.x}%)`;
        };
        paint();
        gsap.set(q("[data-photo]"), { scale: 1.35 });
        gsap.set(q("[data-line]"), { yPercent: 100, autoAlpha: 0 });
        gsap.set(q("[data-scrim]"), { autoAlpha: 0 }); // the scrim ends at its class opacity, never solid
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "+=220%", pin: true, scrub: 1 },
        });
        tl.to({}, { duration: 0.12 }) // hold on the small frame
          .to(clip, { y: 0, x: 0, duration: 1, ease: "power2.inOut", onUpdate: paint })
          .to(q("[data-photo]"), { scale: 1, duration: 1, ease: "power2.inOut" }, "<")
          .to(q("[data-left]"), { xPercent: -120, duration: 0.9, ease: "power2.in" }, "<")
          .to(q("[data-right]"), { xPercent: 120, duration: 0.9, ease: "power2.in" }, "<")
          .to(q("[data-scrim]"), { autoAlpha: 0.3, duration: 0.4 }, "-=0.3")
          .to(q("[data-line]"), { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: "expo.out" }, "-=0.2")
          .to({}, { duration: 0.35 }); // hold on the open frame
        return () => {
          delete el.dataset.motion;
          frame.style.clipPath = "";
        };
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  return (
    <section ref={stage} data-showpiece="image-to-fullbleed" className={`relative h-svh overflow-hidden bg-surface-0 ${className}`}>
      <div data-frame="" className="absolute inset-0 overflow-hidden">
        <div data-photo="" className="absolute inset-0">
          <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
        </div>
        <div data-scrim="" aria-hidden className="absolute inset-0 bg-black opacity-30" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-6 text-on-photo md:px-[4vw] motion-safe:md:text-ink">
        <span data-left="" className="font-display block text-[18vw] leading-[0.85] tracking-[-0.04em] md:text-[12vw]">{left}</span>
        <span data-right="" className="font-display block text-[18vw] leading-[0.85] tracking-[-0.04em] md:text-[12vw]">{right}</span>
      </div>
      {line ? (
        <p data-line="" className="font-display text-h2 absolute bottom-[10vh] left-6 max-w-[18ch] text-on-photo md:left-[8vw]">
          {line}
        </p>
      ) : null}
    </section>
  );
}
