"use client";
// background-facets (Struq background recipe)
// Facetten: a full-screen hero whose ground is a surface of cut planes, like folded paper or cut glass on a studio
// model, each plane catching a slow travelling light. The planes stand in steps off the page ground (flat shading,
// one tone per plane, from the ground towards white where lit and towards the ink in shadow), the creases are crisp
// unbroken hairlines drawn only where two planes actually meet at an angle, and a crease that catches the light takes
// the palette's accent; the planes themselves are never filled with it. Two short display lines, one lead sentence
// and one link sit on the calm side, where the surface lies flat and is the page ground itself. The surface lies flat
// into the ground over the bottom fifth of the hero, so the hand-over to the next section has no seam.
//
// <BackgroundFacets variant="shard" lines={["Ruimte die", "licht vangt"]}
//   lead="Noord ontwerpt woningen en ateliers in Rotterdam." link={{ label: "Bekijk het werk", href: "#werk" }} />
//
// Variants (different compositions and moves of the same surface, each in light and dark):
//   shard   a few cut shards standing apart in the right third, each a pyramid of unequal planes on its own
//           footprint, pointing out from the cluster, a light circling them; type on the calm left.
//   relief  the whole screen a very low relief of large planes, a broad light sweeping slowly across; type bottom left,
//           where the relief is lowest.
//   turn    diagonal pleats in the upper left; the light turns across them as the hero leaves (scrubbed by scroll)
//           and leans a little toward the pointer; type bottom right.
//
// How it is drawn (raw WebGL2, no library). The surface is a height per point of a triangle lattice (the simplex
// lattice, equilateral triangles at -15, 45 and 105 degrees). The heights are computed in script, a few thousand
// points a frame, and uploaded as a small float texture; one fragment pass finds each pixel's triangle, shades it
// flat from its normal and draws a crease on each of its three edges where the neighbour across it folds. Every
// height function is built only from functions of the three lattice line coordinates with breaks on whole lattice
// lines, so the creases fall exactly on lattice edges: big clean planes and straight folds, never a triangle mesh.
// The shards are not on the lattice: each is the lowest of a few planes through one apex (a convex pyramid over its
// footprint, every face its own slope and normal), evaluated per pixel in the same pass, so their ridges are exact
// straight lines at any angle. The colours
// are the block's own custom properties (--surface-0, --ink, --accent), read at runtime and read again when the page
// switches palette or theme. No colour is written here.
//
// Entrance: the canvas stays hidden until its first frame (the flat ground) is drawn, then fades in; once nothing
// covers the page the surface folds up out of the flat ground while the lines rise through their masks. Pointer
// (turn only) eases in over about 0.18 s. Performance: device pixel ratio capped at 1.5 (1.25 on phones), the loop
// stops off screen and in a hidden tab, everything is disposed on unmount, and a lost context is rebuilt when the
// browser restores it. Phones: a lighter surface (fewer fold families and shards, bigger cells) that still moves.
// Reduced motion: one still frame, held. No WebGL2 (or a program that will not build): the same still drawn once on a
// 2D canvas. No scripts: the composed
// hero on the plain ground (blocks.css, "--- background-facets ---", with the 3 s fallback for the lines).
import { useEffect, useRef } from "react";
import { gsap } from "../kit/gsap";
import { whenUncovered } from "../preloaders/preloader-slices-uncovered";

export type FacetsVariant = "shard" | "relief" | "turn";

/** The three variants, first is the default. */
export const FACETS_VARIANTS: { id: FacetsVariant; title: string; does: string }[] = [
  {
    id: "shard",
    title: "Kristal",
    does: "A few cut shards stand apart in the right third, each a pyramid of unequal planes, while a light circles them and each plane and ridge catches it in turn; the type sits on the flat ground to the left.",
  },
  {
    id: "relief",
    title: "Reliëf",
    does: "The whole screen is a very low relief of large planes that tilt slowly, and a broad band of light sweeps across them; the relief is lowest under the type, bottom left.",
  },
  {
    id: "turn",
    title: "Draai",
    does: "Diagonal pleats fill the upper left; the light turns across them as the hero scrolls away, flipping which pleats are lit, and leans toward the pointer.",
  },
];

type Props = {
  variant?: FacetsVariant;
  /** Two short display lines. */
  lines: [string, string];
  /** One lead sentence. */
  lead: string;
  /** One text link. */
  link: { label: string; href: string };
  className?: string;
};

type RGB = [number, number, number];

const F2 = 0.3660254037844386;
const G2 = 0.21132486540518713;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Smooth 1D value noise in -1..1. */
const vnoise = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return (hash(i) * (1 - u) + hash(i + 1) * u) * 2 - 1;
};
const luminance = ([r, g, b]: RGB) => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/**
 * One family of parallel folds: a piecewise linear function of one lattice line coordinate (c1 = I.x, c2 = I.y,
 * c3 = I.x - I.y) with its breaks (knots) on whole lattice lines, so its creases are lattice edges.
 */
type Family = {
  axis: 1 | 2 | 3;
  min: number;
  /** Per whole coordinate from `min`: the knot to its left and how far towards the next it is. */
  seg: Int32Array;
  frac: Float32Array;
  /** Per knot: its weight from the composition, and a seed. */
  ramp: Float32Array;
  seed: Float32Array;
  /** Per knot: its lattice coordinate. */
  at: Float32Array;
  /** Per knot, per frame: its height. */
  value: Float32Array;
};

/**
 * One shard: a convex footprint (counterclockwise, CSS px, y up from the section's bottom) and an apex inside it at
 * height `h`. Its faces are the triangles from the apex to each footprint edge, each with its own slope.
 */
type Crystal = { ax: number; ay: number; pts: number[]; h: number; phase: number };

/** One face of a shard for a frame: its plane as gradient and height at the apex, and its corners on screen. */
type Face = { gx: number; gy: number; ax: number; ay: number; h: number; tri: number[]; beam: number };

/** The most shards and faces per shard the shader takes. */
const MAX_SHARDS = 6;
const MAX_FACES = 8;

type Plan = {
  variant: FacetsVariant;
  W: number;
  H: number;
  scale: number;
  cell: number;
  drift: number;
  offX: number;
  offY: number;
  tw: number;
  th: number;
  heights: Float32Array;
  families: Family[];
  crystals: Crystal[];
  /** The rect the type stands in, y up from the section's bottom, CSS px; and how quiet the surface is there. */
  quiet: { x0: number; y0: number; x1: number; y1: number; level: number; feather: number } | null;
  look: { tone: number; glint: number; sharp: number; line: number };
};

type Light = { L: [number, number, number]; beam: [number, number, number, number]; beamOn: number };

type Colours = { ground: RGB; ink: RGB; accent: RGB; shadow: RGB; lit: RGB; glint: RGB; dark: boolean };

const lineCoord = (axis: 1 | 2 | 3, ix: number, iy: number) => (axis === 1 ? ix : axis === 2 ? iy : ix - iy);

/** The screen position (CSS px, origin at the lattice origin) that sets a knot's weight. */
function knotPlace(axis: 1 | 2 | 3, c: number, cell: number, W: number, H: number) {
  // c1 = (x (1 + F2) + y F2) / cell, c2 = (y (1 + F2) + x F2) / cell, c3 = (x - y) / cell.
  if (axis === 1) return (c * cell - F2 * H * 0.5) / (1 + F2); // x where the line crosses mid height
  if (axis === 2) return (c * cell - F2 * W * 0.5) / (1 + F2); // y where the line crosses mid width
  return c * cell; // x - y
}

function family(
  axis: 1 | 2 | 3,
  min: number,
  max: number,
  gap: (k: number) => number,
  weight: (place: number) => number,
  cell: number,
  W: number,
  H: number,
  seed: number,
): Family {
  const knots: number[] = [];
  let c = min - 8;
  let k = 0;
  while (c <= max + 8) {
    knots.push(c);
    c += gap(k);
    k += 1;
  }
  knots.push(c);
  const span = max - min + 1;
  const seg = new Int32Array(span);
  const frac = new Float32Array(span);
  let j = 0;
  for (let n = 0; n < span; n += 1) {
    const at = min + n;
    while (j < knots.length - 2 && knots[j + 1] <= at) j += 1;
    seg[n] = j;
    frac[n] = (at - knots[j]) / (knots[j + 1] - knots[j]);
  }
  const ramp = new Float32Array(knots.length);
  const seeds = new Float32Array(knots.length);
  knots.forEach((kc, i) => {
    ramp[i] = weight(knotPlace(axis, kc, cell, W, H));
    seeds[i] = seed + i * 1.37;
  });
  return { axis, min, seg, frac, ramp, seed: seeds, at: Float32Array.from(knots), value: new Float32Array(knots.length) };
}

/** Lays out the lattice, the composition and the look for one size. */
function makePlan(variant: FacetsVariant, W: number, H: number, quietBox: DOMRect | null): Plan {
  const phone = W < 768;
  const scale = Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5);
  const cell =
    variant === "shard"
      ? Math.max(18, Math.min(30, W / 46))
      : variant === "relief"
        ? Math.max(28, Math.min(46, W / 30))
        : Math.max(24, Math.min(40, W / 36));
  const drift = H * 0.28;
  // The lattice range that covers the canvas at every drift (the origin moves down by up to `drift`).
  const px = [0, W / cell];
  const py = [0, (H + drift) / cell];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const x of px)
    for (const y of py) {
      const s = (x + y) * F2;
      minX = Math.min(minX, x + s);
      maxX = Math.max(maxX, x + s);
      minY = Math.min(minY, y + s);
      maxY = Math.max(maxY, y + s);
    }
  const offX = Math.floor(minX) - 4;
  const offY = Math.floor(minY) - 4;
  const tw = Math.ceil(maxX) + 4 - offX + 1;
  const th = Math.ceil(maxY) + 4 - offY + 1;
  const families: Family[] = [];
  const crystals: Crystal[] = [];
  const cMin = (axis: 1 | 2 | 3) => (axis === 1 ? offX : axis === 2 ? offY : offX - (offY + th));
  const cMax = (axis: 1 | 2 | 3) => (axis === 1 ? offX + tw : axis === 2 ? offY + th : offX + tw - offY);

  let quiet: Plan["quiet"] = null;
  if (quietBox) {
    const pad = 12;
    quiet = {
      x0: quietBox.left - pad,
      x1: quietBox.right + pad,
      y0: H - quietBox.bottom - pad,
      y1: H - quietBox.top + pad,
      level: variant === "relief" ? 0.12 : 0,
      feather: cell * (variant === "turn" ? 2.5 : 1.6),
    };
  }

  if (variant === "shard") {
    // A few shards standing apart in the right third (above the type on phones), each pointing out from the
    // cluster's middle. Footprints never overlap, so no edge runs through another shard.
    const rx0 = phone ? W * 0.06 : Math.max(W * 0.55, quiet ? quiet.x1 + 56 : 0);
    const rx1 = phone ? W * 0.94 : W * 0.965;
    const ry0 = phone ? Math.max(H * 0.38, quiet ? quiet.y1 + 28 : 0) : H * 0.2;
    const ry1 = phone ? H * 0.95 : H * 0.92;
    const rw = Math.max(1, rx1 - rx0);
    const rh = Math.max(1, ry1 - ry0);
    const D = Math.min(rw, rh);
    const mx = rx0 + rw * 0.5;
    const my = ry0 + rh * 0.5;
    // [x, y (up)] in the region, half length as a share of its smaller side.
    const list: [number, number, number][] = phone
      ? [
          [0.4, 0.48, 0.36],
          [0.84, 0.8, 0.2],
          [0.82, 0.18, 0.2],
        ]
      : [
          [0.44, 0.52, 0.34],
          [0.82, 0.82, 0.19],
          [0.84, 0.24, 0.22],
          [0.15, 0.17, 0.17],
          [0.13, 0.84, 0.15],
        ];
    const items = list.map(([u, v, size], i) => {
      const x = rx0 + u * rw;
      const y = ry0 + v * rh;
      const out = Math.hypot(x - mx, y - my) > D * 0.08 ? Math.atan2(y - my, x - mx) : 1.3;
      return { x, y, L: size * D, phi: out + (hash(i * 4.1 + 2.3) - 0.5) * 0.5, i };
    });
    // Push apart until no two reaches touch, kept inside the region; then shrink any pair still too close.
    for (let pass = 0; pass < 40; pass += 1) {
      for (let a = 0; a < items.length; a += 1)
        for (let b = a + 1; b < items.length; b += 1) {
          const p = items[a];
          const q = items[b];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const need = (p.L + q.L) * 1.06;
          if (dist >= need) continue;
          const push = (need - dist) / 2;
          p.x -= (dx / dist) * push;
          p.y -= (dy / dist) * push;
          q.x += (dx / dist) * push;
          q.y += (dy / dist) * push;
        }
      for (const p of items) {
        p.x = Math.min(rx1 - p.L * 0.8, Math.max(rx0 + p.L * 0.8, p.x));
        p.y = Math.min(ry1 - p.L * 0.8, Math.max(ry0 + p.L * 0.8, p.y));
      }
    }
    for (let a = 0; a < items.length; a += 1)
      for (let b = a + 1; b < items.length; b += 1) {
        const p = items[a];
        const q = items[b];
        const k = Math.hypot(q.x - p.x, q.y - p.y) / ((p.L + q.L) * 1.06);
        if (k < 1) {
          p.L *= k;
          q.L *= k;
        }
      }
    // A pointed footprint (x along the shard to its tip, y across), counterclockwise; each shard nudges its
    // corners, may drop one, and leans its apex towards the tip, so no two faces share a slope.
    const shape: [number, number][] = [
      [1.0, 0.0],
      [0.5, 0.38],
      [-0.3, 0.46],
      [-0.8, 0.22],
      [-0.86, -0.18],
      [-0.4, -0.44],
      [0.42, -0.36],
    ];
    for (const { x, y, L, phi, i } of items) {
      const seed = 19.7 + i * 7.9;
      const wide = 0.72 + 0.3 * hash(seed);
      const flip = hash(seed + 1) < 0.5 ? -1 : 1;
      const drop = hash(seed + 2) < 0.5 ? 3 + Math.floor(hash(seed + 3) * 2) : -1;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const local = shape
        .filter((_, k) => k !== drop)
        .map(([px, py], k): [number, number] => [px + (hash(seed + 5 + k) - 0.5) * 0.1, (py + (hash(seed + 13 + k) - 0.5) * 0.1) * wide]);
      if (flip < 0) local.reverse().forEach((p) => (p[1] = -p[1]));
      const pts: number[] = [];
      for (const [px, py] of local) pts.push(x + (px * c - py * s) * L, y + (px * s + py * c) * L);
      const ox = 0.2 + 0.16 * hash(seed + 4);
      const oy = (hash(seed + 6) - 0.5) * 0.12 * wide;
      crystals.push({
        ax: x + (ox * c - oy * s) * L,
        ay: y + (ox * s + oy * c) * L,
        pts,
        h: L * (0.26 + 0.1 * hash(seed + 7)),
        phase: i * 1.7,
      });
    }
  } else if (variant === "relief") {
    // Three families of large folds over the whole screen, each heaviest away from the type (bottom left):
    // near vertical folds stronger to the right, near horizontal ones stronger to the top, diagonals to the bottom
    // right. Knots every 3 to 7 lines, so the planes are large and unequal.
    const amp = 0.55;
    const gap = (seed: number) => (k: number) => 2 + Math.floor(hash(seed + k * 7.31) * 3);
    families.push(family(1, cMin(1), cMax(1), gap(11), (x) => amp * (0.3 + 0.7 * smooth(W * 0.35, W * 0.85, x)), cell, W, H, 3.1));
    families.push(family(2, cMin(2), cMax(2), gap(23), (y) => amp * (0.3 + 0.7 * smooth(H * 0.45, H * 0.95, y)), cell, W, H, 17.9));
    if (!phone)
      families.push(family(3, cMin(3), cMax(3), gap(37), (u) => amp * 0.8 * (0.25 + 0.75 * smooth(W * 0.2, W * 0.75, u)), cell, W, H, 41.3));
  } else {
    // Pleats along the 45 degree lattice lines, three to five lines apart, alternately up and down, full in the upper
    // left and fading out towards the type, bottom right (above it on phones). The fade ends a feather short of the
    // type's corner (u = x - y, the pleat's own coordinate), so no part plane is left beside the lines.
    let u1 = phone ? -H * 0.3 : W * 0.3;
    if (!phone && quiet) u1 = Math.min(u1, quiet.x0 - quiet.y1 - quiet.feather);
    const u0 = phone ? -H * 0.5 : u1 - W * 0.2;
    families.push(
      family(3, cMin(3), cMax(3), (k) => 3 + Math.floor(hash(71 + k * 5.3) * 3), (u) => 0.7 * (1 - smooth(u0, u1, u)), cell, W, H, 5.7),
    );
    // Near vertical cuts across the pleats, so each pleat breaks into a run of planes at different angles rather than
    // one long stripe. Kept to the left, well clear of the type; phones keep the pleats alone.
    if (!phone)
      families.push(
        family(1, cMin(1), cMax(1), (k) => 5 + Math.floor(hash(53 + k * 3.7) * 5), (x) => 0.4 * (1 - smooth(W * 0.24, W * 0.44, x)), cell, W, H, 29.3),
      );
  }
  const look =
    variant === "shard"
      ? { tone: 1.8, glint: 0.9, sharp: 40, line: 0.3 }
      : variant === "relief"
        ? { tone: 3.1, glint: 0.75, sharp: 12, line: 0.26 }
        : { tone: 1.3, glint: 0.8, sharp: 26, line: 0.26 };
  return {
    variant,
    W,
    H,
    scale,
    cell,
    drift,
    offX,
    offY,
    tw,
    th,
    heights: new Float32Array(tw * th),
    families,
    crystals,
    quiet,
    look,
  };
}

/**
 * The heights for one frame: the variant's surface folded up by `reveal`. The GPU quietens the type's rect per pixel
 * (scaling heights there would tilt every lattice triangle in the feather a little differently and show them as
 * small steps); the 2D still has no such pass, so it asks for the quiet in the heights (`geoQuiet`).
 */
function fillHeights(plan: Plan, t: number, reveal: number, originY: number, geoQuiet: boolean, dark = false) {
  const { families, heights, tw, th, offX, offY, cell, quiet, variant } = plan;
  if (!families.length) {
    heights.fill(0);
    return;
  }
  // On a dark ground the relief's three families of folds, a crease every two to four lines in each direction, light
  // up as one regular lattice and read as a grid. There about half the knots lie flat (never two side by side): each
  // takes the straight line between its neighbours, so its crease is gone and the planes either side merge into one,
  // larger and unequal, and no direction keeps an even beat.
  const thin = dark && variant === "relief";
  for (const f of families) {
    for (let j = 0; j < f.value.length; j += 1) {
      if (variant === "turn" && f.axis === 3) {
        // Alternate up and down, each pleat at its own depth, breathing a little on its own.
        f.value[j] = (j % 2 === 0 ? 1 : -1) * f.ramp[j] * (0.45 + 0.55 * hash(f.seed[j])) * (0.88 + 0.12 * vnoise(f.seed[j] + t * 0.06));
      } else {
        f.value[j] = f.ramp[j] * vnoise(f.seed[j] + t * 0.035);
      }
    }
    if (thin) {
      let skipped = false;
      for (let j = 1; j < f.value.length - 1; j += 1) {
        if (skipped || hash(f.seed[j] * 1.91 + 0.37) >= 0.55) {
          skipped = false;
          continue;
        }
        const w = (f.at[j] - f.at[j - 1]) / (f.at[j + 1] - f.at[j - 1]);
        f.value[j] = f.value[j - 1] * (1 - w) + f.value[j + 1] * w;
        skipped = true;
      }
    }
  }
  for (let j = 0; j < th; j += 1) {
    const iy = offY + j;
    for (let i = 0; i < tw; i += 1) {
      const ix = offX + i;
      let h = 0;
      for (const f of families) {
        const n = lineCoord(f.axis, ix, iy) - f.min;
        const s = f.seg[n];
        const w = f.frac[n];
        let c = f.value[s] * (1 - w) + f.value[s + 1] * w;
        // Each pleat steps to a new depth every few cells along its own length, so it reads as a run of crisp planes,
        // never one stripe, and no second family of bands has to cross it.
        if (variant === "turn" && f.axis === 3) c *= 0.55 + 0.45 * hash(97.3 + Math.floor((ix + iy) / 7));
        h += c;
      }
      if (quiet && geoQuiet) {
        const x = (ix - (ix + iy) * G2) * cell;
        const y = (iy - (ix + iy) * G2) * cell + originY;
        const f = quiet.feather;
        const inX = smooth(quiet.x0 - f, quiet.x0, x) * (1 - smooth(quiet.x1, quiet.x1 + f, x));
        const inY = smooth(quiet.y0 - f, quiet.y0, y) * (1 - smooth(quiet.y1, quiet.y1 + f, y));
        h *= 1 - inX * inY * (1 - quiet.level);
      }
      heights[j * tw + i] = h * reveal;
    }
  }
}

/** Where a point (CSS px, y up) stands in the light's broad beam: 1 in its middle, as the shader reads it. */
function beamAt(plan: Plan, light: Light, x: number, y: number) {
  const u = (x * light.beam[0] + y * light.beam[1]) / plan.H;
  return 1 + (Math.exp(-(((u - light.beam[2]) / light.beam[3]) ** 2)) - 1) * light.beamOn;
}

/**
 * The shards' faces for one frame, on screen (CSS px, y up): each shard breathes a little, folds up with `reveal`
 * and moves with the surface (`originY`). A face's plane passes through the apex at the shard's height and through
 * its footprint edge at the ground.
 */
function shardFaces(plan: Plan, t: number, reveal: number, originY: number, light: Light): Face[][] {
  return plan.crystals.map((c) => {
    const h = c.h * reveal * (1 + 0.08 * Math.sin(t * 0.13 + c.phase));
    const ax = c.ax;
    const ay = c.ay + originY;
    const n = c.pts.length / 2;
    const faces: Face[] = [];
    for (let k = 0; k < n; k += 1) {
      const x0 = c.pts[k * 2];
      const y0 = c.pts[k * 2 + 1] + originY;
      const x1 = c.pts[((k + 1) % n) * 2];
      const y1 = c.pts[((k + 1) % n) * 2 + 1] + originY;
      // The edge's outward normal (counterclockwise footprint) and the apex's distance to the edge.
      const ex = x1 - x0;
      const ey = y1 - y0;
      const el = Math.hypot(ex, ey) || 1;
      const ux = ey / el;
      const uy = -ex / el;
      const d = Math.max(1e-3, (x0 - ax) * ux + (y0 - ay) * uy);
      const slope = h / d;
      faces.push({
        gx: -slope * ux,
        gy: -slope * uy,
        ax,
        ay,
        h,
        tri: [ax, ay, x0, y0, x1, y1],
        beam: beamAt(plan, light, (ax + x0 + x1) / 3, (ay + y0 + y1) / 3),
      });
    }
    return faces;
  });
}

/** The light for one frame. `turn` is the scrubbed scroll progress, `ptr` the eased pointer (-1..1, y up). */
function lightFor(plan: Plan, t: number, turn: number, ptr: [number, number]): Light {
  const aspect = plan.W / plan.H;
  let az: number;
  let el: number;
  let beam: [number, number, number, number] = [1, 0, 0, 1];
  let beamOn = 0;
  if (plan.variant === "shard") {
    az = 0.9 + t * 0.09;
    el = 0.5 + 0.26 * Math.sin(t * 0.07);
    const cycle = 16;
    const k = (t % cycle) / cycle;
    beam = [0.3, 0.954, -0.4 + k * 1.8, 0.42];
    beamOn = 0.55;
  } else if (plan.variant === "relief") {
    az = 0.5 + 0.35 * Math.sin(t * 0.045);
    el = 1.05;
    const span = aspect * 0.94 + 0.34;
    const cycle = 26;
    const k = Math.min(1, (t % cycle) / 21);
    beam = [0.94, 0.341, -0.5 + k * (span + 1), 0.36];
    beamOn = 1;
  } else {
    az = 2.5 + (-1.0 - 2.5) * turn + 0.12 * Math.sin(t * 0.09) + ptr[0] * 0.55;
    el = Math.min(1.2, Math.max(0.3, 0.62 + ptr[1] * 0.18));
  }
  const L: [number, number, number] = [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
  return { L, beam, beamOn };
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uH;
uniform ivec2 uOff;
uniform vec2 uRes;
uniform vec2 uOrigin;
uniform float uCell;
uniform vec3 uGround;
uniform vec3 uShadow;
uniform vec3 uLit;
uniform vec3 uGlintC;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec3 uL;
uniform vec4 uBeam;
uniform float uBeamOn;
uniform vec4 uLook;
uniform float uFadeH;
// The type's rect (canvas px, y up), and its feather and how much of the surface stays there.
uniform vec4 uQuiet;
uniform vec2 uQuietF;
uniform int uNC;
// The shards' faces, ${MAX_FACES} per shard: (gradient x, gradient y, height at the canvas origin, beam), canvas px.
uniform vec4 uP[${MAX_SHARDS * MAX_FACES}];
out vec4 o;
const float F2 = 0.36602540378;
const float G2 = 0.21132486541;
// A lattice triangle's height, in cells: how far a corner stands from the edge across from it.
const float ALT = 0.70710678119;
vec2 un(vec2 I) { return I - (I.x + I.y) * G2; }
float hAt(vec2 I) { return texelFetch(uH, ivec2(I) - uOff, 0).r; }
vec3 facetNormal(vec2 a, vec2 b, vec2 c, float ha, float hb, float hc) {
  vec3 n = normalize(cross(vec3(un(b) - un(a), hb - ha), vec3(un(c) - un(a), hc - ha)));
  return n.z < 0.0 ? -n : n;
}
float beamAt(vec2 px) {
  float x = dot(px / uRes.y, uBeam.xy);
  return mix(1.0, exp(-pow((x - uBeam.z) / uBeam.w, 2.0)), uBeamOn);
}
float beamCell(vec2 centre) { return beamAt(un(centre) * uCell + uOrigin); }
// One plane's colour, flat, on the ground to ink ramp only: a step towards the shadow or the lit tone by how its
// normal meets the light (the flat ground is exactly the ground), and at most a breath of the glint where it faces
// the light's half vector. Alpha carries the full glint, which lights the plane's creases in the accent.
vec4 shade(vec3 n, float b) {
  float d = dot(n, uL) - uL.z;
  vec3 h = normalize(uL + vec3(0.0, 0.0, 1.0));
  float g = max(0.0, pow(max(dot(n, h), 0.0), uLook.z) - pow(h.z, uLook.z)) * b * uLook.y;
  vec3 c = uGround;
  c = mix(c, uShadow, clamp(-d * uLook.x, 0.0, 0.7));
  c = mix(c, uLit, clamp(d * uLook.x * (0.6 + 0.6 * b), 0.0, 1.0));
  c = mix(c, uGlintC, clamp(g, 0.0, 0.15));
  return vec4(c, g);
}
// How much hairline a pixel carries for an edge dist canvas px away, between planes with normals n1 and n2: none
// where the two lie in one plane.
float hair(float dist, vec3 n1, vec3 n2) {
  return (1.0 - smoothstep(0.35, 1.35, dist)) * smoothstep(0.003, 0.035, 1.0 - dot(n1, n2));
}
void main() {
  vec2 p = (gl_FragCoord.xy - uOrigin) / uCell;
  vec2 I = floor(p + (p.x + p.y) * F2);
  vec2 x0 = p - un(I);
  vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 Ib = I + i1;
  vec2 Ic = I + 1.0;
  float ha = hAt(I), hb = hAt(Ib), hc = hAt(Ic);
  vec2 A = un(I);
  vec2 v0 = un(Ib) - A, v1 = un(Ic) - A, v2 = p - A;
  float d00 = dot(v0, v0), d01 = dot(v0, v1), d11 = dot(v1, v1), d20 = dot(v2, v0), d21 = dot(v2, v1);
  float dn = d00 * d11 - d01 * d01;
  float bv = (d11 * d20 - d01 * d21) / dn;
  float bw = (d00 * d21 - d01 * d20) / dn;
  float bu = 1.0 - bv - bw;
  vec3 n1 = facetNormal(I, Ib, Ic, ha, hb, hc);
  vec4 s1 = shade(n1, beamCell((I + Ib + Ic) / 3.0));
  // Every edge of this triangle against the triangle across it, so a crease runs on unbroken through each lattice
  // corner where another, flat edge happens to be nearer.
  vec2 Da = Ic + i1;
  vec2 Db = I + 1.0 - i1;
  vec2 Dc = I + i1 - 1.0;
  vec3 na = facetNormal(Ib, Ic, Da, hb, hc, hAt(Da));
  vec3 nb = facetNormal(I, Ic, Db, ha, hc, hAt(Db));
  vec3 nc = facetNormal(I, Ib, Dc, ha, hb, hAt(Dc));
  vec4 sa = shade(na, beamCell((Ib + Ic + Da) / 3.0));
  vec4 sb = shade(nb, beamCell((I + Ic + Db) / 3.0));
  vec4 sc = shade(nc, beamCell((I + Ib + Dc) / 3.0));
  float alt = ALT * uCell;
  float da = bu * alt, db = bv * alt, dc = bw * alt;
  float dmin = min(da, min(db, dc));
  vec4 sn = (da <= db && da <= dc) ? sa : (db <= dc ? sb : sc);
  vec3 col = mix(s1.rgb, sn.rgb, 0.5 * (1.0 - smoothstep(0.0, 1.0, dmin)));
  float line = hair(da, n1, na);
  float glow = sa.a;
  float lb = hair(db, n1, nb);
  if (lb > line) { line = lb; glow = sb.a; }
  float lc = hair(dc, n1, nc);
  if (lc > line) { line = lc; glow = sc.a; }
  float lit = clamp(max(s1.a, glow) * 2.5, 0.0, 1.0);
  // The shards: per shard the lowest of its face planes is the surface; its footprint is where that is above ground.
  vec2 fp = gl_FragCoord.xy;
  for (int c = 0; c < ${MAX_SHARDS}; c++) {
    if (c >= uNC) break;
    float m1 = 1e9, m2 = 1e9, sd = 1e9;
    vec4 P1 = vec4(0.0), P2 = vec4(0.0), PE = vec4(0.0);
    for (int k = 0; k < ${MAX_FACES}; k++) {
      vec4 P = uP[c * ${MAX_FACES} + k];
      float s = length(P.xy);
      if (s < 1e-6) continue;
      float h = dot(P.xy, fp) + P.z;
      if (h < m1) { m2 = m1; P2 = P1; m1 = h; P1 = P; }
      else if (h < m2) { m2 = h; P2 = P; }
      // Height over slope: the signed distance to this face's footprint edge; the least is the footprint's.
      float e = h / s;
      if (e < sd) { sd = e; PE = P; }
    }
    if (m1 > 1e8 || sd < -2.0) continue;
    vec3 ne = normalize(vec3(-PE.xy, 1.0));
    vec4 se = shade(ne, PE.w);
    if (sd > -1.0) {
      vec3 nf = normalize(vec3(-P1.xy, 1.0));
      vec3 n2 = normalize(vec3(-P2.xy, 1.0));
      vec4 sf = shade(nf, P1.w);
      vec4 s2 = shade(n2, P2.w);
      float dr = (m2 - m1) / max(length(P1.xy - P2.xy), 1e-6);
      vec3 face = mix(sf.rgb, s2.rgb, 0.5 * (1.0 - smoothstep(0.0, 1.0, dr)));
      col = mix(col, face, smoothstep(-0.5, 0.5, sd));
      float lr = hair(dr, nf, n2) * step(0.0, sd);
      if (lr > line) { line = lr; lit = clamp(max(sf.a, s2.a) * 2.5, 0.0, 1.0); }
    }
    // The silhouette comes from the step in tone; its drawn outline stays faint, so a shard never reads as line art.
    float lo = 0.3 * hair(abs(sd), ne, vec3(0.0, 0.0, 1.0));
    if (lo > line) { line = lo; lit = clamp(se.a * 2.5, 0.0, 1.0); }
  }
  // A crease that catches the light is drawn in the accent; the rest in a thin ink.
  col = mix(col, mix(uInk, uAccent, lit), line * uLook.w * (0.55 + 0.45 * lit));
  // The surface lies quiet behind the type, and flat into the ground over the bottom of the hero: no seam at the
  // hand-over.
  vec2 q = gl_FragCoord.xy;
  float f = uQuietF.x;
  float inX = smoothstep(uQuiet.x - f, uQuiet.x, q.x) * (1.0 - smoothstep(uQuiet.z, uQuiet.z + f, q.x));
  float inY = smoothstep(uQuiet.y - f, uQuiet.y, q.y) * (1.0 - smoothstep(uQuiet.w, uQuiet.w + f, q.y));
  col = mix(col, uGround, inX * inY * (1.0 - uQuietF.y));
  col = mix(uGround, col, smoothstep(0.0, uFadeH, gl_FragCoord.y));
  o = vec4(col, 1.0);
}
`;

type GL = {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buf: WebGLBuffer;
  tex: WebGLTexture;
  texSize: [number, number];
  u: Record<string, WebGLUniformLocation | null>;
  planes: Float32Array;
};

function buildGL(gl: WebGL2RenderingContext): GL | null {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("[background-facets]", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[background-facets]", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  const vao = gl.createVertexArray();
  const buf = gl.createBuffer();
  const tex = gl.createTexture();
  if (!vao || !buf || !tex) return null;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const names = [
    "uH",
    "uOff",
    "uRes",
    "uOrigin",
    "uCell",
    "uGround",
    "uShadow",
    "uLit",
    "uGlintC",
    "uInk",
    "uAccent",
    "uL",
    "uBeam",
    "uBeamOn",
    "uLook",
    "uFadeH",
    "uQuiet",
    "uQuietF",
    "uNC",
    "uP",
  ];
  const u: GL["u"] = {};
  for (const n of names) u[n] = gl.getUniformLocation(prog, n);
  return { gl, prog, vao, buf, tex, texSize: [0, 0], u, planes: new Float32Array(MAX_SHARDS * MAX_FACES * 4) };
}

function drawGL(g: GL, plan: Plan, light: Light, col: Colours, originY: number, shards: Face[][]) {
  const { gl, u } = g;
  const cw = gl.canvas.width;
  const ch = gl.canvas.height;
  gl.viewport(0, 0, cw, ch);
  gl.useProgram(g.prog);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g.tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  if (g.texSize[0] !== plan.tw || g.texSize[1] !== plan.th) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, plan.tw, plan.th, 0, gl.RED, gl.FLOAT, plan.heights);
    g.texSize = [plan.tw, plan.th];
  } else {
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, plan.tw, plan.th, gl.RED, gl.FLOAT, plan.heights);
  }
  const s = cw / plan.W;
  gl.uniform1i(u.uH, 0);
  gl.uniform2i(u.uOff, plan.offX, plan.offY);
  gl.uniform2f(u.uRes, cw, ch);
  gl.uniform2f(u.uOrigin, 0, originY * s);
  gl.uniform1f(u.uCell, plan.cell * s);
  gl.uniform3fv(u.uGround, col.ground);
  gl.uniform3fv(u.uShadow, col.shadow);
  gl.uniform3fv(u.uLit, col.lit);
  gl.uniform3fv(u.uGlintC, col.glint);
  gl.uniform3fv(u.uInk, col.ink);
  gl.uniform3fv(u.uAccent, col.accent);
  gl.uniform3fv(u.uL, light.L);
  gl.uniform4fv(u.uBeam, light.beam);
  gl.uniform1f(u.uBeamOn, light.beamOn);
  // On a dark ground the relief's tone is capped, or two long fold families read as crossing straps.
  const tone = col.dark && plan.variant === "relief" ? Math.min(plan.look.tone, 2.2) : plan.look.tone;
  gl.uniform4f(u.uLook, tone, plan.look.glint, plan.look.sharp, plan.look.line);
  gl.uniform1f(u.uFadeH, plan.H * 0.2 * s);
  const q = plan.quiet;
  if (q) {
    gl.uniform4f(u.uQuiet, q.x0 * s, q.y0 * s, q.x1 * s, q.y1 * s);
    gl.uniform2f(u.uQuietF, Math.max(1, q.feather * s), q.level);
  } else {
    gl.uniform4f(u.uQuiet, -10, -10, -9, -9);
    gl.uniform2f(u.uQuietF, 1, 1);
  }
  // Each face as a plane in canvas px: height = gradient . p + c, the height scaled with the canvas so the slope holds.
  const P = g.planes;
  P.fill(0);
  const count = Math.min(MAX_SHARDS, shards.length);
  for (let c = 0; c < count; c += 1)
    shards[c].slice(0, MAX_FACES).forEach((f, k) => {
      const o = (c * MAX_FACES + k) * 4;
      P[o] = f.gx;
      P[o + 1] = f.gy;
      P[o + 2] = (f.h - f.gx * f.ax - f.gy * f.ay) * s;
      P[o + 3] = f.beam;
    });
  gl.uniform1i(u.uNC, count);
  gl.uniform4fv(u.uP, P);
  gl.bindVertexArray(g.vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function disposeGL(g: GL) {
  const { gl } = g;
  if (gl.isContextLost()) return;
  gl.deleteTexture(g.tex);
  gl.deleteBuffer(g.buf);
  gl.deleteVertexArray(g.vao);
  gl.deleteProgram(g.prog);
}

/** The same surface, still, on a 2D canvas: for a browser without WebGL2. Flat planes and their creases. */
function draw2D(ctx: CanvasRenderingContext2D, plan: Plan, light: Light, col: Colours, shards: Face[][]) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const s = cw / plan.W;
  const { heights, tw, th, offX, offY, cell } = plan;
  const css = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;
  ctx.fillStyle = css(col.ground);
  ctx.fillRect(0, 0, cw, ch);
  const hAt = (ix: number, iy: number) => heights[(iy - offY) * tw + (ix - offX)];
  const pos = (ix: number, iy: number): [number, number] => {
    const k = (ix + iy) * G2;
    return [(ix - k) * cell * s, ch - (iy - k) * cell * s];
  };
  const L = light.L;
  const hz = Math.hypot(L[0], L[1], L[2] + 1);
  const H: [number, number, number] = [L[0] / hz, L[1] / hz, (L[2] + 1) / hz];
  const normal = (a: [number, number], b: [number, number], c: [number, number], ha: number, hb: number, hc: number) => {
    const u = [(b[0] - a[0]) / (cell * s), -(b[1] - a[1]) / (cell * s), hb - ha];
    const v = [(c[0] - a[0]) / (cell * s), -(c[1] - a[1]) / (cell * s), hc - ha];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((x) => x / l);
    return n[2] < 0 ? n.map((x) => -x) : n;
  };
  const shadeB = (n: number[], b: number): RGB => {
    const d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2] - L[2];
    const sp = plan.look.sharp;
    const g = Math.max(0, Math.max(0, n[0] * H[0] + n[1] * H[1] + n[2] * H[2]) ** sp - H[2] ** sp) * b * plan.look.glint;
    let c = col.ground;
    c = mix(c, col.shadow, Math.min(0.7, Math.max(0, -d * plan.look.tone)));
    c = mix(c, col.lit, Math.min(1, Math.max(0, d * plan.look.tone * (0.6 + 0.6 * b))));
    return mix(c, col.glint, Math.min(0.15, g));
  };
  const shade = (n: number[], cx: number, cy: number) => shadeB(n, beamAt(plan, light, cx / s, (ch - cy) / s));
  const normals = new Map<number, number[]>();
  for (let iy = offY; iy < offY + th - 1; iy += 1)
    for (let ix = offX; ix < offX + tw - 1; ix += 1) {
      for (const up of [false, true]) {
        const a: [number, number] = [ix, iy];
        const b: [number, number] = up ? [ix, iy + 1] : [ix + 1, iy];
        const c: [number, number] = [ix + 1, iy + 1];
        const pa = pos(a[0], a[1]);
        const pb = pos(b[0], b[1]);
        const pc = pos(c[0], c[1]);
        const n = normal(pa, pb, pc, hAt(a[0], a[1]), hAt(b[0], b[1]), hAt(c[0], c[1]));
        normals.set((iy * 4096 + ix) * 2 + (up ? 1 : 0), n);
        if (n[2] > 0.99999) continue;
        ctx.fillStyle = css(shade(n, (pa[0] + pb[0] + pc[0]) / 3, (pa[1] + pb[1] + pc[1]) / 3));
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.lineTo(pc[0], pc[1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  // Creases: each lower triangle against its three neighbours, so every edge is judged once.
  ctx.strokeStyle = css(mix(col.ground, col.ink, plan.look.line * 0.7));
  ctx.lineWidth = 1;
  ctx.beginPath();
  const key = (ix: number, iy: number, up: boolean) => (iy * 4096 + ix) * 2 + (up ? 1 : 0);
  for (let iy = offY + 1; iy < offY + th - 2; iy += 1)
    for (let ix = offX + 1; ix < offX + tw - 2; ix += 1) {
      const n = normals.get(key(ix, iy, false));
      if (!n) continue;
      const pairs: [number[] | undefined, [number, number], [number, number]][] = [
        [normals.get(key(ix, iy, true)), [ix, iy], [ix + 1, iy + 1]],
        [normals.get(key(ix + 1, iy, true)), [ix + 1, iy], [ix + 1, iy + 1]],
        [normals.get(key(ix, iy - 1, true)), [ix, iy], [ix + 1, iy]],
      ];
      for (const [m, e0, e1] of pairs) {
        if (!m) continue;
        if (1 - (n[0] * m[0] + n[1] * m[1] + n[2] * m[2]) < 0.004) continue;
        const p0 = pos(e0[0], e0[1]);
        const p1 = pos(e1[0], e1[1]);
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
      }
    }
  ctx.stroke();
  // The shards: each face filled flat, then its ridges and footprint as hairlines.
  const at = (x: number, y: number): [number, number] => [x * s, ch - y * s];
  for (const faces of shards) {
    for (const f of faces) {
      const n = [-f.gx, -f.gy, 1];
      const l = Math.hypot(n[0], n[1], 1);
      ctx.fillStyle = css(shadeB(n.map((v) => v / l), f.beam));
      ctx.beginPath();
      for (let k = 0; k < 3; k += 1) {
        const [x, y] = at(f.tri[k * 2], f.tri[k * 2 + 1]);
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.strokeStyle = css(mix(col.ground, col.ink, plan.look.line * 0.7));
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const f of faces) {
      const [ax, ay] = at(f.tri[0], f.tri[1]);
      const [x0, y0] = at(f.tri[2], f.tri[3]);
      const [x1, y1] = at(f.tri[4], f.tri[5]);
      ctx.moveTo(ax, ay);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();
  }
  // The surface lies flat into the ground over the bottom fifth, as on the GPU.
  const fade = ctx.createLinearGradient(0, ch, 0, ch - plan.H * 0.2 * s);
  fade.addColorStop(0, css(col.ground));
  fade.addColorStop(1, `rgb(${col.ground.map((c) => Math.round(c * 255)).join(" ")} / 0)`);
  ctx.fillStyle = fade;
  ctx.fillRect(0, ch - plan.H * 0.2 * s, cw, plan.H * 0.2 * s);
}

/** Any CSS colour to sRGB 0..1 through a one-pixel canvas, so oklch and color-mix resolve as the browser draws them. */
function toRGB(probe: CanvasRenderingContext2D, color: string): RGB {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "rgb(0 0 0)";
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export function BackgroundFacets({ variant = "shard", lines, lead, link, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The type: hidden under its masks from the first paint (CSS), raised once nothing covers the page.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rise = Array.from(el.querySelectorAll<HTMLElement>("[data-rise]"));
    if (!rise.length) return;
    // A late script: the CSS fallback (3 s) may already have shown the lines; then they stay where they are.
    // Decided once per element, so a second mount (development) does not read its own first run's state.
    const clock = rise[0].getAnimations().find((a) => (a as CSSAnimation).animationName === "struq-bf-rise");
    el.dataset.shown ??= String(
      reduce || (clock ? Number(clock.currentTime ?? 0) >= 2900 : getComputedStyle(rise[0]).transform === "none"),
    );
    const shown = el.dataset.shown === "true";
    gsap.set(rise, { y: 0, yPercent: shown ? 0 : 115 });
    el.dataset.ready = "";
    let tween: gsap.core.Tween | null = null;
    const stop = whenUncovered(() => {
      // The surface folds up with the type. It may not be listening yet (this can run at once), so it also reads
      // the attribute when it starts.
      el.dataset.played = "";
      el.dispatchEvent(new Event("bf:play"));
      if (shown) return;
      tween = gsap.to(rise, { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: 0.09, delay: 0.15 });
    });
    return () => {
      stop();
      tween?.kill();
    };
  }, []);

  // The surface.
  useEffect(() => {
    const el = root.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const copy = el.querySelector<HTMLElement>("[data-copy]");
    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    const probe = probeCanvas.getContext("2d", { willReadFrequently: true });

    let plan: Plan | null = null;
    let colours: Colours | null = null;
    let g: GL | null = null;
    let ctx2d: CanvasRenderingContext2D | null = null;
    let surface: HTMLCanvasElement = canvas;
    let spare: HTMLCanvasElement | null = null;
    let raf = 0;
    let onScreen = true;
    let lost = false;
    let gone = false;
    let t = reduce ? 0 : hash(variant.length) * 40;
    let last = 0;
    let revealAt = -1;
    let drawn = false;
    let turn = 0;
    const ptr: [number, number] = [0, 0];
    const ptrTo: [number, number] = [0, 0];

    const readColours = () => {
      if (!probe) return;
      const style = getComputedStyle(el);
      const read = (name: string, fallback: string) => toRGB(probe, style.getPropertyValue(name).trim() || fallback);
      const ground = toRGB(probe, style.backgroundColor);
      const ink = toRGB(probe, style.color);
      const accent = read("--accent", style.color);
      const dark = luminance(ground) < 0.25;
      // The planes stay on the ground to ink ramp (lit towards white or the ink's light, shadow towards black or the
      // ink); the accent lives on the creases that catch the light, and only a trace of it in a plane's glint.
      const lit: RGB = dark ? mix(ground, ink, 0.17) : mix(ground, [1, 1, 1], 0.8);
      colours = {
        ground,
        ink,
        accent,
        shadow: dark ? mix(ground, [0, 0, 0], 0.35) : mix(ground, ink, 0.3),
        lit,
        glint: mix(lit, accent, dark ? 0.25 : 0.2),
        dark,
      };
    };

    const measure = () => {
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (!W || !H) return;
      const sec = el.getBoundingClientRect();
      const box = copy?.getBoundingClientRect();
      const quietBox = box ? new DOMRect(box.left - sec.left, box.top - sec.top, box.width, box.height) : null;
      plan = makePlan(variant, W, H, quietBox);
      const cw = Math.max(1, Math.round(W * plan.scale));
      const ch = Math.max(1, Math.round(H * plan.scale));
      if (surface.width !== cw || surface.height !== ch) {
        surface.width = cw;
        surface.height = ch;
      }
    };

    const progress = () => {
      const r = el.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    };

    // Reduced motion, or the 2D canvas without WebGL2: one still frame, held.
    const still = () => reduce || (!g && !!ctx2d);

    const render = () => {
      if (!plan || !colours || (!g && !ctx2d)) return;
      const held = still();
      const reveal = held ? 1 : revealAt < 0 ? 0 : 1 - Math.pow(1 - Math.min(1, (t - revealAt) / 2.6), 3);
      const originY = held ? 0 : -progress() * plan.drift;
      // On a dark ground the pleats lie lower: full height they read as alternating bright and black bands.
      const amp = colours.dark && plan.variant === "turn" ? 0.6 : 1;
      fillHeights(plan, held ? 0 : t, reveal * amp, originY, !g, colours.dark);
      const light = lightFor(plan, held ? 6 : t, turn, ptr);
      const shards = shardFaces(plan, held ? 0 : t, reveal, originY, light);
      if (g) drawGL(g, plan, light, colours, originY, shards);
      else if (ctx2d) draw2D(ctx2d, plan, light, colours, shards);
      if (!drawn) {
        drawn = true;
        // The first frame is on the canvas: let it show (the CSS fades it in).
        requestAnimationFrame(() => {
          if (!gone) el.dataset.drawn = "";
        });
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (gone || lost) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      // The pointer eases in over about 0.18 s (time constant 0.06 s); the scroll turn a touch faster.
      const kp = 1 - Math.exp(-dt / 0.06);
      ptr[0] += (ptrTo[0] - ptr[0]) * kp;
      ptr[1] += (ptrTo[1] - ptr[1]) * kp;
      turn += (progress() - turn) * (1 - Math.exp(-dt / 0.05));
      render();
      loop();
    };
    const loop = () => {
      if (still() || gone || lost || raf || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(frame);
    };
    const halt = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

    const start = () => {
      const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
      if (gl) g = buildGL(gl);
      if (!g && !gl) ctx2d = canvas.getContext("2d");
      else if (!g) {
        // WebGL2 was granted but the program will not build: that canvas can never give a 2D context, so the still
        // goes on a fresh canvas beside it (not owned by React, removed again on cleanup).
        spare = document.createElement("canvas");
        spare.setAttribute("data-bf-canvas", "");
        spare.setAttribute("aria-hidden", "true");
        spare.className = canvas.className;
        canvas.style.display = "none";
        canvas.after(spare);
        surface = spare;
        ctx2d = spare.getContext("2d");
      }
      readColours();
      measure();
      render();
      loop();
    };

    const onPlay = () => {
      if (revealAt < 0) revealAt = t;
    };
    el.addEventListener("bf:play", onPlay);
    // A late entrance: if the CSS fallback already showed the type, the surface is up too. A variant switch (this
    // effect runs again) folds the new surface up at once.
    if (el.dataset.shown === "true") revealAt = t - 10;
    else if ("played" in el.dataset) onPlay();

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      halt();
    };
    const onRestored = () => {
      const gl = canvas.getContext("webgl2");
      g = gl ? buildGL(gl) : null;
      lost = false;
      render();
      loop();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    const ro = new ResizeObserver(() => {
      measure();
      if (!raf) render();
    });
    ro.observe(el);
    if (copy) ro.observe(copy);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) loop();
      else halt();
    });
    io.observe(el);
    const onVisibility = () => {
      if (document.hidden) halt();
      else loop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onPointer = (e: PointerEvent) => {
      if (variant !== "turn" || e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      ptrTo[0] = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ptrTo[1] = Math.max(-1, Math.min(1, 1 - ((e.clientY - r.top) / r.height) * 2));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // The palette or theme changes in place (the lab rewrites the frame's custom properties): read the colours again.
    const recolour = () => {
      readColours();
      if (!raf) render();
    };
    const mo = new MutationObserver(recolour);
    const frameEl = el.closest("[data-blocks]");
    if (frameEl) mo.observe(frameEl, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    // The face arriving late moves the type: measure its rect again.
    document.fonts?.ready.then(() => {
      if (gone) return;
      measure();
      if (!raf) render();
    });

    start();

    return () => {
      gone = true;
      halt();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      el.removeEventListener("bf:play", onPlay);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      if (g) disposeGL(g);
      g = null;
      ctx2d = null;
      if (spare) {
        spare.remove();
        canvas.style.display = "";
      }
      delete el.dataset.drawn;
    };
  }, [variant]);

  const mask = (child: React.ReactNode, key?: number) => (
    <span key={key} className="struq-line-mask block overflow-hidden pb-[0.06em]">
      <span data-rise="" className="block">
        {child}
      </span>
    </span>
  );

  return (
    <section
      ref={root}
      data-bg-facets=""
      data-variant={variant}
      suppressHydrationWarning
      className={`relative h-svh min-h-[34rem] overflow-hidden bg-surface-0 text-ink ${className}`}
    >
      <canvas ref={canvasRef} data-bf-canvas="" aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <div data-copy="" className="absolute">
        <h1 className="m-0 font-display leading-[0.95] tracking-[-0.03em]">{lines.map((line, i) => mask(line, i))}</h1>
        <div className="mt-6 md:mt-8">
          {/* Full ink: the muted ink measures about 4:1 on the lightest grounds, short of 4.5 for body text. */}
          {mask(<span className="text-body block max-w-[40ch] text-ink">{lead}</span>)}
        </div>
        <div className="mt-5">
          {mask(
            <a href={link.href} className="text-small inline-block text-ink underline decoration-1 underline-offset-4">
              {link.label}
            </a>,
          )}
        </div>
      </div>
    </section>
  );
}
