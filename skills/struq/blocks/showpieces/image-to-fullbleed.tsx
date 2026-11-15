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
//
// Each word fits its own column at every width, however long it is (a Dutch compound such as "Vakmanschap"): the
// first paint sizes the pair from the longer word's letter count against its column (half the row on a phone, the
// room beside the small frame on a wide screen), then the script measures both words in the loaded face and sets
// the pair one size down until the longer one fits, again on a resize. Without scripts a word that still overflows
// breaks with a hyphen in the document's language, never past its column. Nothing clips the words, so no descender is
// ever cut.
import Image from "next/image";
import { useRef, type CSSProperties } from "react";
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

/** The share of an em a letter of a display face takes on average: the first paint's estimate, measured after. */
const LETTER_EM = 0.6;

export function ImageToFullbleed({ image, left, right, line, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  // The longer word's width in em, estimated from its letters, for the first paint's fit.
  const letters = Math.max(1, Array.from(left).length, Array.from(right).length) * LETTER_EM;

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
      // The pair one size, set so the longer word fits its column: half the row, less the small frame and a gap on
      // either side of it while the frame waits between the words (data-motion).
      const row = q("[data-name]")[0] as HTMLElement;
      const words = q("[data-left], [data-right]") as HTMLElement[];
      let frame = 0;
      const fit = () => {
        if (!row) return;
        words.forEach((w) => (w.style.fontSize = ""));
        const cs = getComputedStyle(row);
        const inner = row.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        const gap = parseFloat(cs.columnGap) || 0;
        const hole = el.dataset.motion ? el.clientWidth * 0.2 : 0;
        const col = (inner - hole - gap * (hole ? 2 : 1)) / 2;
        let k = 1;
        for (const w of words) {
          w.style.whiteSpace = "nowrap";
          const range = document.createRange();
          range.selectNodeContents(w);
          const width = range.getBoundingClientRect().width;
          w.style.whiteSpace = "";
          if (width > col && col > 0) k = Math.min(k, col / width);
        }
        if (k >= 1) return;
        const size = parseFloat(getComputedStyle(words[0]).fontSize);
        words.forEach((w) => (w.style.fontSize = `${Math.floor(size * k * 10) / 10}px`));
      };
      const later = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(fit);
      };
      fit();
      document.fonts?.ready.then(later);
      window.addEventListener("resize", later);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", later);
        words.forEach((w) => (w.style.fontSize = ""));
        mm.revert();
      };
    },
    { scope: stage },
  );

  // Never larger than the column: half the row on a phone; on a wide screen the room beside the small frame (20vw).
  const word =
    "font-display block min-w-0 break-words hyphens-auto leading-[0.85] tracking-[-0.04em] text-[length:min(18vw,calc((100vw_-_3rem_-_4vw)/2/var(--itf-letters)))] md:text-[length:min(12vw,calc(32vw/var(--itf-letters)))]";

  return (
    <section ref={stage} data-showpiece="image-to-fullbleed" className={`relative h-svh overflow-hidden bg-surface-0 ${className}`}>
      <div data-frame="" className="absolute inset-0 overflow-hidden">
        <div data-photo="" className="absolute inset-0">
          <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
        </div>
        <div data-scrim="" aria-hidden className="absolute inset-0 bg-black opacity-30" />
      </div>
      <div
        data-name=""
        className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between gap-[4vw] px-6 text-on-photo md:px-[4vw] motion-safe:md:text-ink"
        style={{ "--itf-letters": letters.toFixed(2) } as CSSProperties}
      >
        <span data-left="" className={word}>{left}</span>
        <span data-right="" className={`${word} text-right`}>{right}</span>
      </div>
      {line ? (
        <p data-line="" className="font-display text-h2 absolute bottom-[10vh] left-6 right-6 max-w-[18ch] break-words hyphens-auto text-on-photo md:left-[8vw] md:right-[8vw]">
          {line}
        </p>
      ) : null}
    </section>
  );
}
