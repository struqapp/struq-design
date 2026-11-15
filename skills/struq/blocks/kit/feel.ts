// components/struq/kit/feel.ts (Struq recipe)
// The feel tokens: how everything on a Struq site moves, as three whole temperaments plus the values that never vary.
// A site picks one temperament with data-temperament="crisp|weighted|slow" on <body> (weighted when absent); any
// element may carry the attribute too, and the nearest one wins. Never mix values from two temperaments.
//
// - crisp: short, small travel, tight stagger, a hard curtain. A studio, a tool, a conference.
// - weighted: the house feel. expo.out arrivals, power3.inOut structure, power2.in exits, durations that grow with size.
// - slow: long, large travel, loose stagger, a soft curtain. A restaurant, ceramics, fashion.
//
// const f = feel(element);                       // the set for that element (SSR: weighted)
// gsap.from(lines, { yPercent: f.travel.text, duration: f.duration.line, ease: f.ease.enter, stagger: f.stagger.line });
// gsap.to(frame, { clipPath: "inset(0%)", duration: f.dur("curtain", frame.offsetHeight), ease: f.ease.curtain });
//
// CSS-only parts read the same set as custom properties (blocks.css, "--- motion ---"): --ease-enter, --dur-enter,
// --dur-hover-line and the rest, scoped by [data-temperament]. feelVars() returns exactly those, and a unit test holds
// blocks.css to it.
//
// Locked values (LOCKED) are correctness, not taste, and are the same object in every temperament: the reduced-motion
// rule (final state, no movement), the mask room that never clips g, j, p or y, the focus ring, the reveal trigger.

export const TEMPERAMENTS = ["crisp", "weighted", "slow"] as const;
export type Temperament = (typeof TEMPERAMENTS)[number];
export const DEFAULT_TEMPERAMENT: Temperament = "weighted";

/** What a motion is doing. Scrub is always linear: the reader's hand is the ease. */
export type EaseRole = "enter" | "exit" | "swap" | "curtain" | "scrub";
/** Durations by what moves: a block or group rising, a masked line, a leave, a structural swap, a curtain, a photo settling. */
export type DurationRole = "enter" | "line" | "exit" | "swap" | "curtain" | "settle";

export type Feel = {
  name: Temperament;
  /** GSAP ease names by role. */
  ease: Record<EaseRole, string>;
  /** Seconds, for an element up to GROWTH_FROM px. Use dur() for anything larger. */
  duration: Record<DurationRole, number>;
  /** How much longer the largest element (GROWTH_TO px and up) takes than the base: 0.3 is 30% longer. */
  growth: number;
  /** Travel: text in yPercent of its own line (over 100 starts fully under the mask), block in px, media as the photo's start scale. */
  travel: { text: number; block: number; media: number };
  /** Seconds between parts. */
  stagger: { line: number; word: number; block: number };
  /** Milliseconds: an underline drawing, a colour turning, a fill rising. */
  hover: { line: number; color: number; fill: number };
  /** Press: the sink and hover lift in px, the press in and the settle back in ms. */
  press: { sink: number; lift: number; in: number; out: number };
  /** ScrollTrigger scrub smoothing in seconds: pinned showpieces and in-flow scrubs. */
  scrub: { pinned: number; flow: number };
  /** Seconds for an element of `sizePx` (its travel or its larger side) in this role; grows with size, capped. */
  dur: (role: DurationRole, sizePx?: number) => number;
  locked: typeof LOCKED;
};

/** Below this size nothing grows (words, lines, buttons, small cards); at GROWTH_TO the full growth applies. */
export const GROWTH_FROM = 480;
export const GROWTH_TO = 1440;

/** One set, every temperament. Correctness, not taste. */
export const LOCKED = Object.freeze({
  /** Reduced motion: every primitive shows its final state at once. No fade, no travel, no scrub. */
  reducedMotion: Object.freeze({ query: "(prefers-reduced-motion: reduce)", behaviour: "final-state" as const }),
  /**
   * The room a text mask reaches beyond the line box, in em of the mask: the safest of the kit (0.3em above, 0.35em
   * below, measured over every canon face at leading 0.82) and the live site (0.42em below). Clips only vertically.
   */
  mask: Object.freeze({ top: "0.3em", bottom: "0.42em" }),
  /** Keyboard focus: a solid ring in the accent, outside the control, never moved or clipped by it. */
  focus: Object.freeze({ width: "2px", offset: "3px", color: "var(--accent)" }),
  /** Where an on-enter reveal fires, and that it fires once. */
  trigger: Object.freeze({ start: "top 85%", once: true }),
});

/** The CSS twin of every GSAP ease the sets use, so a CSS transition moves on the same curve. */
export const CSS_EASE: Record<string, string> = {
  none: "linear",
  "expo.out": "cubic-bezier(0.16, 1, 0.3, 1)",
  "power4.out": "cubic-bezier(0.22, 1, 0.36, 1)",
  "power1.in": "cubic-bezier(0.12, 0, 0.39, 0)",
  "power2.in": "cubic-bezier(0.32, 0, 0.67, 0)",
  "power3.in": "cubic-bezier(0.5, 0, 0.75, 0)",
  "power2.inOut": "cubic-bezier(0.65, 0, 0.35, 1)",
  "power3.inOut": "cubic-bezier(0.76, 0, 0.24, 1)",
  "power4.inOut": "cubic-bezier(0.83, 0, 0.17, 1)",
};

type Values = Omit<Feel, "dur" | "locked" | "name">;

const VALUES: Record<Temperament, Values> = {
  crisp: {
    ease: { enter: "power4.out", exit: "power3.in", swap: "power4.inOut", curtain: "power4.inOut", scrub: "none" },
    duration: { enter: 0.6, line: 0.85, exit: 0.25, swap: 0.7, curtain: 0.9, settle: 1.2 },
    growth: 0.2,
    travel: { text: 105, block: 24, media: 1.15 },
    stagger: { line: 0.06, word: 0.03, block: 0.05 },
    hover: { line: 240, color: 180, fill: 320 },
    press: { sink: 1, lift: 1, in: 90, out: 360 },
    scrub: { pinned: 0.6, flow: 0.25 },
  },
  // The house feel, as STANDARD_INVENTORY.md section 1.8 measured it in the blocks.
  weighted: {
    ease: { enter: "expo.out", exit: "power2.in", swap: "power3.inOut", curtain: "power4.inOut", scrub: "none" },
    duration: { enter: 0.9, line: 1.25, exit: 0.35, swap: 1, curtain: 1.4, settle: 1.8 },
    growth: 0.3,
    travel: { text: 115, block: 48, media: 1.3 },
    stagger: { line: 0.09, word: 0.045, block: 0.08 },
    hover: { line: 360, color: 280, fill: 500 },
    press: { sink: 1, lift: 2, in: 120, out: 600 },
    scrub: { pinned: 1, flow: 0.4 },
  },
  slow: {
    ease: { enter: "expo.out", exit: "power1.in", swap: "power2.inOut", curtain: "power2.inOut", scrub: "none" },
    duration: { enter: 1.3, line: 1.7, exit: 0.5, swap: 1.4, curtain: 1.9, settle: 2.4 },
    growth: 0.4,
    travel: { text: 125, block: 72, media: 1.4 },
    stagger: { line: 0.14, word: 0.07, block: 0.12 },
    hover: { line: 520, color: 400, fill: 750 },
    press: { sink: 1, lift: 3, in: 160, out: 900 },
    scrub: { pinned: 1.5, flow: 0.6 },
  },
};

function build(name: Temperament): Feel {
  const values = VALUES[name];
  const dur = (role: DurationRole, sizePx = 0) => {
    const t = Math.min(1, Math.max(0, (sizePx - GROWTH_FROM) / (GROWTH_TO - GROWTH_FROM)));
    return Math.round(values.duration[role] * (1 + values.growth * t) * 1000) / 1000;
  };
  return Object.freeze({ name, ...values, dur, locked: LOCKED });
}

/** The three sets, built once. */
export const FEELS: Record<Temperament, Feel> = {
  crisp: build("crisp"),
  weighted: build("weighted"),
  slow: build("slow"),
};

/** A temperament name, or weighted for anything else. */
export function temperamentOf(value: string | null | undefined): Temperament {
  return (TEMPERAMENTS as readonly string[]).includes(value ?? "") ? (value as Temperament) : DEFAULT_TEMPERAMENT;
}

/**
 * The feel for a temperament name, or for an element (its nearest [data-temperament], then <body>). With no argument
 * it reads <body>. Server-side, and for an unknown name, it is weighted.
 */
export function feel(source?: Temperament | string | Element | null): Feel {
  if (typeof source === "string") return FEELS[temperamentOf(source)];
  if (typeof document === "undefined") return FEELS[DEFAULT_TEMPERAMENT];
  const holder = source?.closest?.("[data-temperament]") ?? document.body;
  return FEELS[temperamentOf(holder?.getAttribute("data-temperament"))];
}

/** Whether the reader asked for reduced motion. False on the server. */
export function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia(LOCKED.reducedMotion.query).matches;
}

/** The custom properties blocks.css sets for a temperament (the "--- motion ---" section). */
export function feelVars(name: Temperament): Record<string, string> {
  const f = FEELS[name];
  const s = (seconds: number) => `${seconds}s`;
  const ms = (value: number) => `${value}ms`;
  return {
    "--ease-enter": CSS_EASE[f.ease.enter],
    "--ease-exit": CSS_EASE[f.ease.exit],
    "--ease-swap": CSS_EASE[f.ease.swap],
    "--ease-curtain": CSS_EASE[f.ease.curtain],
    "--dur-enter": s(f.duration.enter),
    "--dur-line": s(f.duration.line),
    "--dur-exit": s(f.duration.exit),
    "--dur-swap": s(f.duration.swap),
    "--dur-curtain": s(f.duration.curtain),
    "--dur-hover-line": ms(f.hover.line),
    "--dur-hover-color": ms(f.hover.color),
    "--dur-hover-fill": ms(f.hover.fill),
    "--dur-press-in": ms(f.press.in),
    "--dur-press-out": ms(f.press.out),
    "--press-sink": `${f.press.sink}px`,
    "--press-lift": `${f.press.lift}px`,
    "--travel-block": `${f.travel.block}px`,
    "--stagger-word": s(f.stagger.word),
  };
}
