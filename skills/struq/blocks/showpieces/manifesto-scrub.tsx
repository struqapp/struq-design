"use client";
// toonstuk-manifesto-scrub (Struq showpiece recipe)
// One large statement paragraph that fills word by word as it scrolls through the screen, from a
// faint ink to full ink. Type only: the photos that used to open inside the line were dropped on
// 2026-11-06 (Roy: they read as glitchy), so the statement carries the move on its own.
// Lead for editorial sites; the supporting move for restaurants and hospitality.
//
// <ManifestoScrub text="Wij koken met wat de zee en het land die week geven, en verder niets." />
//
// The faint ink is never too faint to read: the words wait at the weakest strength of the ink that still holds 3:1
// (display-size text) against the ground the section actually has, measured from the palette (about half strength on
// a light ground, a little less on the inverse), and fill to full ink from there.
// The section says its ground to the header bar: data-bar-tone "inverse" when a className sets scene-inverse,
// "ground" otherwise.
//
// Reduced motion and phones: the composed still, the whole paragraph in full ink.
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";

type Props = { text: string; className?: string };

/** Large text: WCAG 3:1. A little over it, so rounding never lands under. */
const WAIT_RATIO = 3.1;

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** A colour's three sRGB channels (0 to 1), through a one-pixel canvas so every colour syntax resolves. */
function channels(css: string): [number, number, number] | null {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}
const luminance = ([r, g, b]: [number, number, number]) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** The weakest opacity of `ink` over `ground` (blended in sRGB, as the browser does) that holds WAIT_RATIO. */
function waitingOpacity(ink: [number, number, number], ground: [number, number, number]) {
  const g = luminance(ground);
  const at = (a: number) => luminance(ink.map((c, i) => c * a + ground[i] * (1 - a)) as [number, number, number]);
  if (contrast(at(1), g) < WAIT_RATIO) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrast(at(mid), g) >= WAIT_RATIO) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi * 100) / 100;
}

export function ManifestoScrub({ text, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  const tone = /(^|\s)scene-inverse(\s|$)/.test(className) ? "inverse" : "ground";

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const words = q("[data-word]");
        const p = q("p")[0] as HTMLElement | undefined;
        const ink = p ? channels(getComputedStyle(p).color) : null;
        const ground = channels(getComputedStyle(el).backgroundColor);
        // 0.5 when the colours cannot be read: enough for 3:1 on every palette the canon ships.
        const wait = ink && ground ? waitingOpacity(ink, ground) : 0.5;
        gsap.set(words, { opacity: wait });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "+=200%", pin: true, scrub: 1 },
        });
        words.forEach((node: Element, i: number) => {
          tl.to(node, { opacity: 1, duration: 0.3 }, i * 0.12);
        });
        tl.to({}, { duration: 0.6 });
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  return (
    <section
      ref={stage}
      data-showpiece="manifesto-scrub"
      data-bar-tone={tone}
      className={`relative flex items-center bg-surface-0 px-6 py-32 md:min-h-svh md:px-[8vw] md:py-0 ${className}`}
    >
      <p className="font-display max-w-[22ch] text-[9vw] leading-[1.02] tracking-[-0.025em] md:text-[5.2vw]">
        {text.split(/(\s+)/).map((w, j) => (w.trim() ? <span key={j} data-word="">{w}</span> : w))}
      </p>
    </section>
  );
}
