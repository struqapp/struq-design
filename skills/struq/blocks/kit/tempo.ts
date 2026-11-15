// components/struq/kit/tempo.ts (Struq recipe)
// A block's own motion numbers, carried into the site's temperament. The weighted feel was measured from the blocks, so
// most of their numbers are already a feel token (0.9 is duration.enter, 0.09 is stagger.line) and a block reads the
// token. The rest are a block's own character: a 0.6s hover wipe, a 1.15s count, a 0.26s gate close. Those keep their
// weighted value and move with the temperament by their role: a number that is 0.6s in weighted is 0.6 * (0.6 / 0.9)
// in crisp and 0.6 * (1.3 / 0.9) in slow, because crisp's enter is 0.6s and slow's is 1.3s. Weighted gives every
// number back unchanged, so a block moves exactly as it did before a site picks crisp or slow.
//
// const f = feel(root);
// gsap.to(wipe, { scaleY: 1, duration: timeIn(f, 0.6), ease: f.ease.enter });
// gsap.from(chars, { yPercent: travelIn(f, 110), duration: timeIn(f, 1.4, "curtain"), stagger: staggerIn(f, 0.05, "word") });
//
// Scrub smoothing and hover timings scale the same way. Pointer-follow smoothing (quickTo), WebGL shader time and an
// ambient loop are not a temperament and stay a block's own number.
import { FEELS, type DurationRole, type Feel } from "./feel";

const W = FEELS.weighted;
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Seconds a block measured in the weighted feel, in this feel, by role (enter when unsaid). Weighted: unchanged. */
export function timeIn(f: Feel, weighted: number, role: DurationRole = "enter"): number {
  return f === W ? weighted : round((weighted * f.duration[role]) / W.duration[role]);
}

/** A stagger in seconds, by what is staggered (line when unsaid). Weighted: unchanged. */
export function staggerIn(f: Feel, weighted: number, kind: keyof Feel["stagger"] = "line"): number {
  return f === W ? weighted : round((weighted * f.stagger[kind]) / W.stagger[kind]);
}

/** A travel: text in yPercent of its line, a block in px (block when unsaid). Weighted: unchanged. */
export function travelIn(f: Feel, weighted: number, kind: "text" | "block" = "block"): number {
  return f === W ? weighted : round((weighted * f.travel[kind]) / W.travel[kind]);
}

/** Scrub smoothing in seconds, pinned or in flow (pinned when unsaid). Weighted: unchanged. */
export function scrubIn(f: Feel, weighted: number, kind: keyof Feel["scrub"] = "pinned"): number {
  return f === W ? weighted : round((weighted * f.scrub[kind]) / W.scrub[kind]);
}

/** A hover or press timing in milliseconds, by what it is (fill when unsaid). Weighted: unchanged. */
export function hoverIn(f: Feel, weighted: number, kind: keyof Feel["hover"] = "fill"): number {
  return f === W ? weighted : Math.round((weighted * f.hover[kind]) / W.hover[kind]);
}

/** The feel's ease for a curve a block wrote by hand, when that curve is one of the weighted roles; otherwise the curve. */
export function easeIn(f: Feel, weighted: string): string {
  if (weighted === W.ease.enter) return f.ease.enter;
  if (weighted === W.ease.exit) return f.ease.exit;
  if (weighted === W.ease.swap) return f.ease.swap;
  if (weighted === W.ease.curtain) return f.ease.curtain;
  return weighted;
}
