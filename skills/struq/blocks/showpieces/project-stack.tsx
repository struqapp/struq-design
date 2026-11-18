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
//
// The names hold on any photo: once a photo loads the block reads it under the name (3:1, display size) and the meta
// (4.5:1, small text), over the band each one crosses while its photo settles from the push-in, and deepens that
// card's veil just as far as the brighter of the two needs (never under the quarter it starts at). A photo that
// cannot be read (another origin) keeps the safe veil the markup starts with.
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { feel } from "../kit/feel";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances, type PhotoBox } from "../kit/photo-read";

type Item = { image: StruqImage; title: string; meta?: string; href?: string };

/** The push-in each next photo settles out of. */
const PUSH = 1.2;
/** The veil every card keeps, and the most it may take before the photo reads as a dimmed banner. */
const MIN_VEIL = 0.25;
const MAX_VEIL = 0.7;

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encode = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The relative luminance of the colour a box is painted in, through a one-pixel canvas. */
function luminanceOf(color: string): number {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return 0.2126 * linear(r / 255) + 0.7152 * linear(g / 255) + 0.0722 * linear(b / 255);
}

/** The weakest black veil (composited in sRGB) that brings `under` to `ratio` against a light `ink`. */
function veilFor(under: number, ink: number, ratio: number): number {
  const ok = (a: number) => contrast(linear(encode(under) * (1 - a)), ink) >= ratio;
  if (ok(MIN_VEIL)) return MIN_VEIL;
  if (!ok(MAX_VEIL)) return MAX_VEIL;
  let lo = MIN_VEIL;
  let hi = MAX_VEIL;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** The brightest pixels (the top 3 percent) of a card's photo across the band a text crosses during the push-in. */
function brightUnder(img: HTMLImageElement, card: DOMRect, text: DOMRect): number | null {
  const cy = card.top + card.height / 2;
  // Under a push-in about the centre, the photo behind a text comes from nearer the centre: read from there down.
  const top = Math.min(text.top, cy + (text.top - cy) / PUSH);
  const band: PhotoBox = { x: card.left, y: top, w: card.width, h: Math.max(1, Math.max(text.bottom, cy + (text.bottom - cy) / PUSH) - top) };
  const ys = photoLuminances(img, { x: card.left, y: card.top, w: card.width, h: card.height }, band);
  return ys ? ys[Math.floor((ys.length - 1) * 0.97)] : null;
}

export function ProjectStack({ items, label = "Bekijk", className = "" }: { items: Item[]; label?: string; className?: string }) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", el);

      // Each card's veil from its own photo: as deep as the name (3:1) and the meta (4.5:1) need, measured at rest.
      const grade = () => {
        for (const card of cards) {
          const img = card.querySelector<HTMLImageElement>("[data-card-photo] img");
          const scrim = card.querySelector<HTMLElement>("[data-scrim]");
          if (!img || !scrim) continue;
          const box = card.getBoundingClientRect();
          const ink = luminanceOf(getComputedStyle(card.querySelector<HTMLElement>("[data-names]") ?? card).color);
          let need = MIN_VEIL;
          // A tenth over 3:1 and 4.5:1: the photo is read on a small grid, the reader sees every pixel.
          for (const [sel, ratio] of [["[data-name]", 3.3], ["[data-meta]", 5]] as const) {
            const text = card.querySelector<HTMLElement>(sel);
            if (!text) continue;
            const bright = brightUnder(img, box, text.getBoundingClientRect());
            if (bright === null) return;
            need = Math.max(need, veilFor(bright, ink, ratio));
          }
          scrim.style.opacity = need.toFixed(3);
        }
      };
      let gone = false;
      let raf = 0;
      const later = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (!gone) grade();
        });
      };
      for (const img of el.querySelectorAll<HTMLImageElement>("[data-card-photo] img")) img.decode().catch(() => undefined).then(later);
      window.addEventListener("resize", later);
      const stop = () => {
        gone = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", later);
      };
      if (cards.length < 2) return stop;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.set(cards.slice(1), { yPercent: 100 });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: () => `+=${(cards.length - 1) * 110}%`, pin: true, scrub: feel(el).scrub.pinned },
        });
        cards.slice(1).forEach((card, i) => {
          const below = cards[i];
          tl.to({}, { duration: 0.25 }) // hold on each project
            .to(card, { yPercent: 0, duration: 1, ease: "power2.inOut" })
            .to(below, { scale: 0.9, duration: 1, ease: "power2.inOut" }, "<")
            .to(below.querySelector("[data-veil]"), { opacity: 0.55, duration: 1 }, "<")
            .fromTo(card.querySelector("[data-card-photo]"), { scale: PUSH }, { scale: 1, duration: 1.2, ease: "power2.out" }, "<");
        });
        tl.to({}, { duration: 0.25 });
      });
      return () => {
        stop();
        mm.revert();
      };
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
            <div data-scrim="" aria-hidden className="absolute inset-0 bg-black opacity-45" />
            <div data-veil="" aria-hidden className="absolute inset-0 bg-black opacity-0" />
            <div data-names="" className="absolute inset-x-6 bottom-8 flex flex-col gap-2 text-on-photo md:inset-x-[5vw] md:bottom-[8vh] md:flex-row md:items-end md:justify-between">
              <span data-name="" className="font-display block text-[12vw] leading-[0.9] tracking-[-0.03em] md:text-[9vw]">{item.title}</span>
              {item.meta ? <span data-meta="" className="text-small md:pb-[1.2vw]">{item.meta}</span> : null}
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
