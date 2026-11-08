"use client";
// about-studio (Struq section recipe)
// Who the studio is: one short statement, a paragraph, a few honest facts and the place itself, given real space.
// Three compositions:
//
// - plaat: a full-bleed plate of the place leads. It arrives as a print inside the page margins and opens out to the
//   edges as it climbs (a clip on a layer already at full size, never a scale), while the photograph drifts slowly
//   inside its frame. Under it the statement stands large on the left, the paragraph and the facts on the right; the
//   statement's lines rise through their masks and each fact's rule draws in from the left.
// - wandeling: a walk through the place. The statement, the paragraph and the facts hold still on the left (plain CSS
//   sticky, nothing pins) while two columns of upright photographs pass on the right, the second one later and faster,
//   so the walk has depth. Phones: the type first, then the photographs as a row you swipe.
// - doorkijk: a short pin. The statement is cut in two halves and set either side of a narrow slit of photograph. As
//   the reader scrolls the slit opens into a window (its clip opens, the photo never moves) and pushes the halves apart
//   to the page's edges. The paragraph and the facts follow under the pin. Phones: the halves above and below the
//   frame, which opens as it passes, no pin.
//
// <AboutStudio variant="plaat" statement="Negen mensen aan één lange tafel." text="..." facts={[{ label: "Sinds",
//   value: "2012" }]} images={[images.band[0]]} />
// <AboutStudio variant="doorkijk" halves={["Negen mensen,", "één lange tafel."]} ... images={[images.column[1]]} />
//
// Every move is scrubbed to the scroll with 0.4 s of smoothing (a fast flick never stacks states, going back
// reverses), transforms are written in whole pixels and every clip from plain numbers. Each photograph is decoded
// before it shows. The statement is cut into lines with the face it is read in (the cut waits for the fonts, capped).
//
// Start states wait behind the `.js` / `.sq-js` gate and a 3 s CSS fallback (blocks.css, "--- about-studio ---"), so
// a page whose scripts never run still shows the composed section. Reduced motion: the composed section, no travel.
import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

export const ABOUT_STUDIO_VARIANTS = [
  { id: "plaat", title: "Plaat" },
  { id: "wandeling", title: "Wandeling" },
  { id: "doorkijk", title: "Doorkijk" },
] as const;

export type AboutStudioVariant = (typeof ABOUT_STUDIO_VARIANTS)[number]["id"];

type Fact = { label: string; value: string };

type Props = {
  variant?: AboutStudioVariant;
  /** The studio in one sentence. plaat and wandeling set it whole; doorkijk cuts it in two (or takes `halves`). */
  statement: string;
  /** doorkijk: the two halves either side of the window. Left out, the statement is cut at its middle word. */
  halves?: [string, string];
  /** Two or three sentences about the people and the place. */
  text: string;
  /** A few honest facts: a short label and its value. */
  facts?: Fact[];
  /** plaat and doorkijk take the first photograph (a wide plate, an upright window); wandeling takes up to four. */
  images: StruqImage[];
  className?: string;
};

/** Seconds of smoothing on every scrub: a camera settling, never a delay. */
const SMOOTH = 0.4;
/** The longest a line cut waits for the display face, in ms. */
const FONT_CAP = 1200;
/** A line travels this share of its own height to its place. */
const RISE = 1.12;
/** The soft rise of the paragraph and the facts, in px. */
const SOFT = 18;
/** plaat: the share of the frame's height the photo layer reaches past it, above and below (its drift). */
const DRIFT = 0.1;
/** plaat: the margin the plate starts inside, as a share of its width per side. */
const MARGIN = 0.06;
/** wandeling: how far the second column travels against the first over the section, in screens. */
const WALK = 0.24;
/** doorkijk: the pin, in screens, and the share of the window's width the slit starts at. */
const PIN = 1.3;
const SLIT = 0.16;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out2 = gsap.parseEase("power2.out");
const out3 = gsap.parseEase("power3.out");
const inOut2 = gsap.parseEase("power2.inOut");
const inOut3 = gsap.parseEase("power3.inOut");

/** Staggered windows for n items inside 0 to 1: each runs `span`, the last one ends at 1. */
function windows(n: number, span: number) {
  if (n <= 1) return [[0, 1]];
  const step = (1 - span) / (n - 1);
  return Array.from({ length: n }, (_, i) => [i * step, i * step + span]);
}

function faceReady() {
  const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
  return Promise.race([fonts ?? Promise.resolve(), new Promise((res) => window.setTimeout(res, FONT_CAP))]);
}

function decoded(img: HTMLImageElement) {
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise<void>((res) => {
        img.addEventListener("load", () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      });
  return loaded.then(() => img.decode()).catch(() => undefined);
}

const px = (n: number) => `${Math.round(n)}px`;

function run(el: HTMLElement, kind: AboutStudioVariant, wide: boolean, reduce: boolean) {
  const heads = [...el.querySelectorAll<HTMLElement>("[data-as-head]")];
  const copy = el.querySelector<HTMLElement>("[data-as-copy]");
  const softs = [...el.querySelectorAll<HTMLElement>("[data-as-soft]")];
  const rules = [...el.querySelectorAll<HTMLElement>("[data-as-rule]")];
  const photos = [...el.querySelectorAll<HTMLElement>("[data-as-photo]")];
  const frame = el.querySelector<HTMLElement>("[data-as-frame]");
  const layer = el.querySelector<HTMLElement>("[data-as-layer]");
  const stage = el.querySelector<HTMLElement>("[data-as-stage]");
  const walk = el.querySelector<HTMLElement>("[data-as-walk]");
  const late = el.querySelector<HTMLElement>('[data-as-col="1"]');
  if (reduce) {
    el.dataset.ready = "1";
    return;
  }

  let alive = true;
  const splits: SplitText[] = [];
  const lines: HTMLElement[][] = heads.map(() => []);
  const heights: number[][] = heads.map(() => []);
  const prog = { type: 0, soft: 0, open: 0, move: 0 };
  const shown = photos.map(() => ({ v: 0 }));
  let vh = window.innerHeight;
  let frameW = 0;
  let frameH = 0;
  const measure = () => {
    vh = window.innerHeight;
    frameW = frame?.offsetWidth ?? 0;
    frameH = frame?.offsetHeight ?? 0;
  };
  measure();

  const paint = () => {
    if (!alive) return;
    // The statement: every head's lines rise one after another on the same stretch.
    heads.forEach((_, h) => {
      const spans = windows(lines[h].length, 0.62);
      lines[h].forEach((line, i) => {
        const e = out3(within(prog.type, spans[i][0], spans[i][1]));
        line.style.transform = `translate3d(0, ${px((1 - e) * (heights[h][i] ?? 0) * RISE)}, 0)`;
      });
    });
    const softSpans = windows(softs.length, 0.72);
    softs.forEach((s, i) => {
      const e = out2(within(prog.soft, softSpans[i][0], softSpans[i][1]));
      s.style.transform = `translate3d(0, ${px((1 - e) * SOFT)}, 0)`;
      s.style.opacity = e.toFixed(3);
    });
    // Each fact's rule draws from the left a little behind its row.
    const ruleSpans = windows(rules.length, 0.6);
    rules.forEach((r, i) => {
      const e = inOut2(within(prog.soft, 0.12 + ruleSpans[i][0] * 0.88, 0.12 + ruleSpans[i][1] * 0.88));
      r.style.setProperty("--as-draw", e.toFixed(4));
    });
    photos.forEach((p, i) => {
      p.style.opacity = shown[i].v.toFixed(3);
    });

    if (kind === "plaat" && frame && layer) {
      const inset = (1 - inOut3(prog.open)) * MARGIN * frameW;
      frame.style.clipPath = `inset(0px ${inset.toFixed(1)}px 0px ${inset.toFixed(1)}px)`;
      layer.style.transform = `translate3d(0, ${px((1 - 2 * prog.move) * DRIFT * frameH)}, 0)`;
    } else if (kind === "wandeling" && late) {
      late.style.transform = wide ? `translate3d(0, ${px((0.5 - prog.move) * WALK * vh)}, 0)` : "";
    } else if (kind === "doorkijk" && frame) {
      const share = SLIT + (1 - SLIT) * inOut3(prog.open);
      const side = ((1 - share) / 2) * frameW;
      frame.style.clipPath = `inset(0px ${side.toFixed(1)}px 0px ${side.toFixed(1)}px)`;
      // The halves stand tight against the slit and are pushed out with its edges (wide screens only).
      heads.forEach((h, i) => {
        h.style.transform = wide ? `translate3d(${px(i === 0 ? side : -side)}, 0, 0)` : "";
      });
    }
  };

  const scrub = (target: object, vars: gsap.TweenVars, trigger: Element | null, start: string, end: string) => {
    if (!trigger) return;
    gsap.to(target, { ...vars, ease: "none", onUpdate: paint, scrollTrigger: { trigger, start, end, scrub: SMOOTH } });
  };

  if (kind === "plaat") {
    scrub(prog, { open: 1 }, frame, "top 96%", "top 30%");
    scrub(prog, { move: 1 }, frame, "top bottom", "bottom top");
    scrub(prog, { type: 1 }, heads[0] ?? null, "top 90%", "top 52%");
    scrub(prog, { soft: 1 }, copy, "top 92%", "top 48%");
  } else if (kind === "wandeling") {
    scrub(prog, { type: 1 }, el, "top 85%", "top 35%");
    // Wide, the copy is sticky, so its stretch is read off the section; on phones off the copy itself.
    if (wide) scrub(prog, { soft: 1 }, el, "top 70%", "top 10%");
    else scrub(prog, { soft: 1 }, copy, "top 85%", "bottom 85%");
    scrub(prog, { move: 1 }, walk, "top bottom", "bottom top");
  } else if (wide && stage) {
    // doorkijk: the halves rise as the stage arrives, then the pin opens the window.
    scrub(prog, { type: 1 }, stage, "top 80%", "top 25%");
    gsap.to(prog, {
      open: 1,
      ease: "none",
      onUpdate: paint,
      scrollTrigger: { trigger: stage, start: "top top", end: () => `+=${Math.round(PIN * window.innerHeight)}`, pin: true, scrub: SMOOTH },
    });
    scrub(prog, { soft: 1 }, copy, "top 92%", "top 52%");
  } else {
    scrub(prog, { type: 1 }, stage, "top 85%", "top 40%");
    scrub(prog, { open: 1 }, frame, "top 88%", "center 50%");
    scrub(prog, { soft: 1 }, copy, "top 94%", "top 60%");
  }

  const remeasure = () => {
    measure();
    paint();
  };
  ScrollTrigger.addEventListener("refresh", remeasure);

  // Every photograph is decoded at its display size before any of it shows; the layer then fades in over a moment.
  photos.forEach((p, i) => {
    const img = p.querySelector("img");
    if (!img) {
      shown[i].v = 1;
      return;
    }
    img.loading = "eager";
    decoded(img).then(() => {
      if (!alive) return;
      gsap.to(shown[i], { v: 1, duration: 0.45, ease: "power2.out", onUpdate: paint });
    });
  });

  faceReady().then(() => {
    if (!alive) return;
    heads.forEach((head, h) =>
      splits.push(
        SplitText.create(head, {
          type: "lines",
          mask: "lines",
          linesClass: "struq-line",
          autoSplit: true,
          onSplit(self) {
            lines[h] = self.lines as HTMLElement[];
            heights[h] = lines[h].map((l) => l.offsetHeight);
            paint();
          },
        }),
      ),
    );
    el.dataset.ready = "1";
  });
  paint();

  return () => {
    alive = false;
    ScrollTrigger.removeEventListener("refresh", remeasure);
    for (const s of shown) gsap.killTweensOf(s);
    for (const s of splits) s.revert();
    for (const n of [...softs, ...photos, ...heads]) {
      n.style.transform = "";
      n.style.opacity = "";
    }
    for (const r of rules) r.style.removeProperty("--as-draw");
    if (frame) frame.style.clipPath = "";
    if (layer) layer.style.transform = "";
    if (late) late.style.transform = "";
  };
}

function Facts({ facts, className = "" }: { facts?: Fact[]; className?: string }) {
  if (!facts?.length) return null;
  return (
    <dl className={className}>
      {facts.map((f, i) => (
        <div key={i} data-as-soft="" data-as-rule="" className="relative grid grid-cols-[7rem_1fr] gap-x-4 py-4 text-small md:grid-cols-[8.5rem_1fr]">
          <dt className="text-ink-muted">{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function halvesOf(statement: string, halves?: [string, string]): [string, string] {
  if (halves) return halves;
  const words = statement.split(" ");
  const cut = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

const DISPLAY = "font-display leading-[1.04] tracking-[-0.022em]";

export function AboutStudio({ variant = "plaat", statement, halves, text, facts, images, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      // Every side of every query is named, so the moves run on phones as well as on wide screens.
      mm.add(
        {
          wide: "(min-width: 768px)",
          reduce: "(prefers-reduced-motion: reduce)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { wide, reduce } = ctx.conditions as { wide: boolean; reduce: boolean };
          return run(el, variant, wide, reduce);
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [variant] },
  );

  const first = images[0];

  if (variant === "wandeling") {
    const walk = images.slice(0, 4);
    const half = Math.ceil(walk.length / 2);
    const cols = [walk.slice(0, half), walk.slice(half)];
    return (
      <section
        ref={root}
        data-about-studio="wandeling"
        className={`relative overflow-hidden bg-surface-0 px-6 py-[14svh] text-ink md:px-[4vw] md:py-[18svh] ${className}`}
      >
        <div className="grid gap-y-14 md:grid-cols-12 md:gap-x-[2vw]">
          <div className="md:col-span-5">
            <div data-as-copy="" className="md:sticky md:top-[16svh]">
              <h2 data-as-head="" className={`${DISPLAY} max-w-[13ch] text-[clamp(2.25rem,1rem+3.2vw,5rem)]`}>
                {statement}
              </h2>
              <p data-as-soft="" className="mt-8 max-w-[40ch] text-lead text-ink-muted md:mt-10">
                {text}
              </p>
              <Facts facts={facts} className="mt-10 max-w-[30rem] md:mt-12" />
            </div>
          </div>
          {/* Phones: one row of photographs you swipe, so it is a scroll region keyboards can reach. */}
          <div
            data-as-walk=""
            role="region"
            aria-label="De studio in beeld"
            tabIndex={0}
            className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 outline-offset-4 md:col-span-6 md:col-start-7 md:mx-0 md:grid md:grid-cols-2 md:gap-x-[2vw] md:overflow-visible md:px-0 md:pb-0"
          >
            {cols.map((col, c) => (
              <div key={c} data-as-col={c} className={`contents md:flex md:flex-col md:gap-[12svh] ${c === 1 ? "md:pt-[28svh]" : ""}`}>
                {col.map((img) => (
                  <figure key={img.src} className="w-[74vw] shrink-0 snap-start md:w-auto">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <div data-as-photo="" className="absolute inset-0">
                        <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 25vw, 74vw" unoptimized={img.unoptimized} className="object-cover" />
                      </div>
                    </div>
                    <figcaption className="mt-3 text-small text-ink-muted">{img.alt}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "doorkijk") {
    const [a, b] = halvesOf(statement, halves);
    return (
      <section ref={root} data-about-studio="doorkijk" className={`relative bg-surface-0 text-ink ${className}`}>
        {/* One grid whose middle track is the window: the heading's two halves sit either side of it (the heading is
            display: contents, so its halves are the grid's items), stacked above and below it on phones. */}
        <div
          data-as-stage=""
          className="grid min-h-svh content-center justify-items-center gap-y-8 px-6 py-[12svh] md:h-svh md:min-h-[36rem] md:grid-cols-[1fr_var(--dk-w)_1fr] md:items-center md:gap-x-[3vw] md:gap-y-0 md:px-[4vw] md:py-0"
        >
          <h2 className="contents">
            <span data-as-head="" className={`${DISPLAY} row-start-1 block max-w-[11ch] text-center text-[clamp(2.25rem,min(0.8rem+3.6vw,8.5svh),5.5rem)] md:col-start-1 md:justify-self-end md:text-right`}>
              {a}
            </span>{" "}
            <span data-as-head="" className={`${DISPLAY} row-start-3 block max-w-[11ch] text-center text-[clamp(2.25rem,min(0.8rem+3.6vw,8.5svh),5.5rem)] md:col-start-3 md:row-start-1 md:justify-self-start md:text-left`}>
              {b}
            </span>
          </h2>
          {first ? (
            <figure className="relative row-start-2 w-[var(--dk-w)] md:col-start-2 md:row-start-1">
              <div data-as-frame="" className="relative aspect-[4/5] overflow-hidden">
                <div data-as-photo="" className="absolute inset-0">
                  <Image src={first.src} alt={first.alt} fill sizes="(min-width: 768px) 36vw, 64vw" unoptimized={first.unoptimized} className="object-cover" />
                </div>
              </div>
              <figcaption className="absolute left-0 top-full mt-3 text-small text-ink-muted">{first.alt}</figcaption>
            </figure>
          ) : null}
        </div>
        <div data-as-copy="" className="grid gap-y-10 px-6 pb-[16svh] pt-[10svh] md:grid-cols-12 md:gap-x-[2vw] md:px-[4vw] md:pt-[14svh]">
          <p data-as-soft="" className="max-w-[40ch] text-lead text-ink-muted md:col-span-5 md:col-start-2">
            {text}
          </p>
          <Facts facts={facts} className="md:col-span-4 md:col-start-8" />
        </div>
      </section>
    );
  }

  return (
    <section ref={root} data-about-studio="plaat" className={`relative overflow-hidden bg-surface-0 pb-[16svh] pt-[10svh] text-ink ${className}`}>
      {first ? (
        <figure className="mb-[10svh] md:mb-[14svh]">
          <div data-as-frame="" className="relative aspect-[4/3] w-full overflow-hidden md:aspect-[21/9]">
            {/* The photograph sits on a layer larger than its frame, so its drift never shows an edge. */}
            <div data-as-layer="" data-as-photo="" className="absolute inset-x-0 -bottom-[10%] -top-[10%]">
              <Image src={first.src} alt={first.alt} fill sizes="100vw" unoptimized={first.unoptimized} className="object-cover" />
            </div>
          </div>
          <figcaption className="mt-4 px-6 text-small text-ink-muted md:px-[4vw]">{first.alt}</figcaption>
        </figure>
      ) : null}
      <div className="grid gap-y-12 px-6 md:grid-cols-12 md:gap-x-[2vw] md:px-[4vw]">
        <h2 data-as-head="" className={`${DISPLAY} max-w-[15ch] text-[clamp(2.25rem,1rem+3.6vw,5.5rem)] md:col-span-7`}>
          {statement}
        </h2>
        <div data-as-copy="" className="md:col-span-4 md:col-start-9 md:pt-3">
          <p data-as-soft="" className="max-w-[40ch] text-lead text-ink-muted">
            {text}
          </p>
          <Facts facts={facts} className="mt-10 md:mt-14" />
        </div>
      </div>
    </section>
  );
}
