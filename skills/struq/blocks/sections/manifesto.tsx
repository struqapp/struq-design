"use client";
// manifesto (Struq section recipe)
// The studio's statement, two to four sentences, set as the page's moment of conviction. Three ways to set it:
//
// - writes: the section holds still and the statement writes itself in, line by line, as the reader scrolls. Each line
//   opens left to right behind a thin accent caret that rides its leading edge; the next line starts where the last
//   one ends, at the same speed (a line's share of the scroll is its own width). The finished statement then holds
//   for a beat of scroll, the caret gone and the signature risen under it, before the page moves on.
// - quote: one sentence of the statement as a pull quote over a full-bleed photograph, at display size and a light
//   weight, on the photo's measured calm side. The photograph drifts slowly inside its frame with the scroll (a layer
//   larger than the frame, moved in whole pixels), the quote's lines rise through their masks and the attribution
//   lands with the last of them. The veil is read line by line under the quote; a photo that needs more than the cap
//   on both sides is reported in development (pick another), never covered by a heavier veil.
// - split: a short pin. The first half of the statement stands large on the left; as the reader scrolls, the second
//   half arrives on the right one sentence at a time, each one rising through its line masks under the one before,
//   while the left stays. The pin ends on the whole statement in two columns. Scrolling back runs every step backwards.
//
// <Manifesto variant="writes" sentences={["We bouwen voor wie er straks woont, niet voor de foto.", "..."]}
//   by="Sanne Verhoef, oprichter van Noord" />
// <Manifesto variant="quote" sentences={[...]} quote={1} image={images.hero[1]} by="..." />
//
// Every move is scrubbed to the scroll (a fast flick never stacks states, going back reverses), transforms are
// written in whole pixels and every clip from plain numbers. Lines are cut with the face they are read in: the cut
// waits for the fonts (capped), and SplitText cuts again when a face lands (loadingdone) or the width changes, after
// which the block measures again and the pins are refreshed. The photograph is decoded before any of it shows; until
// then the frame is the dark of its own veil, so the light quote reads from the first frame.
//
// Start states wait behind the `.js` / `.sq-js` gate and a 3 s CSS fallback (blocks.css, "--- manifesto ---"), so a
// page whose scripts never run still shows the composed statement. Reduced motion: the composed statement, no pin, no
// caret, no drift. Phones: the same moves, split stacks its
// two halves in one column.
import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances, type PhotoBox } from "../kit/photo-read";

export const MANIFESTO_VARIANTS = [
  { id: "writes", title: "Schrift" },
  { id: "quote", title: "Citaat" },
  { id: "split", title: "Tweeluik" },
] as const;

export type ManifestoVariant = (typeof MANIFESTO_VARIANTS)[number]["id"];

type Props = {
  variant?: ManifestoVariant;
  /** The statement, two to four sentences, one per entry. Plain text. */
  sentences: string[];
  /** Who says it: a name and a role at the studio. The signature (writes, split) or the attribution (quote). */
  by?: string;
  /** quote: the photograph the quote stands on. */
  image?: StruqImage;
  /** quote: which sentence becomes the pull quote (its index). The shortest reads best. */
  quote?: number;
  /** quote: where the quote stands. Left out, the block reads the photo and takes the side that needs the weaker veil. */
  side?: "left" | "right";
  /** split: how many sentences stand on the left. Left out, the first half (rounded down, at least one). */
  lead?: number;
  className?: string;
};

/** Seconds of smoothing on the rises and swaps: a camera settling, never a delay. */
const SMOOTH = 0.4;
/** The writing follows the reader more closely: the caret is where the eye is. */
const WRITE_SMOOTH = 0.25;
/** The longest a line cut waits for the display face, in ms. */
const FONT_CAP = 1200;
/** A line travels this share of its own height to its place. */
const RISE = 1.12;
/** The soft rise of a signature or an attribution, in px. */
const SOFT = 18;
/** writes: screens of scroll a line as wide as the measure takes to write, and the beat the finished statement holds. */
const PER_LINE = 0.3;
const HOLD = 0.5;
/** writes: the caret's share of the line height. */
const CARET = 0.74;
/** quote: the share of the frame's height the photo layer reaches past it, above and below (its drift). */
const DRIFT = 0.08;
/** quote: display type holds 3:1, the small attribution 4.5:1; the veil never passes MAX_VEIL. */
const QUOTE_RATIO = 3;
const SMALL_RATIO = 4.5;
const MAX_VEIL = 0.45;
/** split: the pin, in screens. */
const PIN = 1.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Where p sits inside the window [from, to], as 0 to 1. */
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out2 = gsap.parseEase("power2.out");
const out3 = gsap.parseEase("power3.out");

/** Staggered windows for n items inside 0 to 1: each runs `span`, the last one ends at 1. */
function windows(n: number, span: number) {
  if (n <= 1) return [[0, 1]];
  const step = (1 - span) / (n - 1);
  return Array.from({ length: n }, (_, i) => [i * step, i * step + span]);
}

/** The display face, waited for at most FONT_CAP ms. */
function faceReady() {
  const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
  return Promise.race([fonts ?? Promise.resolve(), new Promise((res) => window.setTimeout(res, FONT_CAP))]);
}

/** Resolves once the photograph is loaded and decoded (or failed), never before. */
function decoded(img: HTMLImageElement) {
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise<void>((res) => {
        img.addEventListener("load", () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      });
  return loaded.then(() => img.decode()).catch(() => undefined);
}

const setY = (node: HTMLElement, px: number) => {
  node.style.transform = `translate3d(0, ${Math.round(px)}px, 0)`;
};

// Contrast, for the quote over its photograph.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const ratioOf = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The relative luminance of a resolved CSS colour, through a one-pixel canvas so any colour syntax reads. */
function luminance(color: string) {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return 0.2126 * toLinear(r / 255) + 0.7152 * toLinear(g / 255) + 0.0722 * toLinear(b / 255);
}

/**
 * The weakest veil (composited in sRGB) that brings `under` to `target` against `ink`. Never past MAX_VEIL: when even
 * the cap does not hold it returns Infinity, so the caller knows this photo cannot carry the quote there.
 */
function weakestVeil(under: number, ink: number, veilSrgb: number, target: number) {
  if (ratioOf(under, ink) >= target) return 0;
  const s = toSrgb(under);
  const holds = (a: number) => ratioOf(toLinear(s * (1 - a) + veilSrgb * a), ink) >= target;
  if (!holds(MAX_VEIL)) return Infinity;
  let lo = 0;
  let hi = MAX_VEIL;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (holds(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** The box a run of text actually covers: its glyphs' width, over the height of the untransformed element holding it. */
function inkBox(node: HTMLElement): PhotoBox {
  const range = document.createRange();
  range.selectNodeContents(node);
  const t = range.getBoundingClientRect();
  const own = node.getBoundingClientRect();
  return { x: t.left, y: own.top, w: t.width, h: own.height };
}

/** The bright end (the top tenth) of the photo under a box, or null when it cannot be read. */
function brightUnder(img: HTMLImageElement, frame: PhotoBox, at: PhotoBox) {
  const ys = photoLuminances(img, frame, at);
  return ys ? ys[Math.floor(ys.length * 0.9)] : null;
}

// --- writes ---------------------------------------------------------------------------------------------------------

function runWrites(el: HTMLElement, reduce: boolean) {
  const text = el.querySelector<HTMLElement>("[data-mf-text]");
  const wrap = el.querySelector<HTMLElement>("[data-mf-wrap]");
  const caret = el.querySelector<HTMLElement>("[data-mf-caret]");
  const soft = el.querySelector<HTMLElement>("[data-mf-soft]");
  if (!text || !wrap || !caret) return;
  if (reduce) {
    el.dataset.ready = "1";
    return;
  }

  let alive = true;
  let split: SplitText | null = null;
  let lines: HTMLElement[] = [];
  // Per line: where its text starts inside the wrap (x, y), where it starts inside its own box (left), its text width,
  // its box width and its height.
  let m: { x: number; y: number; left: number; w: number; box: number; h: number }[] = [];
  // The statement's total text width, in measures (wrap widths): what the pin's length is made of.
  let span = 0;
  const prog = { p: 0 };

  const measure = () => {
    const wr = wrap.getBoundingClientRect();
    m = lines.map((line) => {
      const lb = line.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(line);
      const tr = range.getBoundingClientRect();
      return { x: tr.left - wr.left, y: lb.top - wr.top, left: tr.left - lb.left, w: tr.width, box: lb.width, h: lb.height };
    });
    span = m.reduce((a, l) => a + l.w, 0) / (wr.width || 1);
  };

  const paint = () => {
    if (!alive || !m.length) return;
    const write = (span * PER_LINE) / (span * PER_LINE + HOLD);
    const total = m.reduce((a, l) => a + l.w, 0) || 1;
    const P = prog.p;
    let acc = 0;
    let at = m[0];
    let reveal = 0;
    m.forEach((l, i) => {
      const from = (write * acc) / total;
      acc += l.w;
      const to = (write * acc) / total;
      const p = within(P, from, to);
      const r = p * l.w;
      // The clip reaches a whole line past every edge it is not drawing, so ascents, accents, descents and an italic's
      // overhang show at any leading (they need up to 0.35em; a line is at least 0.82em).
      const pad = Math.round(l.h);
      const right = p <= 0 ? l.box + pad : p >= 1 ? -pad : l.box - l.left - r;
      lines[i].style.clipPath = `inset(${-pad}px ${right.toFixed(1)}px ${-pad}px ${-pad}px)`;
      if (P >= from) {
        at = l;
        reveal = r;
      }
    });
    const ch = Math.round(at.h * CARET);
    caret.style.height = `${ch}px`;
    // The caret rides 3 px ahead of the clip's edge, so it never stands flush against a half-cut glyph.
    caret.style.transform = `translate3d(${Math.round(at.x + reveal + 3)}px, ${Math.round(at.y + (at.h - ch) / 2)}px, 0)`;
    caret.style.opacity = Math.min(within(P, 0, 0.01), 1 - within(P, write, write + 0.05)).toFixed(3);
    if (soft) {
      const e = out2(within(P, write, write + (1 - write) * 0.55));
      soft.style.opacity = e.toFixed(3);
      setY(soft, (1 - e) * SOFT);
    }
  };

  gsap.to(prog, {
    p: 1,
    ease: "none",
    onUpdate: paint,
    scrollTrigger: {
      trigger: el,
      start: "top top",
      // The pin is as long as the writing (each line its own width's share) plus the beat it holds.
      end: () => `+=${Math.round((span * PER_LINE + HOLD) * window.innerHeight)}`,
      pin: true,
      scrub: WRITE_SMOOTH,
      onRefresh: () => {
        measure();
        paint();
      },
    },
  });

  // The statement is cut with the face it is read in. Every line's clip is shut before the gate lifts; a later cut
  // (a face landing, a new width) measures again and refreshes the pin's length.
  faceReady().then(() => {
    if (!alive) return;
    split = SplitText.create(text, {
      type: "lines",
      linesClass: "struq-line",
      autoSplit: true,
      onSplit(self) {
        lines = self.lines as HTMLElement[];
        measure();
        paint();
        requestAnimationFrame(() => {
          if (alive) ScrollTrigger.refresh();
        });
      },
    });
    el.dataset.ready = "1";
  });

  return () => {
    alive = false;
    split?.revert();
    caret.style.cssText = "";
    if (soft) soft.style.cssText = "";
  };
}

// --- quote ----------------------------------------------------------------------------------------------------------

function runQuote(el: HTMLElement, reduce: boolean, fixedSide: "left" | "right" | undefined) {
  const frame = el.querySelector<HTMLElement>("[data-mf-frame]");
  const layer = el.querySelector<HTMLElement>("[data-mf-layer]");
  const veil = el.querySelector<HTMLElement>("[data-mf-veil]");
  const text = el.querySelector<HTMLElement>("[data-mf-text]");
  const soft = el.querySelector<HTMLElement>("[data-mf-soft]");
  const img = layer?.querySelector("img") ?? null;
  if (!frame || !layer || !veil || !text) return;

  let alive = true;
  let split: SplitText | null = null;
  let lines: HTMLElement[] = [];
  let heights: number[] = [];
  let reach = 0;
  let drift = 0.5;
  let read = false;
  const prog = { type: 0 };
  const gate = { v: 0 };

  const measure = () => {
    reach = Math.max(0, Math.round(frame.offsetHeight * DRIFT) - 1);
    heights = lines.map((l) => l.offsetHeight);
  };

  const paint = () => {
    if (!alive) return;
    layer.style.opacity = gate.v.toFixed(3);
    if (reduce) return;
    setY(layer, (drift - 0.5) * 2 * reach);
    const spans = windows(lines.length, 0.62);
    lines.forEach((line, i) => {
      const e = out3(within(prog.type, spans[i][0], spans[i][1]));
      setY(line, (1 - e) * (heights[i] ?? 0) * RISE);
    });
    if (soft) {
      // The attribution rides the quote's own scrub, its last 40%, so it lands with the quote's last line.
      const e = out2(within(prog.type, 0.6, 1));
      soft.style.opacity = e.toFixed(3);
      setY(soft, (1 - e) * SOFT);
    }
  };

  /**
   * The veil from the photo itself: the weakest that gives the quote 3:1 and the attribution 4.5:1 over what is under
   * their glyphs, never past MAX_VEIL. Once the quote is cut, every line is read where it stands (its mask, which never
   * moves, over its own glyphs' width), so one line on a bright patch is not averaged away by the others. Unless the
   * side was given, and only while the quote is still under its masks, the quote also takes whichever side needs the
   * weaker veil (the photo's own calm side keeps a tie).
   */
  const grade = () => {
    if (!img || !alive) return;
    const ink = luminance(getComputedStyle(text).color);
    const veilSrgb = toSrgb(luminance(getComputedStyle(veil).backgroundColor));
    const need = () => {
      const lr = layer.getBoundingClientRect();
      const fb = { x: lr.left, y: lr.top, w: lr.width, h: lr.height };
      const boxes = lines.length
        ? lines.map((line) => {
            const t = inkBox(line);
            const mask = (line.parentElement ?? line).getBoundingClientRect();
            return { x: t.x, y: mask.top, w: t.w, h: mask.height };
          })
        : [inkBox(text)];
      let n = 0;
      for (const box of boxes) {
        const q = brightUnder(img, fb, box);
        if (q === null) return null;
        n = Math.max(n, weakestVeil(q, ink, veilSrgb, QUOTE_RATIO));
      }
      if (soft) {
        const s = brightUnder(img, fb, inkBox(soft));
        if (s !== null) n = Math.max(n, weakestVeil(s, ink, veilSrgb, SMALL_RATIO));
      }
      return n;
    };
    let n = need();
    if (n === null) return;
    if (!fixedSide && !reduce && prog.type === 0) {
      const was = el.dataset.side;
      el.dataset.side = was === "right" ? "left" : "right";
      const other = need();
      if (other !== null && other < n - 0.02) n = other;
      else el.dataset.side = was;
    }
    if (n > MAX_VEIL && process.env.NODE_ENV !== "production") {
      console.warn(
        `manifesto quote: this photograph cannot carry the quote at ${QUOTE_RATIO}:1 on either side within the ${MAX_VEIL} veil. Pick a calmer photo or another crop.`,
        img.currentSrc || img.src,
      );
    }
    veil.style.opacity = Math.min(n, MAX_VEIL).toFixed(3);
  };

  if (!reduce) {
    // The drift follows the scroll directly (the page's own smooth scroll is the only smoothing), from the frame's top
    // entering the screen to its bottom leaving it.
    ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        drift = self.progress;
        paint();
      },
    });
    gsap.to(prog, {
      type: 1,
      ease: "none",
      onUpdate: paint,
      scrollTrigger: { trigger: text, start: "top 96%", end: "top 60%", scrub: SMOOTH },
    });
  }
  const onRefresh = () => {
    measure();
    paint();
    if (read) grade();
  };
  ScrollTrigger.addEventListener("refresh", onRefresh);
  // Reduced motion has no start state in the CSS: a photograph the browser already shows stays shown.
  if (reduce && img?.complete && img.naturalWidth) gate.v = 1;
  measure();
  paint();

  // The photograph is decoded before any of it shows, and read with the quote set in its real face.
  if (img) {
    img.loading = "eager";
    Promise.all([decoded(img), faceReady()]).then(() => {
      if (!alive) return;
      read = true;
      grade();
      gsap.to(gate, { v: 1, duration: reduce ? 0.3 : 0.5, ease: "power2.out", onUpdate: paint });
    });
  } else {
    gate.v = 1;
    paint();
  }

  if (reduce) {
    el.dataset.ready = "1";
  } else {
    faceReady().then(() => {
      if (!alive) return;
      split = SplitText.create(text, {
        type: "lines",
        mask: "lines",
        linesClass: "struq-line",
        autoSplit: true,
        onSplit(self) {
          lines = self.lines as HTMLElement[];
          measure();
          paint();
          // The veil is read again line by line, now that the lines stand where they will be read.
          if (read) grade();
        },
      });
      el.dataset.ready = "1";
    });
  }

  return () => {
    alive = false;
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    gsap.killTweensOf(gate);
    split?.revert();
    layer.style.cssText = "";
    veil.style.opacity = "";
    if (soft) soft.style.cssText = "";
  };
}

// --- split ----------------------------------------------------------------------------------------------------------

function runSplit(el: HTMLElement, reduce: boolean) {
  const left = el.querySelector<HTMLElement>("[data-mf-left]");
  const swaps = Array.from(el.querySelectorAll<HTMLElement>("[data-mf-swap]"));
  const soft = el.querySelector<HTMLElement>("[data-mf-soft]");
  if (!left) return;
  if (reduce) {
    el.dataset.ready = "1";
    return;
  }

  let alive = true;
  const splits: SplitText[] = [];
  let leftLines: HTMLElement[] = [];
  let leftH: number[] = [];
  const swapLines: HTMLElement[][] = swaps.map(() => []);
  const swapH: number[][] = swaps.map(() => []);
  const prog = { left: 0, s: 0 };

  const paint = () => {
    if (!alive) return;
    const ls = windows(leftLines.length, 0.6);
    leftLines.forEach((line, i) => {
      const e = out3(within(prog.left, ls[i][0], ls[i][1]));
      setY(line, (1 - e) * (leftH[i] ?? 0) * RISE);
    });
    if (soft) {
      const e = out2(within(prog.left, 0.45, 1));
      soft.style.opacity = e.toFixed(3);
      setY(soft, (1 - e) * SOFT);
    }
    // The pin in segments, one per sentence on the right: each segment opens with its sentence rising into its masks
    // under the one before (which stays), then holds; the last tenth and a half is the whole statement, composed.
    const n = swaps.length;
    const seg = 0.85 / Math.max(1, n);
    const move = seg * 0.62;
    swapLines.forEach((ls2, j) => {
      const start = j * seg;
      const inP = within(prog.s, start, start + move);
      const ws = windows(ls2.length, 0.7);
      ls2.forEach((line, i) => {
        const e = out3(within(inP, ws[i][0], ws[i][1]));
        setY(line, (1 - e) * (swapH[j][i] ?? 0) * RISE);
      });
    });
  };

  gsap.to(prog, {
    left: 1,
    ease: "none",
    onUpdate: paint,
    scrollTrigger: { trigger: el, start: "top 82%", end: "top 16%", scrub: SMOOTH },
  });
  gsap.to(prog, {
    s: 1,
    ease: "none",
    onUpdate: paint,
    scrollTrigger: { trigger: el, start: "top top", end: () => `+=${Math.round(PIN * window.innerHeight)}`, pin: true, scrub: SMOOTH },
  });

  const cut = (node: HTMLElement, done: (lines: HTMLElement[], heights: number[]) => void) =>
    SplitText.create(node, {
      type: "lines",
      mask: "lines",
      linesClass: "struq-line",
      autoSplit: true,
      onSplit(self) {
        const lines = self.lines as HTMLElement[];
        done(
          lines,
          lines.map((l) => l.offsetHeight),
        );
        paint();
      },
    });

  faceReady().then(() => {
    if (!alive) return;
    splits.push(
      cut(left, (l, h) => {
        leftLines = l;
        leftH = h;
      }),
    );
    swaps.forEach((node, j) =>
      splits.push(
        cut(node, (l, h) => {
          swapLines[j] = l;
          swapH[j] = h;
        }),
      ),
    );
    el.dataset.ready = "1";
  });

  return () => {
    alive = false;
    for (const s of splits) s.revert();
    if (soft) soft.style.cssText = "";
  };
}

// --- the block ------------------------------------------------------------------------------------------------------

export function Manifesto({ variant = "writes", sentences, by, image, quote = 0, side, lead, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      // A conditions object only runs while one of them matches, so both sides of the query are named.
      mm.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { reduce } = ctx.conditions as { reduce: boolean };
        if (variant === "quote") return runQuote(el, reduce, side);
        if (variant === "split") return runSplit(el, reduce);
        return runWrites(el, reduce);
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [variant, side] },
  );

  if (variant === "quote") {
    const first = side ?? (image?.negativeSpace === "right" ? "right" : "left");
    const said = sentences[Math.min(Math.max(0, quote), sentences.length - 1)] ?? "";
    return (
      <section
        ref={root}
        data-manifesto="quote"
        data-side={first}
        suppressHydrationWarning
        className={`group/mf relative flex min-h-[max(100svh,36rem)] items-end overflow-hidden text-on-photo md:min-h-[max(100svh,40rem)] ${className}`}
      >
        <div data-mf-frame="" className="absolute inset-0 overflow-hidden">
          {/* The photograph sits on a layer larger than its frame, so its drift never shows an edge. */}
          <div data-mf-layer="" className="absolute inset-x-0 -bottom-[8%] -top-[8%]">
            {image ? (
              <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
            ) : null}
          </div>
          <div data-mf-veil="" aria-hidden="true" className="absolute inset-0" />
        </div>
        <figure className="relative w-full px-6 pb-[9svh] md:px-[4vw] md:pb-[11svh]">
          <div className="max-w-[16ch] text-[clamp(2.25rem,0.9rem+4.4vw,6.25rem)] group-data-[side=right]/mf:md:ml-auto">
            <blockquote>
              <p data-mf-text="" className="font-display leading-[1.03] tracking-[-0.022em]">
                {`“${said}”`}
              </p>
            </blockquote>
            {by ? (
              <figcaption data-mf-soft="" className="mt-8 text-small md:mt-10">
                {by}
              </figcaption>
            ) : null}
          </div>
        </figure>
      </section>
    );
  }

  if (variant === "split") {
    const n = Math.min(Math.max(1, lead ?? Math.floor(sentences.length / 2)), Math.max(1, sentences.length - 1));
    const first = sentences.slice(0, n).join(" ");
    const rest = sentences.slice(n);
    return (
      <section
        ref={root}
        data-manifesto="split"
        className={`relative flex min-h-svh flex-col justify-center bg-surface-0 px-6 py-[12svh] text-ink md:h-svh md:min-h-[36rem] md:px-[4vw] md:py-[10svh] ${className}`}
      >
        {/* The signature closes the statement: under the right half on phones, under the left one on wide screens, where
            the right half stands on the left half's last line. */}
        <div className="grid gap-y-12 md:grid-cols-12 md:items-end md:gap-x-[2vw]">
          <p
            data-mf-text=""
            data-mf-left=""
            className="font-display max-w-[14ch] text-[clamp(2.5rem,min(1rem+4.6vw,10svh),6.25rem)] leading-[1.02] tracking-[-0.025em] md:col-span-7 md:row-start-1"
          >
            {first}
          </p>
          <div data-mf-right="" className="grid gap-6 md:col-span-4 md:col-start-9 md:row-start-1">
            {rest.map((s, i) => (
              <p
                key={i}
                data-mf-text=""
                data-mf-swap=""
                className="font-display max-w-[20ch] self-end text-[clamp(1.5rem,0.95rem+1.5vw,2.75rem)] leading-[1.14] tracking-[-0.012em]"
              >
                {s}
              </p>
            ))}
          </div>
          {by ? (
            <p data-mf-soft="" className="text-small text-ink-muted md:col-span-7 md:row-start-2">
              {by}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={root}
      data-manifesto="writes"
      className={`relative flex h-svh min-h-[30rem] items-center bg-surface-0 px-6 text-ink md:px-[8vw] ${className}`}
    >
      <div className="w-full">
        <div data-mf-wrap="" className="relative">
          <p
            data-mf-text=""
            className="font-display max-w-[22ch] text-[clamp(2rem,min(1rem+3.4vw,7.6svh),4.75rem)] leading-[1.1] tracking-[-0.02em]"
          >
            {sentences.join(" ")}
          </p>
          <span data-mf-caret="" aria-hidden="true" className="pointer-events-none absolute left-0 top-0 block w-[2px] bg-accent" />
        </div>
        {by ? (
          <p data-mf-soft="" className="mt-10 text-small text-ink-muted md:mt-14">
            {by}
          </p>
        ) : null}
      </div>
    </section>
  );
}
