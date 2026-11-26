// app/scenes/schedule.ts: when the roof stands in the rain, is stripped, built and rained on, as shares of each
// scene's own scroll (0 when the section's top reaches the top of the screen, 1 when its bottom does). The world and
// the Lagen list both read it, so the layer named on the page is always the layer being laid.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
export const between = (t: number, a: number, b: number) => smooth(clamp01((t - a) / (b - a)));

/** Droog, the opening: the finished roof in the rain, then stripped as Lagen comes in. */
export const OPENING = { rainFrom: 0.42, rainTo: 0.52, stripFrom: 0.56, stripTo: 0.98 };

/** Lagen: bare rafters, the layers laid one by one (linear, so every layer gets the same scroll), then the rain. */
export const LAGEN = { buildFrom: 0.06, buildTo: 0.62, rainFrom: 0.64, rainTo: 0.72 };

/** The roof's build with only the first of its five layers on: the bare rafters the opening strips it down to. */
export const BARE = 1 / 5;

/** How far the roof is built at a point of Lagen's own scroll: from the bare rafters to finished. */
export const lagenBuild = (t: number) => BARE + (1 - BARE) * clamp01((t - LAGEN.buildFrom) / (LAGEN.buildTo - LAGEN.buildFrom));
