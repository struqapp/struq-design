"use client";
// components/struq/kit/gl/world/beats.tsx (Struq kit): the page's sections as beats of one scroll.
//
// Mark every section of the page with its beat, inside <main>:
//   <section data-beat="opening">...</section>
//   <section data-beat="craft">...</section>
// BeatsProvider measures where each one sits in the page scroll and hands the 3D world signals to read:
//   const { page, beat, on } = useBeats();
//   page            the whole page, 0 at the top to 1 at the bottom
//   beat("craft")   0 when the section's top reaches the top of the screen, 1 when its bottom does
//   on("finale")    1 while the section holds the screen, easing in as it arrives and out as it leaves:
//                   the signal for a light that comes on for one scene (glow={on("finale")})
//   range("craft")  { from, to }: the section's share of the page scroll, for your own span(page, a, b)
// Every value is read live inside useFrame, so it never goes stale, and the shares are measured again when the page
// resizes, a font or an image loads, or a pin changes the page's height. World puts a BeatsProvider round itself;
// wrap the page in your own when its DOM also needs the beats.
//
// Only the outermost [data-beat] elements count: a data-beat inside a section belongs to that section's own timeline.
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Signal } from "../signals";

export type BeatRange = { name: string; from: number; to: number };

export type Beats = {
  /** The whole page's scroll, 0 at the top to 1 at the bottom. */
  page: Signal;
  /** 0 to 1 across one section: from its top at the top of the screen to its bottom there. */
  beat: (name: string, ease?: (t: number) => number) => Signal;
  /** 1 while the section holds the screen, eased in as it arrives and out as it leaves. */
  on: (name: string) => Signal;
  /** One section's share of the page scroll. */
  range: (name: string) => BeatRange | undefined;
  /** Every beat in page order. */
  ranges: BeatRange[];
  /** One screen of scroll in page units (0 to 1). */
  screen: number;
  /** Where the framed object stands in the world, written by Framed each frame; World lights the wall behind it. */
  focus: { current: [number, number, number] | null };
};

const BeatsContext = createContext<Beats | null>(null);

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);

type Measure = { ranges: BeatRange[]; byName: Map<string, BeatRange>; max: number; screen: number };

function measure(root: string): Measure {
  const vh = window.innerHeight || 1;
  const max = Math.max(1, document.documentElement.scrollHeight - vh);
  const scope = document.querySelector(root) ?? document.body;
  const ranges: BeatRange[] = [];
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>("[data-beat]"))) {
    if (el.parentElement?.closest("[data-beat]")) continue;
    const name = el.dataset.beat;
    if (!name) continue;
    const top = el.getBoundingClientRect().top + window.scrollY;
    ranges.push({ name, from: clamp01(top / max), to: clamp01((top + el.offsetHeight) / max) });
  }
  ranges.sort((a, b) => a.from - b.from);
  return { ranges, byName: new Map(ranges.map((r) => [r.name, r])), max, screen: Math.min(1, vh / max) };
}

const same = (a: Measure, b: Measure) =>
  a.max === b.max && a.ranges.length === b.ranges.length && a.ranges.every((r, i) => r.name === b.ranges[i].name && r.from === b.ranges[i].from && r.to === b.ranges[i].to);

type ProviderProps = {
  children: ReactNode;
  /** The element that holds the sections. Default "main". */
  root?: string;
};

export function BeatsProvider({ children, root = "main" }: ProviderProps) {
  const state = useRef<Measure>({ ranges: [], byName: new Map(), max: 1, screen: 1 });
  const [version, setVersion] = useState(0);
  const focus = useRef<[number, number, number] | null>(null);

  useEffect(() => {
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = measure(root);
        if (same(next, state.current)) return;
        state.current = next;
        setVersion((v) => v + 1);
      });
    };
    run();
    const scope = document.querySelector(root) ?? document.body;
    const ro = new ResizeObserver(run);
    ro.observe(scope);
    ro.observe(document.documentElement);
    window.addEventListener("resize", run);
    window.addEventListener("load", run);
    document.fonts?.ready.then(run).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("load", run);
    };
  }, [root]);

  const value = useMemo<Beats>(() => {
    const st = state.current;
    const page: Signal = {
      get current() {
        return typeof window === "undefined" ? 0 : clamp01(window.scrollY / state.current.max);
      },
    };
    const beat = (name: string, ease: (t: number) => number = (t) => t): Signal => ({
      get current() {
        const r = state.current.byName.get(name);
        if (!r) return 0;
        return ease(clamp01((page.current - r.from) / (r.to - r.from || 1)));
      },
    });
    const on = (name: string): Signal => ({
      get current() {
        const r = state.current.byName.get(name);
        if (!r) return 0;
        const s = state.current.screen;
        const p = page.current;
        const all = state.current.ranges;
        // The first beat is on from the top, the last stays on to the end of the page.
        const rise = r === all[0] ? 1 : smooth(clamp01((p - (r.from - 0.6 * s)) / (0.6 * s)));
        const fall = r === all[all.length - 1] ? 0 : smooth(clamp01((p - (r.to - 0.4 * s)) / (0.4 * s)));
        return rise * (1 - fall);
      },
    });
    return { page, beat, on, range: (name) => state.current.byName.get(name), ranges: st.ranges, screen: st.screen, focus };
    // version is the measure: a new value tells every reader the shares moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return <BeatsContext.Provider value={value}>{children}</BeatsContext.Provider>;
}

/** The page's beats. Call it inside World (or your own BeatsProvider). */
export function useBeats(): Beats {
  const beats = useContext(BeatsContext);
  if (!beats) throw new Error("useBeats needs a BeatsProvider: put the 3D inside <World>, or wrap the page in <BeatsProvider>.");
  return beats;
}

/** True when a BeatsProvider is already round this component. */
export function useHasBeats() {
  return useContext(BeatsContext) !== null;
}

/**
 * The schedule BeatCamera and Framed share: each beat's pose is reached `lead` before the beat starts and held until
 * the move to the next one, which takes `travel`. Both in page units.
 */
export type Stop = { name: string; at: number; until: number };

export function useStops(lead?: number, travel?: number): Stop[] {
  const { ranges, screen } = useBeats();
  return useMemo(() => {
    const l = lead ?? 0.25 * screen;
    const tr = travel ?? 0.5 * screen;
    const at = ranges.map((r, i) => (i === 0 ? 0 : clamp01(r.from - l)));
    return ranges.map((r, i) => ({
      name: r.name,
      at: at[i],
      until: i < ranges.length - 1 ? Math.max(at[i], at[i + 1] - tr) : 1,
    }));
  }, [ranges, screen, lead, travel]);
}

/** Where progress `p` sits in the schedule: between stop `a` and stop `b`, `t` of the way (eased). */
export function locate(stops: Stop[], p: number) {
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const next = stops[i + 1];
    if (!next || p < s.until) return { a: i, b: i, t: 0 };
    if (p < next.at) return { a: i, b: i + 1, t: smooth(clamp01((p - s.until) / (next.at - s.until || 1))) };
  }
  return { a: 0, b: 0, t: 0 };
}
