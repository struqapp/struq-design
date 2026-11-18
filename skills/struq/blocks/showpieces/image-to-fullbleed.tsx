"use client";
// toonstuk-image-to-fullbleed (Struq showpiece recipe)
// A small image in the middle of the ground, the name split to either side of it. As you scroll the stage pins, the
// image unclips to the full viewport and the two words part to the margins, always inside the frame; the opening
// edge overtakes them letter by letter, the photo settles from a push-in, and one closing line rises over it out of
// its mask. Then it holds. Lead for a product launch (with the hero scene) and for a studio portfolio.
//
// <ImageToFullbleed image={images.hero[0]} left="Zout" right="Noord" line="Koken met wat het seizoen geeft." />
//
// Reduced motion and phones: the composed still, the photo full bleed with both words and the line.
//
// The words hold on any photo. They exist twice: once on the ground in the ink, and once inside the photo's frame,
// so the frame's clip cuts that copy exactly and the ink changes on the frame's edge, letter by letter, with no
// blend mode guessing at the photo. The block reads the photo once it loads (kit/photo-read): over the band the words
// sweep and the line's box, it gives the photo copy and the line whichever ink needs the weaker veil to hold 3:1 (the
// palette's light on-photo ink over a veil of the ground held dark, or the darkest ink over a pale veil of the
// on-photo ink), and sets that veil. A photo that reads bare gets no veil; one that cannot be read (another origin)
// keeps the safe veil the markup starts with. The veil settles in while the stage holds on the small frame, before
// the opening edge reaches a word.
//
// Each word fits its own column at every width, however long it is (a Dutch compound such as "Vakmanschap"): the
// first paint sizes the pair from the longer word's letter count against its column (half the row on a phone, the
// room beside the small frame on a wide screen), then the script measures both words in the loaded face and sets
// the pair one size down until the longer one fits, again on a resize. Without scripts a word that still overflows
// breaks with a hyphen in the document's language, never past its column. Nothing clips the words but the frame's
// own edge, so no descender is ever cut and no letter ever leaves the screen.
import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import { feel } from "../kit/feel";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances, type PhotoBox } from "../kit/photo-read";

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
/** Display type over a photo (WCAG large text), with a margin: the photo is read on a small grid. */
const RATIO = 3.2;
/** Past this the photo reads as a dimmed banner. */
const MAX_VEIL = 0.6;
/** The veil under a light ink: the page ground held dark (its own hue, never black). */
const DIM_VEIL = "oklch(from var(--surface-0) min(l, 0.2) c h)";
/** The small frame's clip at the start, in percent of the stage: the frame is 20 percent wide. */
const START = { y: 31, x: 40 };

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encode = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The relative luminance of any CSS colour, through a one-pixel canvas so every colour syntax resolves. */
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

/** The luminance of a colour as the page resolves it (custom properties, relative colours), through a probe. */
function resolvedLuminance(host: HTMLElement, css: string) {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = css;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return luminanceOf(c);
}

/** The weakest veil (composited in sRGB, as the browser does) that brings `under` to RATIO against `ink`. */
function veilFor(under: number, ink: number, veilS: number): number {
  if (contrast(under, ink) >= RATIO) return 0;
  const s = encode(under);
  const ok = (a: number) => contrast(linear(s * (1 - a) + veilS * a), ink) >= RATIO;
  if (!ok(MAX_VEIL)) return MAX_VEIL;
  let lo = 0;
  let hi = MAX_VEIL;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

type Grade = { ink: string; veil: string; opacity: number };

/**
 * Of the light on-photo ink and the darkest ink the page has, the one that needs the weaker veil over what the photo
 * holds under `boxes` (the light ink against the brightest pixels, the dark ink against the darkest). A near tie keeps
 * the light ink. Null when the photo cannot be read.
 */
function gradeOver(img: HTMLImageElement, frame: PhotoBox, boxes: PhotoBox[], host: HTMLElement): Grade | null {
  const ys: number[] = [];
  for (const b of boxes) {
    const r = photoLuminances(img, frame, b);
    if (!r) return null;
    for (const y of r) ys.push(y);
  }
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  const hi = ys[Math.floor((ys.length - 1) * 0.97)];
  const lo = ys[Math.floor((ys.length - 1) * 0.03)];
  const light = resolvedLuminance(host, "var(--on-photo)");
  const dark = ["--ink", "--inverse", "--surface-0"]
    .map((v) => ({ v, y: resolvedLuminance(host, `var(${v})`) }))
    .sort((a, b) => a.y - b.y)[0];
  const forLight = veilFor(hi, light, encode(resolvedLuminance(host, DIM_VEIL)));
  const forDark = veilFor(lo, dark.y, encode(light));
  if (contrast(dark.y, light) >= RATIO && forDark < forLight - 0.04) {
    return { ink: `var(${dark.v})`, veil: "var(--on-photo)", opacity: forDark };
  }
  return { ink: "var(--on-photo)", veil: DIM_VEIL, opacity: forLight };
}

export function ImageToFullbleed({ image, left, right, line, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  // The longer word's width in em, estimated from its letters, for the first paint's fit.
  const letters = Math.max(1, Array.from(left).length, Array.from(right).length) * LETTER_EM;

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const img = el.querySelector<HTMLImageElement>("[data-photo] img");
      const row = q("[data-name='ground']")[0] as HTMLElement;
      const words = q("[data-left], [data-right]") as HTMLElement[];
      const lefts = q("[data-left]") as HTMLElement[];
      const rights = q("[data-right]") as HTMLElement[];

      // The ink and the veil from the photo itself: over the full-width band the words sweep (a push-in only ever
      // shows a part of what the open frame shows there) and the line's box, measured on the open frame.
      const grade = () => {
        if (!img || !row) return;
        const s = el.getBoundingClientRect();
        const band = row.getBoundingClientRect();
        const boxes: PhotoBox[] = [{ x: s.left, y: band.top, w: s.width, h: band.height }];
        const holder = q("[data-line-box]")[0] as HTMLElement | undefined;
        if (holder) {
          const b = holder.getBoundingClientRect();
          boxes.push({ x: b.left, y: b.top, w: b.width, h: b.height });
        }
        const g = gradeOver(img, { x: s.left, y: s.top, w: s.width, h: s.height }, boxes, el);
        if (!g) return;
        el.style.setProperty("--itf-ink", g.ink);
        el.style.setProperty("--itf-veil", g.veil);
        el.style.setProperty("--itf-veil-o", g.opacity.toFixed(3));
      };

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        el.dataset.motion = "1";
        // The clip is driven from two numbers, never tweened as a string: the browser shortens a symmetric
        // inset(31% 40% 31% 40%) to inset(31% 40%), GSAP then pairs two start numbers with four end numbers,
        // and two edges jump open in one frame while the other two slide.
        const frame = q("[data-frame]")[0] as HTMLElement;
        const clip = { ...START };
        const paint = () => {
          frame.style.clipPath = `inset(${clip.y}% ${clip.x}% ${clip.y}% ${clip.x}%)`;
        };
        paint();
        // Where each word starts: beside the small frame, a gap from its edge, then out to its margin. Read from the
        // layout (offsets ignore transforms), so a refresh measures the same place.
        const gap = () => parseFloat(getComputedStyle(row).columnGap) || 0;
        const startL = () => {
          const w = lefts[0];
          return Math.max(0, (el.clientWidth * START.x) / 100 - gap() - (row.offsetLeft + w.offsetLeft + w.offsetWidth));
        };
        const startR = () => {
          const w = rights[0];
          return Math.min(0, (el.clientWidth * (100 - START.x)) / 100 + gap() - (row.offsetLeft + w.offsetLeft));
        };
        gsap.set(q("[data-photo]"), { scale: 1.35 });
        gsap.set(q("[data-line]"), { yPercent: 100 });
        // The durations below are shares of the pinned scroll (scrub), not seconds; the feel sets the smoothing.
        const f = feel(el);
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "+=220%", pin: true, scrub: f.scrub.pinned, invalidateOnRefresh: true },
        });
        // Hold on the small frame while its veil settles in; the words wait beside it.
        tl.fromTo(el, { "--itf-veil-k": 0 }, { "--itf-veil-k": 1, duration: 0.12 })
          .fromTo(lefts, { x: startL }, { x: 0, duration: 1, ease: "power2.inOut" }, ">")
          .fromTo(rights, { x: startR }, { x: 0, duration: 1, ease: "power2.inOut" }, "<")
          .to(clip, { y: 0, x: 0, duration: 1, ease: "power2.inOut", onUpdate: paint }, "<")
          .to(q("[data-photo]"), { scale: 1, duration: 1, ease: "power2.inOut" }, "<")
          .to(q("[data-line]"), { yPercent: 0, duration: 0.45, ease: f.ease.enter }, "-=0.2")
          .to({}, { duration: 0.35 }); // hold on the open frame
        return () => {
          delete el.dataset.motion;
          frame.style.clipPath = "";
          el.style.removeProperty("--itf-veil-k");
        };
      });
      // The pair one size, set so the longer word fits its column: half the row, less the small frame and a gap on
      // either side of it while the frame waits between the words (data-motion). Both copies take the same size.
      let raf = 0;
      const fit = () => {
        if (!row) return;
        words.forEach((w) => (w.style.fontSize = ""));
        const cs = getComputedStyle(row);
        const inner = row.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        const gap = parseFloat(cs.columnGap) || 0;
        const hole = el.dataset.motion ? el.clientWidth * ((100 - 2 * START.x) / 100) : 0;
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
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          fit();
          grade();
        });
      };
      fit();
      // Strict mode runs this twice; a decode that settles after its run was torn down must do nothing.
      let gone = false;
      img
        ?.decode()
        .catch(() => undefined)
        .then(() => {
          if (!gone) later();
        });
      document.fonts?.ready.then(() => {
        if (!gone) later();
      });
      window.addEventListener("resize", later);
      return () => {
        gone = true;
        cancelAnimationFrame(raf);
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
  // The name, laid out once and set twice: on the ground in the ink, and inside the frame in the ink the photo takes.
  const names = (copy: "ground" | "photo") => (
    <div
      data-name={copy}
      aria-hidden={copy === "photo" ? true : undefined}
      className={`pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between gap-[4vw] px-6 md:px-[4vw] ${copy === "ground" ? "text-ink" : ""}`}
      style={{ "--itf-letters": letters.toFixed(2), ...(copy === "photo" ? { color: "var(--itf-ink, var(--on-photo))" } : {}) } as CSSProperties}
    >
      <span data-left="" className={word}>{left}</span>
      <span data-right="" className={`${word} text-right`}>{right}</span>
    </div>
  );

  return (
    <section ref={stage} data-showpiece="image-to-fullbleed" className={`relative h-svh overflow-hidden bg-surface-0 ${className}`}>
      {names("ground")}
      <div data-frame="" className="absolute inset-0 overflow-hidden">
        <div data-photo="" className="absolute inset-0">
          <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
        </div>
        <div
          data-veil=""
          aria-hidden
          className="absolute inset-0"
          style={{ background: `var(--itf-veil, ${DIM_VEIL})`, opacity: "calc(var(--itf-veil-o, 0.5) * var(--itf-veil-k, 1))" }}
        />
        {names("photo")}
      </div>
      {line ? (
        <div data-line-box="" className="absolute bottom-[10vh] left-6 right-6 md:left-[8vw] md:right-[8vw]">
          <span className="struq-line-mask block">
            <p
              data-line=""
              className="font-display text-h2 max-w-[18ch] break-words hyphens-auto"
              style={{ color: "var(--itf-ink, var(--on-photo))" }}
            >
              {line}
            </p>
          </span>
        </div>
      ) : null}
    </section>
  );
}
