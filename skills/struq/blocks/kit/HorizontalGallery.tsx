"use client";
// components/struq/HorizontalGallery.tsx (Struq recipe): SHOWPIECE
// A pinned section whose track of images slides sideways as you scroll down, each photo panning
// inside its frame (containerAnimation). Place it at an act break: after the first proof, before
// the invitation. On phones and under reduced motion it becomes a native swipe row, no pin.
//
// <HorizontalGallery
//   title={<>De kaart volgt<br />de markt.</>}
//   intro="Wat de vissers en telers die week brengen, staat zaterdag op tafel."
//   items={[{ image: images.card[0], title: "Zeebaars", text: "Uit de Noordzee, op de huid gebakken." }, ...]}
// />
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "./gsap";
import type { StruqImage } from "./images";

type Item = { image: StruqImage; title: string; text?: string };

type Props = {
  title: React.ReactNode;
  intro?: string;
  items: Item[];
  className?: string;
};

export function HorizontalGallery({ title, intro, items, className = "" }: Props) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = section.current;
      const row = track.current;
      if (!el || !row) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const distance = () => Math.max(0, row.scrollWidth - window.innerWidth);
        const slide = gsap.to(row, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1, // no pin anticipation: with smooth scroll it jerks the pin on engage
            invalidateOnRefresh: true,
          },
        });
        // Each photo pans against the slide, which gives the row depth.
        gsap.utils.toArray<HTMLElement>("[data-pan]", el).forEach((photo) => {
          gsap.fromTo(
            photo,
            { xPercent: -6 },
            {
              xPercent: 6,
              ease: "none",
              scrollTrigger: { trigger: photo, containerAnimation: slide, start: "left right", end: "right left", scrub: true },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section ref={section} className={`relative overflow-hidden bg-surface-1 ${className}`}>
      <div className="flex min-h-svh flex-col justify-center gap-12 py-24 md:py-0">
        <div
          ref={track}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 md:w-max md:snap-none md:gap-10 md:overflow-visible md:px-[8vw]"
        >
          <div className="flex w-[80vw] shrink-0 snap-start flex-col justify-end gap-6 md:w-[34vw] md:pr-[4vw]">
            <h2 className="font-display text-h2">{title}</h2>
            {intro ? <p className="max-w-[40ch] text-lead text-ink-muted">{intro}</p> : null}
          </div>
          {items.map((item, i) => (
            <figure
              key={item.image.src}
              className={`flex shrink-0 snap-start flex-col gap-4 ${i % 2 ? "w-[72vw] md:w-[26vw] md:pt-[12vh]" : "w-[80vw] md:w-[34vw]"}`}
            >
              <div className="relative overflow-hidden bg-surface-2" style={{ aspectRatio: i % 2 ? "4/5" : "3/2" }}>
                <div data-pan="" className="absolute inset-[-8%]">
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes="(min-width: 768px) 34vw, 80vw"
                    unoptimized={item.image.unoptimized}
                    className="object-cover"
                  />
                </div>
              </div>
              <figcaption className="flex flex-col gap-1">
                <span className="font-display text-h3">{item.title}</span>
                {item.text ? <span className="max-w-[36ch] text-small text-ink-muted">{item.text}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
