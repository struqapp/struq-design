"use client";
// approach (Struq section recipe)
// How the studio works: the stages of a project from the first conversation to the handover, told as a sequence
// through layout and movement, never through numbers. Three ways to tell it:
//
// - draad: one line runs down the page and draws itself as the reader goes, its tip at a fixed height on the screen.
//   The stages hang off it, alternating left and right on wide screens (all on its right on phones). When the tip
//   reaches a stage, a short tick draws out from the line to it, the stage's name rises through its mask and its two
//   lines of copy follow.
// - zin: the whole process as one sentence, one clause per stage, set large on a short pin. The clauses come to ink
//   one after another as the reader scrolls, the rest waiting faint; under the sentence the current stage's name and
//   note rise into a mask while the last one leaves upward.
// - schuif: an index you scrub. A rule runs under a large photograph with one mark per stage and a handle; drag along
//   it, click a stage or use the arrow keys, and the photographs wipe across one another in register, in the direction
//   of travel, while the stage's copy swaps beside them. Letting go settles on the nearest stage.
//
// <Approach variant="draad" title="Van de eerste koffie tot de sleutel." stages={[{ name: "Kennismaken", line: "...",
//   text: "...", clause: "We lopen eerst samen door wat er al staat,", image: images.card[1] }, ...]} />
//
// Scroll moves are scrubbed with 0.4 s of smoothing (a fast flick never stacks states, going back reverses); the
// scrubber follows the hand in about 0.18 s and a swap overtaken mid-way turns back from where it is. Transforms are
// written in whole pixels, clips from plain numbers. Every photograph is decoded before it can show. Names and titles
// are cut into lines with the face they are read in (the cut waits for the fonts, capped).
//
// Start states wait behind the `.js` / `.sq-js` gate and a 3 s CSS fallback (blocks.css, "--- approach ---"), so a
// page whose scripts never run still shows every stage as a plain list. Reduced motion: the same states without
// travel (zin shows the whole sentence over its notes, schuif cuts between photographs).
import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

export const APPROACH_VARIANTS = [
  { id: "draad", title: "Draad" },
  { id: "zin", title: "Zin" },
  { id: "schuif", title: "Schuif" },
] as const;

export type ApproachVariant = (typeof APPROACH_VARIANTS)[number]["id"];

export type ApproachStage = {
  /** The stage in one or two words: its name. */
  name: string;
  /** What happens, in one sentence. */
  line: string;
  /** One or two plain sentences more. */
  text: string;
  /** zin: this stage's clause of the one sentence, with its own punctuation. Left out, `line` stands in. */
  clause?: string;
  /** schuif: the stage's photograph. */
  image?: StruqImage;
};

type Props = {
  variant?: ApproachVariant;
  /** draad and schuif: the section's title. zin's sentence is its own title. */
  title: string;
  stages: ApproachStage[];
  className?: string;
};

const SMOOTH = 0.4;
const FONT_CAP = 1200;
const RISE = 1.12;
const SOFT = 16;
/** draad: the height on the screen where the line's tip rides, as a share from the top. */
const TIP = 0.62;
/** zin: screens of scroll per clause, and the beat the finished sentence holds. */
const STEP = 0.5;
const HOLD = 0.4;
/** zin: how faint a clause waits. */
const FAINT = 0.2;
/** schuif: the follow while dragging, and the settle after a release or a click, in seconds. */
const FOLLOW = 0.18;
const SETTLE = 0.6;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out2 = gsap.parseEase("power2.out");
const out3 = gsap.parseEase("power3.out");
const inOut2 = gsap.parseEase("power2.inOut");

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

/** Cuts every head into masked lines once the face is in; `done` runs on each cut. */
function cutHeads(heads: HTMLElement[], done: (h: number, lines: HTMLElement[]) => void) {
  return heads.map((head, h) =>
    SplitText.create(head, {
      type: "lines",
      mask: "lines",
      linesClass: "struq-line",
      autoSplit: true,
      onSplit(self) {
        done(h, self.lines as HTMLElement[]);
      },
    }),
  );
}

/** Each line of a head rises through its mask over the head's own progress. */
function riseLines(lines: HTMLElement[], heights: number[], p: number) {
  const spans = windows(lines.length, 0.66);
  lines.forEach((line, i) => {
    const e = out3(within(p, spans[i][0], spans[i][1]));
    line.style.transform = `translate3d(0, ${px((1 - e) * (heights[i] ?? 0) * RISE)}, 0)`;
  });
}

// --- draad ----------------------------------------------------------------------------------------------------------

function runDraad(el: HTMLElement, wide: boolean, reduce: boolean) {
  const path = el.querySelector<HTMLElement>("[data-ap-path]");
  const ink = el.querySelector<HTMLElement>("[data-ap-ink]");
  const title = el.querySelector<HTMLElement>("[data-ap-title]");
  const stages = [...el.querySelectorAll<HTMLElement>("[data-ap-stage]")];
  if (reduce || !path || !ink) {
    el.dataset.ready = "1";
    return;
  }
  const heads = [title, ...stages.map((s) => s.querySelector<HTMLElement>("[data-ap-head]"))].filter(Boolean) as HTMLElement[];
  const ticks = stages.map((s) => s.querySelector<HTMLElement>("[data-ap-tick]"));
  const softs = stages.map((s) => [...s.querySelectorAll<HTMLElement>("[data-ap-soft]")]);
  let alive = true;
  let splits: SplitText[] = [];
  const lines: HTMLElement[][] = heads.map(() => []);
  const heights: number[][] = heads.map(() => []);
  const prog = { title: 0, draw: 0 };
  const at = stages.map(() => ({ p: 0 }));

  const paint = () => {
    if (!alive) return;
    ink.style.clipPath = `inset(0px 0px ${((1 - prog.draw) * 100).toFixed(3)}% 0px)`;
    heads.forEach((_, h) => riseLines(lines[h], heights[h], h === 0 && title ? prog.title : at[h - (title ? 1 : 0)]?.p ?? 1));
    stages.forEach((_, i) => {
      const p = at[i].p;
      const tick = ticks[i];
      if (tick) {
        // On wide screens the stages on the left draw their tick leftwards, out of the line.
        const e = inOut2(within(p, 0, 0.45));
        const left = wide && i % 2 === 0;
        const rest = ((1 - e) * 100).toFixed(3);
        tick.style.clipPath = left ? `inset(0px 0px 0px ${rest}%)` : `inset(0px ${rest}% 0px 0px)`;
      }
      const spans = windows(softs[i].length, 0.7);
      softs[i].forEach((s, j) => {
        const e = out2(within(p, 0.3 + spans[j][0] * 0.7, 0.3 + spans[j][1] * 0.7));
        s.style.transform = `translate3d(0, ${px((1 - e) * SOFT)}, 0)`;
        s.style.opacity = e.toFixed(3);
      });
    });
  };

  const tip = `${Math.round(TIP * 100)}%`;
  const scrub = (target: object, vars: gsap.TweenVars, trigger: Element, start: string, end: string) =>
    gsap.to(target, { ...vars, ease: "none", onUpdate: paint, scrollTrigger: { trigger, start, end, scrub: SMOOTH } });
  if (title) scrub(prog, { title: 1 }, title, "top 90%", "top 55%");
  scrub(prog, { draw: 1 }, path, `top ${tip}`, `bottom ${tip}`);
  // A stage's stretch starts as the tip reaches its top.
  stages.forEach((s, i) => scrub(at[i], { p: 1 }, s, `top ${tip}`, `top ${Math.round(TIP * 100 - 26)}%`));

  faceReady().then(() => {
    if (!alive) return;
    splits = cutHeads(heads, (h, l) => {
      lines[h] = l;
      heights[h] = l.map((n) => n.offsetHeight);
      paint();
    });
    el.dataset.ready = "1";
  });
  paint();

  return () => {
    alive = false;
    for (const s of splits) s.revert();
    ink.style.clipPath = "";
    for (const t of ticks) if (t) t.style.clipPath = "";
    for (const s of softs.flat()) {
      s.style.transform = "";
      s.style.opacity = "";
    }
  };
}

// --- zin ------------------------------------------------------------------------------------------------------------

function runZin(el: HTMLElement, reduce: boolean) {
  const stage = el.querySelector<HTMLElement>("[data-ap-pin]");
  const clauses = [...el.querySelectorAll<HTMLElement>("[data-ap-clause]")];
  const notes = [...el.querySelectorAll<HTMLElement>("[data-ap-note-in]")];
  if (reduce || !stage || !clauses.length) {
    el.dataset.ready = "1";
    return;
  }
  // From here the notes share one cell (blocks.css), so only the current one stands under the sentence.
  el.dataset.stacked = "1";
  const n = clauses.length;
  const length = (n - 1) * STEP + HOLD;
  const prog = { p: 0 };
  let alive = true;
  let heights = notes.map((nt) => nt.offsetHeight);

  const paint = () => {
    if (!alive) return;
    const s = prog.p * length;
    // When clause i comes to ink: over the second half of the step before it.
    const lit = clauses.map((_, i) => (i === 0 ? 1 : within(s, (i - 1) * STEP + STEP * 0.35, i * STEP)));
    clauses.forEach((c, i) => {
      c.style.opacity = (FAINT + (1 - FAINT) * lit[i]).toFixed(3);
    });
    notes.forEach((nt, i) => {
      const enter = out3(lit[i]);
      const leave = i + 1 < n ? inOut2(lit[i + 1]) : 0;
      const h = heights[i] || 1;
      nt.style.transform = `translate3d(0, ${px((1 - enter) * h * 1.05 - leave * h * 1.05)}, 0)`;
      nt.style.visibility = enter > 0 && leave < 1 ? "inherit" : "hidden";
    });
  };

  gsap.to(prog, {
    p: 1,
    ease: "none",
    onUpdate: paint,
    scrollTrigger: {
      trigger: stage,
      start: "top top",
      end: () => `+=${Math.round(length * window.innerHeight)}`,
      pin: true,
      scrub: SMOOTH,
      onRefresh: () => {
        heights = notes.map((nt) => nt.offsetHeight);
        paint();
      },
    },
  });

  faceReady().then(() => {
    if (!alive) return;
    heights = notes.map((nt) => nt.offsetHeight);
    paint();
    el.dataset.ready = "1";
    ScrollTrigger.refresh();
  });
  paint();

  return () => {
    alive = false;
    delete el.dataset.stacked;
    for (const c of clauses) c.style.opacity = "";
    for (const nt of notes) {
      nt.style.transform = "";
      nt.style.visibility = "";
    }
  };
}

// --- schuif ---------------------------------------------------------------------------------------------------------

type Scrubber = { go: (i: number) => void };

function runSchuif(el: HTMLElement, reduce: boolean, onActive: (i: number) => void, api: { current: Scrubber | null }) {
  const title = el.querySelector<HTMLElement>("[data-ap-title]");
  const track = el.querySelector<HTMLElement>("[data-ap-track]");
  const ink = el.querySelector<HTMLElement>("[data-ap-ink]");
  const handle = el.querySelector<HTMLElement>("[data-ap-handle]");
  const marks = [...el.querySelectorAll<HTMLElement>("[data-ap-mark]")];
  const layers = [...el.querySelectorAll<HTMLElement>("[data-ap-layer]")];
  const notes = [...el.querySelectorAll<HTMLElement>("[data-ap-note]")];
  const n = notes.length;
  if (!track || !n) return;
  el.dataset.stacked = "1";

  let alive = true;
  let split: SplitText[] = [];
  let tLines: HTMLElement[] = [];
  let tHeights: number[] = [];
  const prog = { title: reduce ? 1 : 0 };
  const state = { q: 0 };
  const shown = layers.map(() => ({ v: 0 }));
  const vis = notes.map((_, i) => ({ v: i === 0 ? 1 : 0 }));
  let active = 0;
  // The marks' centres along the track, in px from its left edge.
  let xs: number[] = [];
  const measure = () => {
    const tr = track.getBoundingClientRect();
    xs = marks.map((m) => {
      const r = m.getBoundingClientRect();
      return r.left + r.width / 2 - tr.left;
    });
  };

  const xAt = (q: number) => {
    if (!xs.length) return 0;
    const i = Math.min(xs.length - 2, Math.max(0, Math.floor(q)));
    if (xs.length === 1) return xs[0];
    return xs[i] + (xs[i + 1] - xs[i]) * (q - i);
  };
  const qAt = (x: number) => {
    if (xs.length < 2) return 0;
    if (x <= xs[0]) return 0;
    for (let i = 0; i < xs.length - 1; i += 1) {
      if (x <= xs[i + 1]) return i + (x - xs[i]) / (xs[i + 1] - xs[i] || 1);
    }
    return xs.length - 1;
  };

  const paint = () => {
    if (!alive) return;
    riseLines(tLines, tHeights, prog.title);
    const q = state.q;
    // Layer i opens from the right edge as q travels from i - 1 to i: the next photograph wipes in with the hand.
    layers.forEach((layer, i) => {
      const f = i === 0 ? 1 : clamp01(q - (i - 1));
      layer.style.clipPath = `inset(0% 0% 0% ${((1 - f) * 100).toFixed(3)}%)`;
      layer.style.opacity = shown[i].v.toFixed(3);
    });
    const x = xAt(q);
    if (handle) handle.style.transform = `translate3d(${px(x - 1)}, 0, 0)`;
    if (ink) ink.style.clipPath = `inset(0px ${Math.max(0, track.offsetWidth - x).toFixed(1)}px 0px 0px)`;
    notes.forEach((nt, i) => {
      const v = vis[i].v;
      nt.style.opacity = v.toFixed(3);
      nt.style.transform = `translate3d(0, ${px((1 - v) * SOFT)}, 0)`;
      nt.style.visibility = v > 0.001 ? "inherit" : "hidden";
    });
  };

  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    onActive(i);
    // The outgoing copy leaves quickly, the incoming one settles; a swap overtaken mid-way turns back from where it is.
    vis.forEach((v, j) => {
      const on = j === i;
      gsap.to(v, {
        v: on ? 1 : 0,
        duration: reduce ? 0.15 : on ? 0.55 : 0.22,
        delay: on && !reduce ? 0.08 : 0,
        ease: on ? "power3.out" : "power2.in",
        overwrite: true,
        onUpdate: paint,
      });
    });
  };

  const moveTo = (q: number, duration: number, ease: string) => {
    gsap.to(state, {
      q,
      duration,
      ease,
      overwrite: true,
      onUpdate: () => {
        setActive(Math.round(state.q));
        paint();
      },
    });
  };

  api.current = {
    go: (i: number) => moveTo(Math.min(n - 1, Math.max(0, i)), reduce ? 0 : SETTLE, "power3.inOut"),
  };

  // The hand on the rule: a press that moves more than a few pixels becomes a drag, which the scrubber follows; letting
  // go settles on the nearest stage. A press that stays put is a click, left to the stage's own button.
  let pressed = false;
  let dragging = false;
  let startX = 0;
  let target = 0;
  const fromEvent = (e: PointerEvent) => qAt(e.clientX - track.getBoundingClientRect().left);
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    pressed = true;
    dragging = false;
    startX = e.clientX;
    measure();
  };
  const move = (e: PointerEvent) => {
    if (!pressed) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < 5) return;
      dragging = true;
      track.setPointerCapture(e.pointerId);
    }
    target = fromEvent(e);
    moveTo(target, FOLLOW, "power2.out");
  };
  const up = (e: PointerEvent) => {
    pressed = false;
    if (!dragging) return;
    dragging = false;
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    moveTo(Math.round(target), reduce ? 0.15 : 0.45, "power3.out");
  };
  track.addEventListener("pointerdown", down);
  track.addEventListener("pointermove", move);
  track.addEventListener("pointerup", up);
  track.addEventListener("pointercancel", up);

  const remeasure = () => {
    measure();
    paint();
  };
  ScrollTrigger.addEventListener("refresh", remeasure);
  window.addEventListener("resize", remeasure);
  if (title && !reduce) {
    gsap.to(prog, { title: 1, ease: "none", onUpdate: paint, scrollTrigger: { trigger: title, start: "top 90%", end: "top 55%", scrub: SMOOTH } });
  }

  // Every photograph is decoded before it can show; the first fades in once it is.
  layers.forEach((layer, i) => {
    const img = layer.querySelector("img");
    if (!img) {
      shown[i].v = 1;
      return;
    }
    img.loading = "eager";
    decoded(img).then(() => {
      if (!alive) return;
      gsap.to(shown[i], { v: 1, duration: reduce ? 0 : 0.45, ease: "power2.out", onUpdate: paint });
    });
  });

  faceReady().then(() => {
    if (!alive) return;
    measure();
    if (title && !reduce) {
      split = cutHeads([title], (_, l) => {
        tLines = l;
        tHeights = l.map((x) => x.offsetHeight);
        paint();
      });
    }
    paint();
    el.dataset.ready = "1";
  });
  measure();
  paint();

  return () => {
    alive = false;
    api.current = null;
    track.removeEventListener("pointerdown", down);
    track.removeEventListener("pointermove", move);
    track.removeEventListener("pointerup", up);
    track.removeEventListener("pointercancel", up);
    ScrollTrigger.removeEventListener("refresh", remeasure);
    window.removeEventListener("resize", remeasure);
    gsap.killTweensOf(state);
    for (const v of [...vis, ...shown]) gsap.killTweensOf(v);
    for (const s of split) s.revert();
    delete el.dataset.stacked;
    for (const node of [...layers, ...notes]) {
      node.style.clipPath = "";
      node.style.opacity = "";
      node.style.transform = "";
      node.style.visibility = "";
    }
    if (handle) handle.style.transform = "";
    if (ink) ink.style.clipPath = "";
  };
}

// --- the block ------------------------------------------------------------------------------------------------------

const DISPLAY = "font-display leading-[1.04] tracking-[-0.022em]";
const TITLE = `${DISPLAY} max-w-[16ch] text-[clamp(2.25rem,1rem+3.4vw,5.25rem)]`;

export function Approach({ variant = "draad", title, stages, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const api = useRef<Scrubber | null>(null);
  const [active, setActive] = useState(0);
  const uid = useId();

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
          if (variant === "zin") return runZin(el, reduce);
          if (variant === "schuif") {
            setActive(0);
            return runSchuif(el, reduce, setActive, api);
          }
          return runDraad(el, wide, reduce);
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [variant] },
  );

  if (variant === "zin") {
    return (
      <section ref={root} data-approach="zin" className={`relative bg-surface-0 text-ink ${className}`}>
        <div data-ap-pin="" className="flex min-h-svh flex-col justify-center px-6 py-[10svh] md:px-[8vw]">
          <h2 className="font-display max-w-[30ch] text-[clamp(1.75rem,min(0.8rem+2.4vw,6.4svh),4rem)] leading-[1.12] tracking-[-0.018em]">
            {stages.map((s, i) => (
              <span key={i} data-ap-clause="">
                {s.clause ?? s.line}
                {i < stages.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
          <div data-ap-notes="" className="mt-[7svh] grid gap-8 md:mt-[9svh] md:max-w-[46rem]">
            {stages.map((s, i) => (
              <div key={i} data-ap-note="" className="overflow-hidden">
                <div data-ap-note-in="" className="grid gap-2 md:grid-cols-[11rem_1fr] md:gap-x-8">
                  <h3 className="text-ink">{s.name}</h3>
                  <p className="max-w-[46ch] text-small text-ink-muted">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "schuif") {
    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
      const keys: Record<string, number> = { ArrowRight: active + 1, ArrowDown: active + 1, ArrowLeft: active - 1, ArrowUp: active - 1, Home: 0, End: stages.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const next = Math.min(stages.length - 1, Math.max(0, keys[e.key]));
      api.current?.go(next);
      setActive(next);
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    };
    return (
      <section ref={root} data-approach="schuif" className={`relative bg-surface-0 px-6 py-[14svh] text-ink md:px-[4vw] ${className}`}>
        <h2 data-ap-title="" className={TITLE}>
          {title}
        </h2>
        <div className="mt-[7svh] grid gap-y-8 md:mt-[9svh] md:grid-cols-12 md:gap-x-[2vw]">
          {/* Wide, the frame's height is set by the screen, so the photograph and the rule read in one view. */}
          <div className="relative aspect-[4/5] overflow-hidden md:col-span-7 md:aspect-auto md:h-[min(56svh,36vw)] md:min-h-[18rem]">
            {stages.map((s, i) => (
              <div key={i} data-ap-layer="" className="absolute inset-0">
                {s.image ? (
                  <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 768px) 58vw, 100vw" unoptimized={s.image.unoptimized} className="object-cover" />
                ) : null}
              </div>
            ))}
          </div>
          <div data-ap-notes="" className="grid content-end gap-10 md:col-span-4 md:col-start-9">
            {stages.map((s, i) => (
              <div
                key={i}
                data-ap-note=""
                role="tabpanel"
                id={`${uid}-p${i}`}
                aria-labelledby={`${uid}-t${i}`}
                aria-hidden={i !== active}
              >
                <h3 className="font-display text-[clamp(1.75rem,1rem+1.8vw,3rem)] leading-[1.05] tracking-[-0.018em]">{s.name}</h3>
                <p className="mt-4 max-w-[34ch] text-lead">{s.line}</p>
                <p className="mt-3 max-w-[40ch] text-small text-ink-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
        {/* The rule: drag along it, or use its stages as tabs. */}
        <div data-ap-track="" className="relative mt-[6svh] cursor-ew-resize touch-pan-y select-none md:mt-[5svh]">
          <span aria-hidden="true" className="absolute inset-x-0 top-[22px] h-px bg-line" />
          <span aria-hidden="true" data-ap-ink="" className="absolute inset-x-0 top-[22px] h-px bg-ink" />
          <span aria-hidden="true" data-ap-handle="" className="absolute left-0 top-[11px] h-[23px] w-[2px] bg-accent" />
          <div role="tablist" aria-label={title} onKeyDown={onKey} className="relative flex justify-between">
            {stages.map((s, i) => {
              const last = i === stages.length - 1;
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  id={`${uid}-t${i}`}
                  aria-controls={`${uid}-p${i}`}
                  aria-selected={i === active}
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => {
                    api.current?.go(i);
                    setActive(i);
                  }}
                  className={`flex min-h-11 min-w-11 cursor-pointer flex-col pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${last ? "items-end text-right" : "items-start text-left"}`}
                >
                  <span aria-hidden="true" data-ap-mark="" className="mt-[17px] block h-[11px] w-px bg-ink" />
                  <span className={`sr-only text-small md:not-sr-only md:mt-4 ${i === active ? "text-ink" : "text-ink-muted"}`}>{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} data-approach="draad" className={`relative bg-surface-0 px-6 py-[14svh] text-ink md:px-[4vw] md:py-[18svh] ${className}`}>
      <h2 data-ap-title="" className={TITLE}>
        {title}
      </h2>
      <div data-ap-path="" className="relative mt-[10svh] md:mt-[14svh]">
        <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-px bg-line md:left-1/2" />
        <span aria-hidden="true" data-ap-ink="" className="absolute bottom-0 left-0 top-0 w-px bg-ink md:left-1/2" />
        <ol className="relative">
        {stages.map((s, i) => {
          const left = i % 2 === 0;
          return (
            <li key={i} data-ap-stage="" className="relative grid pb-[9svh] pl-8 last:pb-0 md:grid-cols-2 md:pb-[13svh] md:pl-0">
              <span
                aria-hidden="true"
                data-ap-tick=""
                className={`absolute left-0 top-[clamp(1.05rem,0.525rem+1.37vw,2.1rem)] h-px w-6 bg-ink md:w-[3vw] ${left ? "md:left-[calc(50%-3vw)]" : "md:left-1/2"}`}
              />
              <div className={left ? "md:col-start-1 md:pr-[4vw] md:text-right" : "md:col-start-2 md:pl-[4vw]"}>
                <h3 data-ap-head="" className="font-display text-[clamp(2rem,1rem+2.6vw,4rem)] leading-[1.05] tracking-[-0.02em]">
                  {s.name}
                </h3>
                <p data-ap-soft="" className={`mt-5 max-w-[30ch] text-lead ${left ? "md:ml-auto" : ""}`}>
                  {s.line}
                </p>
                <p data-ap-soft="" className={`mt-3 max-w-[40ch] text-small text-ink-muted ${left ? "md:ml-auto" : ""}`}>
                  {s.text}
                </p>
              </div>
            </li>
          );
        })}
        </ol>
      </div>
    </section>
  );
}
