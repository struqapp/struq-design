"use client";
// reveals (Struq section recipe)
// How a section enters as you scroll. The section itself stays plain and editorial (a statement of two or three
// lines, a short paragraph, one photograph, one text link) so the entrance is what carries it. Three entrances:
//
// - lines: the statement's lines rise through their masks one after another as the section arrives, the paragraph
//   and the link follow in a softer rise, and then the photograph opens from its bottom edge while it settles a
//   little upward inside its frame.
// - clip: the photograph leads. It opens by registration from a thin horizontal slit in its own final frame (a layer
//   already at full size whose clip opens, never a scale), and the type rises beside it once it is half open.
// - card: the whole section slides up over the one before it like a card laid on a table, a hairline shadow on its top
//   edge; the section underneath dims and falls behind (it moves at half the scroll's speed) as it is covered, and the
//   content settles into the card as it lands.
//
// <Reveals variant="lines" statement="Een huis begint bij het licht dat er al is." text="..." image={images.column[0]}
//   link={{ href: "#studio", label: "Over de studio" }} />
//
// Every entrance is scrubbed to the scroll over a short stretch with 0.4 s of smoothing: a fast flick never stacks
// states, scrolling back runs it backwards, and nothing is a timed tween fired by a toggle. Transforms are written in
// whole pixels and every clip from plain numbers. The photograph is decoded before any of it can show; until then its
// clip stays shut. The statement is cut into lines with the display face it is read in (the cut waits for the fonts,
// capped, and SplitText cuts again when a face lands or the width changes).
//
// Start states wait behind the `.js` / `.sq-js` gate and a 3 s CSS fallback (blocks.css, "--- reveals ---"), so a
// page whose scripts never run still shows the composed section. Reduced motion: the composed section, no travel.
// The card variant takes the element before it as the section it covers; that one is held only when it is at least a
// screen tall, so a short one never opens a gap above itself.
import Image from "next/image";
import { useId, useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

export const REVEALS_VARIANTS = [
  { id: "lines", title: "Regels" },
  { id: "clip", title: "Spleet" },
  { id: "card", title: "Kaart" },
] as const;

export type RevealsVariant = (typeof REVEALS_VARIANTS)[number]["id"];

type Props = {
  variant?: RevealsVariant;
  /** The statement: one sentence that sets in two or three lines. Plain text. */
  statement: string;
  /** A short paragraph, two sentences. */
  text: string;
  image: StruqImage;
  link: { href: string; label: string };
  className?: string;
};

/** Seconds of smoothing on every scrub: a camera settling, never a delay. */
const SMOOTH = 0.4;
/** The longest the line cut waits for the display face, in ms. */
const FONT_CAP = 1200;
/** A line travels this share of its own height to its place. */
const RISE = 1.12;
/** The soft rise of the paragraph and the link, in px. */
const SOFT = 28;
/** The clip variant's slit: the share of the frame shut above and below it, and at each side. */
const SLIT_Y = 49.6;
const SLIT_X = 7;
/** The card variant: how dark the covered section gets, and the share of the scroll it still follows. */
/** How far the covered section dims under the card: lighter on paper (or it turns to a grey slab), deeper on a dark
 * ground (or it does not show at all). */
const dimFor = (el: HTMLElement) => {
  const g = getComputedStyle(el).getPropertyValue("--surface-0").trim();
  if (!/^#[0-9a-f]{6}$/i.test(g)) return 0.22;
  const ch = (i: number) => parseInt(g.slice(i, i + 2), 16);
  return ch(1) * 0.299 + ch(3) * 0.587 + ch(5) * 0.114 < 128 ? 0.5 : 0.22;
};
const HOLD = 0.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Where p sits inside the window [from, to], as 0 to 1. */
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out3 = gsap.parseEase("power3.out");
const inOut2 = gsap.parseEase("power2.inOut");
const inOut3 = gsap.parseEase("power3.inOut");
const out2 = gsap.parseEase("power2.out");

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

/** The display face, waited for at most FONT_CAP ms. */
function faceReady() {
  const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
  return Promise.race([fonts ?? Promise.resolve(), new Promise((res) => window.setTimeout(res, FONT_CAP))]);
}

/** Staggered windows for n items inside 0 to 1: each runs `span`, the last one ends at 1. */
function windows(n: number, span: number) {
  if (n <= 1) return [[0, 1]];
  const step = (1 - span) / (n - 1);
  return Array.from({ length: n }, (_, i) => [i * step, i * step + span]);
}

export function Reveals({ variant = "lines", statement, text, image, link, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const titleId = useId();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const head = el.querySelector<HTMLElement>("[data-rv-type]");
      const copy = el.querySelector<HTMLElement>("[data-rv-copy]");
      const softs = Array.from(el.querySelectorAll<HTMLElement>("[data-rv-soft]"));
      const settles = Array.from(el.querySelectorAll<HTMLElement>("[data-rv-settle]"));
      const frame = el.querySelector<HTMLElement>("[data-rv-frame]");
      const pic = el.querySelector<HTMLElement>("[data-rv-pic]");
      const img = frame?.querySelector<HTMLImageElement>("img") ?? null;
      const shade = el.querySelector<HTMLElement>("[data-rv-shade]");
      const kind = (el.dataset.reveals ?? "lines") as RevealsVariant;
      const dim = dimFor(el);

      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 768px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { wide, reduce } = ctx.conditions as { wide: boolean; reduce: boolean };
        // Reduced motion: the composed section as it stands; the CSS start states only apply with motion.
        if (reduce) {
          el.dataset.ready = "1";
          return;
        }

        let alive = true;
        let split: SplitText | null = null;
        let lines: HTMLElement[] = [];
        let heights: number[] = [];

        // Progress of each scrubbed stretch, 0 to 1, and the photograph's decode gate (0 until it is decoded).
        const prog = { type: 0, soft: 0, photo: 0, slide: 0 };
        const settle = settles.map(() => ({ p: 0 }));
        const gate = { v: 0 };

        // The card variant's covered section and the measures it needs, taken again on every refresh.
        const prev = kind === "card" ? (el.previousElementSibling as HTMLElement | null) : null;
        const prevTransform = prev?.style.transform ?? "";
        let vh = window.innerHeight;
        let hold = 0;
        let frameH = frame?.offsetHeight ?? 0;
        const measure = () => {
          vh = window.innerHeight;
          hold = prev && prev.offsetHeight >= vh ? HOLD : 0;
          frameH = frame?.offsetHeight ?? 0;
        };
        measure();

        const paintType = () => {
          const spans = windows(lines.length, 0.62);
          lines.forEach((line, i) => {
            const e = out3(within(prog.type, spans[i][0], spans[i][1]));
            line.style.transform = `translate3d(0, ${Math.round((1 - e) * (heights[i] ?? 0) * RISE)}px, 0)`;
          });
        };

        const paintSoft = () => {
          const spans = windows(softs.length, 0.78);
          softs.forEach((s, i) => {
            const e = out2(within(prog.soft, spans[i][0], spans[i][1]));
            s.style.transform = `translate3d(0, ${Math.round((1 - e) * SOFT)}px, 0)`;
            s.style.opacity = e.toFixed(3);
          });
        };

        const paintPhoto = () => {
          if (!frame) return;
          const p = prog.photo * gate.v;
          if (kind === "lines") {
            const e = inOut2(p);
            frame.style.clipPath = `inset(${((1 - e) * 100).toFixed(3)}% 0% 0% 0%)`;
            if (pic) pic.style.transform = `translate3d(0, ${Math.round((1 - out3(p)) * frameH * 0.08)}px, 0)`;
          } else if (kind === "clip") {
            const y = SLIT_Y * (1 - inOut3(p));
            const x = SLIT_X * (1 - out2(within(p, 0, 0.7)));
            frame.style.clipPath = `inset(${y.toFixed(3)}% ${x.toFixed(3)}% ${y.toFixed(3)}% ${x.toFixed(3)}%)`;
          } else if (pic) {
            pic.style.opacity = gate.v.toFixed(3);
          }
        };

        const paintSlide = () => {
          if (shade) shade.style.opacity = (dim * out2(prog.slide)).toFixed(3);
          if (prev) prev.style.transform = hold ? `translate3d(0, ${Math.round(prog.slide * hold * vh)}px, 0)` : prevTransform;
        };

        const paintSettle = () => {
          // On wide screens every settle shares the card's landing, staggered; on phones each has its own stretch.
          const spans = wide ? windows(settles.length, 0.7) : settles.map(() => [0, 1]);
          settles.forEach((s, i) => {
            const e = out3(within(settle[i].p, spans[i][0], spans[i][1]));
            s.style.transform = `translate3d(0, ${Math.round((1 - e) * (40 + 20 * i))}px, 0)`;
            s.style.opacity = e.toFixed(3);
          });
        };

        const paint = () => {
          if (!alive) return;
          if (kind !== "card") {
            paintType();
            paintSoft();
          } else {
            paintSlide();
            paintSettle();
          }
          paintPhoto();
        };

        const scrub = (target: object, vars: gsap.TweenVars, trigger: Element | null, start: string, end: string) => {
          if (!trigger) return;
          gsap.to(target, { ...vars, ease: "none", onUpdate: paint, scrollTrigger: { trigger, start, end, scrub: SMOOTH } });
        };

        if (kind === "lines") {
          scrub(prog, { type: 1 }, head, "top 88%", "top 50%");
          scrub(prog, { soft: 1 }, copy, "top 94%", "top 64%");
          // The photograph starts opening from its bottom edge just before that edge is on screen, so it overlaps the
          // paragraph rising instead of waiting for the type to land.
          scrub(prog, { photo: 1 }, frame, "bottom 108%", "bottom 58%");
        } else if (kind === "clip") {
          scrub(prog, { photo: 1 }, frame, "center 92%", "center 48%");
          if (wide) {
            // Beside the photograph: the type takes its cue from the frame, so it rises once the slit is half open.
            scrub(prog, { type: 1 }, frame, "center 70%", "center 36%");
            scrub(prog, { soft: 1 }, frame, "center 62%", "center 28%");
          } else {
            scrub(prog, { type: 1 }, head, "top 90%", "top 58%");
            scrub(prog, { soft: 1 }, copy, "top 94%", "top 66%");
          }
        } else {
          scrub(prog, { slide: 1 }, el, "top bottom", "top top");
          settles.forEach((s, i) => {
            if (wide) scrub(settle[i], { p: 1 }, el, "top 55%", "top top");
            else scrub(settle[i], { p: 1 }, s, "top 96%", "top 68%");
          });
        }
        if (prev && hold) prev.style.willChange = "transform";
        const remeasure = () => {
          measure();
          paint();
        };
        ScrollTrigger.addEventListener("refresh", remeasure);

        // The photograph is decoded before any of it shows. If the scroll is already past its stretch when it lands,
        // the gate opens it over a moment instead of in one frame. The image loads now, not lazily at the edge.
        if (img) {
          img.loading = "eager";
          decoded(img).then(() => {
            if (!alive) return;
            gsap.to(gate, { v: 1, duration: 0.45, ease: "power2.out", onUpdate: paint });
          });
        } else {
          gate.v = 1;
        }

        // The statement is cut with the face it is read in. Until then it stays hidden (the CSS gate), and the section
        // is marked ready only once every start state is written.
        if (kind !== "card" && head) {
          faceReady().then(() => {
            if (!alive) return;
            split = SplitText.create(head, {
              type: "lines",
              mask: "lines",
              linesClass: "struq-line",
              autoSplit: true,
              onSplit(self) {
                lines = self.lines as HTMLElement[];
                heights = lines.map((l) => l.offsetHeight);
                paint();
              },
            });
            el.dataset.ready = "1";
          });
          paint();
        } else {
          paint();
          el.dataset.ready = "1";
        }

        return () => {
          alive = false;
          ScrollTrigger.removeEventListener("refresh", remeasure);
          gsap.killTweensOf(gate);
          split?.revert();
          for (const s of [...softs, ...settles]) {
            s.style.transform = "";
            s.style.opacity = "";
          }
          if (frame) frame.style.clipPath = "";
          if (pic) {
            pic.style.transform = "";
            pic.style.opacity = "";
          }
          if (shade) shade.style.opacity = "";
          if (prev) {
            prev.style.transform = prevTransform;
            prev.style.willChange = "";
          }
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [variant] },
  );

  const photo = (sizes: string, frameClass: string) => (
    <div data-rv-frame="" className={`relative overflow-hidden ${frameClass}`}>
      <div data-rv-pic="" className="absolute inset-0">
        <Image src={image.src} alt={image.alt} fill sizes={sizes} unoptimized={image.unoptimized} className="object-cover" />
      </div>
    </div>
  );

  const textLink = (
    <a
      href={link.href}
      className="inline-block text-body text-ink underline decoration-1 underline-offset-[0.3em] transition-colors duration-200 hover:text-ink-muted"
    >
      {link.label}
    </a>
  );

  if (variant === "card") {
    return (
      <section
        ref={root}
        data-reveals="card"
        aria-labelledby={titleId}
        className={`relative z-[2] flex min-h-svh flex-col bg-surface-0 px-6 py-20 text-ink md:px-[4vw] md:py-[12svh] ${className}`}
      >
        {/* The dark that falls over the section being covered: it hangs above the card's top edge and travels with it. */}
        <div data-rv-shade="" aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full h-svh" />
        <h2 id={titleId} data-rv-settle="" className="font-display max-w-[17ch] text-h2 text-ink">
          {statement}
        </h2>
        <div className="mt-12 grid gap-10 md:mt-auto md:grid-cols-12 md:items-end md:gap-x-[2vw] md:pt-[8svh]">
          <div data-rv-settle="" className="md:col-span-5">
            {photo("(min-width: 768px) 40vw, 100vw", "aspect-[3/2] w-full md:aspect-auto md:h-[44svh]")}
          </div>
          <div data-rv-settle="" className="md:col-span-4 md:col-start-8">
            <p className="text-lead text-ink-muted">{text}</p>
            <div className="mt-6">{textLink}</div>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "clip") {
    return (
      <section
        ref={root}
        data-reveals="clip"
        aria-labelledby={titleId}
        className={`relative bg-surface-0 px-6 py-20 text-ink md:px-[4vw] md:py-[14svh] ${className}`}
      >
        <div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-x-[2vw]">
          <div className="md:col-span-6">{photo("(min-width: 768px) 50vw, 100vw", "aspect-[4/5] w-full md:aspect-auto md:h-[76svh]")}</div>
          <div className="md:col-span-5 md:col-start-8">
            <h2
              id={titleId}
              data-rv-type=""
              className="font-display max-w-[15ch] text-[clamp(2.25rem,1.1rem+2.6vw,3.75rem)] leading-[1.06] tracking-[-0.015em] text-ink"
            >
              {statement}
            </h2>
            <div data-rv-copy="" className="mt-8">
              <p data-rv-soft="" className="text-lead text-ink-muted">
                {text}
              </p>
              <div data-rv-soft="" className="mt-6">
                {textLink}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={root}
      data-reveals="lines"
      aria-labelledby={titleId}
      className={`relative bg-surface-0 px-6 py-20 text-ink md:px-[4vw] md:py-[16svh] ${className}`}
    >
      <div className="grid gap-12 md:grid-cols-12 md:gap-x-[2vw]">
        <div className="md:col-span-7">
          <h2 id={titleId} data-rv-type="" className="font-display max-w-[16ch] text-h2 text-ink">
            {statement}
          </h2>
          <div data-rv-copy="" className="mt-10 max-w-[36ch] md:mt-[8svh]">
            <p data-rv-soft="" className="text-lead text-ink-muted">
              {text}
            </p>
            <div data-rv-soft="" className="mt-6">
              {textLink}
            </div>
          </div>
        </div>
        <div className="md:col-span-4 md:col-start-9">
          {photo("(min-width: 768px) 32vw, 100vw", "aspect-[4/5] w-full md:aspect-auto md:h-[66svh]")}
        </div>
      </div>
    </section>
  );
}
