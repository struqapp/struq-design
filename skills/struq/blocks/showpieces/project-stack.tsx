"use client";
// toonstuk-project-stack (Struq showpiece recipe)
// The work, one project per screen. The stage pins, each next project slides up over the last
// one full bleed, while the one beneath recedes (scale and a darker veil), so the stack reads as
// layered rather than cut. Over the photos the cursor turns into a round "Bekijk" label
// (data-cursor="Bekijk"; the Cursor recipe renders it). Names are set large, the meta small.
// Lead for an architect or a studio portfolio.
//
// <ProjectStack items={[{ image: images.hero[0], title: "De Spinnerij", meta: "Transformatie, Charlois", href: "/werk/spinnerij" }]} />
//
// Only real projects from the brief, with the client's own photos. Beeldbank photos never stand in
// for a client's project: without project photos, use a different showpiece.
// Reduced motion and phones: the composed still, the projects one under the other.
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Item = { image: StruqImage; title: string; meta?: string; href?: string };

export function ProjectStack({ items, label = "Bekijk", className = "" }: { items: Item[]; label?: string; className?: string }) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", el);
      if (cards.length < 2) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(cards.slice(1), { yPercent: 100 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: () => `+=${(cards.length - 1) * 110}%`, pin: true, scrub: 1 },
        });
        cards.slice(1).forEach((card, i) => {
          const below = cards[i];
          tl.to({}, { duration: 0.25 }) // hold on each project
            .to(card, { yPercent: 0, duration: 1, ease: "power2.inOut" })
            .to(below, { scale: 0.9, duration: 1, ease: "power2.inOut" }, "<")
            .to(below.querySelector("[data-veil]"), { opacity: 0.55, duration: 1 }, "<")
            .fromTo(card.querySelector("[data-card-photo]"), { scale: 1.2 }, { scale: 1, duration: 1.2, ease: "power2.out" }, "<");
        });
        tl.to({}, { duration: 0.25 });
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  return (
    <section
      ref={stage}
      data-showpiece="project-stack"
      className={`relative flex flex-col gap-6 bg-ink px-6 py-24 motion-safe:md:block motion-safe:md:h-svh motion-safe:md:overflow-hidden motion-safe:md:p-0 ${className}`}
    >
      {items.map((item, i) => {
        const body = (
          <>
            <div data-card-photo="" className="absolute inset-0">
              <Image src={item.image.src} alt={item.image.alt} fill sizes="100vw" unoptimized={item.image.unoptimized} className="object-cover" />
            </div>
            <div aria-hidden className="absolute inset-0 bg-black opacity-25" />
            <div data-veil="" aria-hidden className="absolute inset-0 bg-black opacity-0" />
            <div className="absolute inset-x-6 bottom-8 flex flex-col gap-2 text-on-photo md:inset-x-[5vw] md:bottom-[8vh] md:flex-row md:items-end md:justify-between">
              <span className="font-display block text-[12vw] leading-[0.9] tracking-[-0.03em] md:text-[9vw]">{item.title}</span>
              {item.meta ? <span className="text-small md:pb-[1.2vw]">{item.meta}</span> : null}
            </div>
          </>
        );
        const cls = "relative block aspect-[4/5] overflow-hidden motion-safe:md:absolute motion-safe:md:inset-0 motion-safe:md:aspect-auto";
        return item.href ? (
          <Link key={item.title} href={item.href} data-card="" data-cursor={label} className={cls} style={{ zIndex: i + 1 }}>
            {body}
          </Link>
        ) : (
          <div key={item.title} data-card="" data-cursor={label} className={cls} style={{ zIndex: i + 1 }}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
