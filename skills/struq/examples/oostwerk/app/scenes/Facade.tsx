"use client";
// app/scenes/Facade.tsx: the signature. An Amsterdam canal at night, edge to edge, drawn in code on a canvas 2D:
//
//   sky      the warm city glow of the palette's night, a low moon
//   far      the next canal's roofline and a spire with its lit clock, a few small windows that wake (depth 0.45)
//   street   canal houses at true proportions (two to four bays, a raised ground floor on its plinth, three or four
//            floors, step, bell, neck, spout and cornice gables with their white trims and hoist beams), lamps on the
//            quay, bollards, the quay wall; one front door in the middle house, the only lit opening (depth 1)
//   front    bare elms and a few bicycles on the quay, darkest, fastest (depth 1.35)
//   water    the whole street mirrored, rippling row by row, the lamps and the door laid on it as broken streaks
//
// The layers are drawn once per size into their own canvases and composed every frame with their own parallax: the
// pointer leans the street, the scroll drifts the layers apart, and (mode "hero") the scroll walks the camera toward
// the lit door while the next scene slides over: the handover is a step through the door.
//
// mode "hero" (in the hero opener's backdrop slot, behind "Always open."): the street is dark when the gate opens; the
// quay lamps come on from both edges toward the middle, a few far windows wake, and last the door flickers on and its
// light runs down the water. `onLit` fires as the door holds, so the poster line arrives after the light.
// mode "close": the same street, every light on, the water moving, the visitor's hour beside it.
// Reduced motion: the composed still, every light on, no ripple, no parallax.
import { useEffect, useRef } from "react";
import { gsap } from "@/components/struq/kit/gsap";
import { whenUncovered } from "@/components/struq/preloaders/preloader-slices-uncovered";

type RGB = [number, number, number];
type Gable = "step" | "bell" | "neck" | "spout" | "cornice";
type House = { x: number; w: number; bays: number; floors: number; gable: Gable; shade: number; clay: number; hero: boolean; doorBay: number };
type Far = { x: number; w: number; top: number; gable: Gable; wins: { x: number; y: number; w: number; h: number; at: number }[] };
type Plan = {
  W: number;
  H: number;
  phone: boolean;
  fh: number;
  S: number;
  quay: number;
  water: number;
  houses: House[];
  far: Far[];
  tower: { x: number; w: number; base: number; tip: number };
  lamps: { x: number; at: number }[];
  trees: { x: number; seed: number; reach: number }[];
  bikes: { x: number; flip: boolean }[];
  door: { x: number; y: number; w: number; h: number };
  moon: { x: number; y: number; r: number };
};
type Colors = { sky: RGB; on: RGB; amber: RGB; clay: RGB; base: RGB };

const P = 56; // each layer's bleed on both sides, for the parallax
const BLACK: RGB = [0, 0, 0];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const pad = (n: number) => String(n).padStart(2, "0");
/** A seeded random, so the street is the same street on every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A palette colour (oklch included) as sRGB, read through a one-pixel canvas. */
function rgbOf(el: Element, name: string, fallback: RGB): RGB {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  if (!v) return fallback;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.fillStyle = "#000";
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** The street, measured from where the water starts and how high the middle house may reach. */
function plan(W: number, H: number, water: number, top: number): Plan {
  const phone = W < 768;
  const narrow = W < 1100;
  // The middle house: a plinth (0.3 floor), a raised ground floor (1.3), four floors and a gable (1.25); the quay and
  // its wall take the half floor above the water.
  const fh = (water - top) / 7.38;
  const quay = fh * 0.17;
  const S = water - fh * 0.31 - quay;
  const rnd = seeded(1609);
  const gables: Gable[] = ["step", "bell", "neck", "spout", "cornice", "step", "neck"];
  const shades = [0.22, 0.36, 0.48, 0.28, 0.42];
  const heroW = fh * 2.05;
  const cx = W / 2;
  const houses: House[] = [{ x: cx - heroW / 2, w: heroW, bays: 3, floors: 4, gable: "bell", shade: 0.2, clay: 0.1, hero: true, doorBay: 1 }];
  for (const dir of [-1, 1]) {
    let edge = dir < 0 ? cx - heroW / 2 : cx + heroW / 2;
    let i = dir < 0 ? 0 : 2;
    while (dir < 0 ? edge > -P : edge < W + P) {
      const r = rnd();
      const bays = r < 0.3 ? 2 : r < 0.9 ? 3 : 4;
      const w = fh * (bays === 2 ? 1.38 : bays === 3 ? 1.9 + rnd() * 0.2 : 2.6);
      const floors = bays === 4 ? 3 : 3 + (rnd() < 0.55 ? 1 : 0);
      const gable = bays === 4 ? "cornice" : gables[Math.floor(rnd() * gables.length)];
      const x = dir < 0 ? edge - w : edge;
      houses.push({ x, w, bays, floors, gable, shade: shades[i % shades.length], clay: rnd() < 0.3 ? 0.12 : 0.03, hero: false, doorBay: rnd() < 0.5 ? 0 : bays - 1 });
      edge = dir < 0 ? x : x + w;
      i += 1;
    }
  }
  // The next canal's roofline, smaller, standing behind; a few of its windows will wake.
  const far: Far[] = [];
  const ff = fh * 0.62;
  let fx = -P;
  while (fx < W + P) {
    const w = ff * (1.5 + rnd() * 0.9);
    const ftop = S - ff * (5.4 + rnd() * 1.6);
    const wins: Far["wins"] = [];
    const cols = Math.max(2, Math.round(w / (ff * 0.62)));
    for (let f = 0; f < 3; f += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (rnd() < 0.84) continue;
        wins.push({ x: fx + (w / cols) * (c + 0.29), y: ftop + ff * (1.5 + f), w: (w / cols) * 0.42, h: ff * 0.5, at: rnd() });
      }
    }
    far.push({ x: fx, w, top: ftop, gable: gables[Math.floor(rnd() * gables.length)], wins });
    fx += w;
  }
  const tower = { x: W * (phone ? 0.8 : 0.69), w: fh * (phone ? 0.95 : 1.05), base: S, tip: Math.max(phone ? 92 : 96, top - fh * 1.9) };
  // Lamps on the quay, from the edges in, never in front of the door; `at` is 0 at the edges and 1 near the middle.
  const lamps: Plan["lamps"] = [];
  const step = phone ? W * 0.72 : Math.max(fh * 4.6, W / 6.2);
  for (let x = phone ? W * 0.14 : step * 0.45; x < W; x += step) if (Math.abs(x - cx) > heroW * 0.9) lamps.push({ x, at: 0 });
  if (phone && lamps.length < 2) lamps.push({ x: W * 0.86, at: 0 });
  const span = Math.max(...lamps.map((l) => Math.abs(l.x - cx)), 1);
  lamps.forEach((l) => (l.at = 1 - Math.abs(l.x - cx) / span));
  const trees = phone
    ? [{ x: W * 0.02, seed: 7, reach: 1 }]
    : narrow
      ? [
          { x: W * 0.05, seed: 7, reach: 1 },
          { x: W * 0.93, seed: 19, reach: 0.9 },
        ]
      : [
          { x: W * 0.05, seed: 7, reach: 1 },
          { x: W * 0.315, seed: 31, reach: 0.8 },
          { x: W * 0.935, seed: 19, reach: 0.95 },
        ];
  const bikes = phone
    ? [{ x: W * 0.1, flip: false }]
    : [
        { x: W * 0.075, flip: false },
        { x: W * 0.34, flip: true },
        { x: W * 0.61, flip: false },
      ];
  // The door: the middle bay of the middle house, on the plinth, its fanlight above.
  const dw = (heroW / 3) * 0.56;
  const dh = fh * 1.08;
  const door = { x: cx - dw / 2, y: S - fh * 0.3 - dh, w: dw, h: dh };
  const moon = { x: W * (phone ? 0.3 : 0.2), y: Math.max(phone ? 112 : 116, top - fh * 0.2), r: Math.max(9, fh * 0.2) };
  return { W, H, phone, fh, S, quay, water, houses, far, tower, lamps, trees, bikes, door, moon };
}

/** A house's outline: the body down to the street, its gable on top. Returns the gable's highest point. */
function outline(ctx: CanvasRenderingContext2D, x: number, w: number, body: number, gh: number, gable: Gable, foot: number) {
  ctx.beginPath();
  ctx.moveTo(x, foot);
  ctx.lineTo(x, body);
  let top = body - gh;
  if (gable === "step") {
    const n = 4;
    const s = w / (2 * n + 1);
    const r = gh / n;
    for (let k = 0; k < n; k += 1) {
      ctx.lineTo(x + (k + 1) * s, body - k * r);
      ctx.lineTo(x + (k + 1) * s, body - (k + 1) * r);
    }
    for (let k = n - 1; k >= 0; k -= 1) {
      ctx.lineTo(x + w - (k + 1) * s, body - (k + 1) * r);
      ctx.lineTo(x + w - (k + 1) * s, body - k * r);
    }
  } else if (gable === "bell") {
    ctx.lineTo(x + w * 0.1, body);
    ctx.bezierCurveTo(x + w * 0.3, body, x + w * 0.2, body - gh * 0.7, x + w * 0.32, body - gh * 0.8);
    ctx.lineTo(x + w * 0.32, body - gh * 0.95);
    ctx.quadraticCurveTo(x + w * 0.5, body - gh * 1.14, x + w * 0.68, body - gh * 0.95);
    ctx.lineTo(x + w * 0.68, body - gh * 0.8);
    ctx.bezierCurveTo(x + w * 0.8, body - gh * 0.7, x + w * 0.7, body, x + w * 0.9, body);
    top = body - gh * 1.05;
  } else if (gable === "neck") {
    ctx.lineTo(x + w * 0.12, body);
    ctx.quadraticCurveTo(x + w * 0.26, body - gh * 0.12, x + w * 0.26, body - gh * 0.42);
    ctx.lineTo(x + w * 0.29, body - gh * 0.42);
    ctx.lineTo(x + w * 0.29, body - gh * 0.92);
    ctx.quadraticCurveTo(x + w * 0.5, body - gh * 1.12, x + w * 0.71, body - gh * 0.92);
    ctx.lineTo(x + w * 0.71, body - gh * 0.42);
    ctx.lineTo(x + w * 0.74, body - gh * 0.42);
    ctx.quadraticCurveTo(x + w * 0.74, body - gh * 0.12, x + w * 0.88, body);
    top = body - gh * 1.02;
  } else if (gable === "spout") {
    ctx.lineTo(x + w * 0.04, body);
    ctx.lineTo(x + w * 0.5, body - gh);
    ctx.lineTo(x + w * 0.96, body);
  } else {
    // A cornice: a straight top with a raised crest in the middle.
    ctx.lineTo(x, body - gh * 0.3);
    ctx.lineTo(x + w * 0.36, body - gh * 0.3);
    ctx.quadraticCurveTo(x + w * 0.5, body - gh * 0.62, x + w * 0.64, body - gh * 0.3);
    ctx.lineTo(x + w, body - gh * 0.3);
    top = body - gh * 0.46;
  }
  ctx.lineTo(x + w, body);
  ctx.lineTo(x + w, foot);
  ctx.closePath();
  return top;
}

/** The far canal: a softer roofline and a spire, behind the street. */
function drawFar(ctx: CanvasRenderingContext2D, p: Plan, c: Colors) {
  ctx.lineWidth = 1;
  for (const f of p.far) {
    ctx.fillStyle = rgba(mix(c.base, BLACK, 0.12));
    outline(ctx, f.x, f.w, f.top + p.fh * 0.7, p.fh * 0.7, f.gable, p.S);
    ctx.fill();
    ctx.strokeStyle = rgba(c.on, 0.07);
    ctx.stroke();
  }
  const t = p.tower;
  const h = t.base - t.tip;
  ctx.fillStyle = rgba(mix(c.base, BLACK, 0.18));
  ctx.strokeStyle = rgba(c.on, 0.1);
  const stage = (w: number, y0: number, y1: number) => {
    ctx.beginPath();
    ctx.rect(t.x - w / 2, y1, w, y0 - y1);
    ctx.fill();
    ctx.stroke();
  };
  stage(t.w, t.base, t.tip + h * 0.5);
  stage(t.w * 0.78, t.tip + h * 0.5, t.tip + h * 0.36);
  stage(t.w * 0.6, t.tip + h * 0.36, t.tip + h * 0.25);
  stage(t.w * 0.42, t.tip + h * 0.25, t.tip + h * 0.17);
  ctx.beginPath();
  ctx.moveTo(t.x - t.w * 0.2, t.tip + h * 0.17);
  ctx.lineTo(t.x, t.tip);
  ctx.lineTo(t.x + t.w * 0.2, t.tip + h * 0.17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The clock, faintly lit as tower clocks are at night, and the belfry's tall openings.
  ctx.beginPath();
  ctx.arc(t.x, t.tip + h * 0.43, t.w * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = rgba(mix(c.base, c.on, 0.3));
  ctx.fill();
  ctx.fillStyle = rgba(mix(c.base, BLACK, 0.45));
  for (const k of [-1, 1]) ctx.fillRect(t.x + k * t.w * 0.14 - t.w * 0.05, t.tip + h * 0.27, t.w * 0.1, h * 0.07);
}

/** The street: the houses with their windows, doors, stoops, plinths and trims; the lamps' posts; the quay and wall. */
function drawStreet(ctx: CanvasRenderingContext2D, p: Plan, c: Colors) {
  const { fh, S } = p;
  const glass = rgba(mix(c.base, BLACK, 0.62));
  const trim = rgba(c.on, 0.17);
  ctx.lineWidth = 1;
  const win = (x: number, y: number, w: number, h: number, panes: number) => {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    ctx.fillStyle = glass;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = rgba(c.on, 0.1);
    ctx.beginPath();
    ctx.moveTo(rx + Math.round(rw / 2) + 0.5, ry);
    ctx.lineTo(rx + Math.round(rw / 2) + 0.5, ry + rh);
    for (let k = 1; k < panes; k += 1) {
      const ly = ry + Math.round((rh * k) / panes) + 0.5;
      ctx.moveTo(rx, ly);
      ctx.lineTo(rx + rw, ly);
    }
    ctx.stroke();
    ctx.strokeStyle = trim;
    ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    ctx.fillStyle = rgba(c.on, 0.1);
    ctx.fillRect(rx - 2, ry - Math.max(2, Math.round(fh * 0.06)), rw + 4, 1);
  };
  for (const hs of p.houses) {
    const plinth = S - fh * 0.3;
    const ground = plinth - fh * 1.3;
    const body = ground - hs.floors * fh;
    const gh = fh * (hs.gable === "spout" ? 1.15 : 1.25);
    const brick = mix(mix(c.base, BLACK, hs.shade), c.clay, hs.clay);
    ctx.fillStyle = rgba(brick);
    const top = outline(ctx, hs.x, hs.w, body, gh, hs.gable, S);
    ctx.fill();
    // The white trims of an Amsterdam gable catch the street's light: the gable's edge, the cornice line.
    ctx.strokeStyle = rgba(c.on, hs.hero ? 0.26 : 0.18);
    ctx.stroke();
    ctx.strokeStyle = rgba(c.on, 0.12);
    ctx.beginPath();
    ctx.moveTo(hs.x + 1, Math.round(body) + 0.5);
    ctx.lineTo(hs.x + hs.w - 1, Math.round(body) + 0.5);
    ctx.stroke();
    ctx.fillStyle = rgba(mix(brick, c.on, 0.05));
    ctx.fillRect(hs.x, plinth, hs.w, S - plinth);
    ctx.fillStyle = rgba(BLACK, 0.28);
    ctx.fillRect(Math.round(hs.x), body, 1, S - body);
    // The hoist beam under the gable's top, with its hook, and the attic window.
    const hx = hs.x + hs.w / 2;
    if (hs.gable !== "cornice") {
      ctx.fillStyle = rgba(c.on, 0.24);
      ctx.fillRect(Math.round(hx - fh * 0.025), Math.round(top + gh * 0.14), Math.max(2, Math.round(fh * 0.05)), Math.round(fh * 0.22));
      const aw = Math.min(hs.w * 0.2, fh * 0.34);
      const ah = gh * 0.34;
      ctx.fillStyle = glass;
      ctx.fillRect(Math.round(hx - aw / 2), Math.round(body - ah - gh * 0.12), Math.round(aw), Math.round(ah));
      ctx.strokeStyle = trim;
      ctx.strokeRect(Math.round(hx - aw / 2) + 0.5, Math.round(body - ah - gh * 0.12) + 0.5, Math.round(aw) - 1, Math.round(ah) - 1);
    }
    // Tall sashes in white frames on every floor, the top floor's a little lower; the ground floor's taller.
    const bayW = hs.w / hs.bays;
    const ww = bayW * 0.5;
    for (let f = 0; f < hs.floors; f += 1) {
      const fy = ground - (f + 1) * fh;
      const shrink = f === hs.floors - 1 ? 0.88 : 1;
      for (let b = 0; b < hs.bays; b += 1) win(hs.x + b * bayW + (bayW - ww) / 2, fy + fh * 0.2, ww, fh * 0.62 * shrink, 3);
    }
    for (let b = 0; b < hs.bays; b += 1) {
      const bx = hs.x + b * bayW;
      if (b === hs.doorBay) {
        // A door on the plinth with its fanlight; the middle house's own is drawn live, because it lights.
        if (!hs.hero) {
          const dw = bayW * 0.52;
          const dx = Math.round(bx + (bayW - dw) / 2);
          ctx.fillStyle = rgba(mix(c.base, BLACK, 0.55));
          ctx.fillRect(dx, Math.round(plinth - fh * 1.06), Math.round(dw), Math.round(fh * 1.06));
          ctx.strokeStyle = trim;
          ctx.strokeRect(dx + 0.5, Math.round(plinth - fh * 1.06) + 0.5, Math.round(dw) - 1, Math.round(fh * 1.06) - 1);
          ctx.fillStyle = glass;
          ctx.fillRect(dx, Math.round(plinth - fh * 1.3), Math.round(dw), Math.round(fh * 0.18));
        }
        // The stoop: three steps down to the street.
        for (let k = 0; k < 3; k += 1) {
          const w = bayW * 0.52 * (1.15 + k * 0.22);
          ctx.fillStyle = rgba(mix(brick, c.on, 0.08 + k * 0.02));
          ctx.fillRect(Math.round(bx + (bayW - w) / 2), Math.round(plinth + k * fh * 0.1), Math.round(w), Math.ceil(fh * 0.1));
        }
        continue;
      }
      win(bx + (bayW - ww) / 2, ground + fh * 0.18, ww, fh * 0.96, 4);
      ctx.fillStyle = glass;
      ctx.fillRect(Math.round(bx + (bayW - ww * 0.8) / 2), Math.round(plinth + fh * 0.07), Math.round(ww * 0.8), Math.round(fh * 0.15));
    }
  }
  // The quay: the pavement, its stone edge, the bollards, the wall down to the water.
  const edge = S + p.quay;
  ctx.fillStyle = rgba(mix(c.base, BLACK, 0.3));
  ctx.fillRect(-P, S, p.W + 2 * P, p.quay);
  ctx.fillStyle = rgba(mix(c.base, BLACK, 0.46));
  ctx.fillRect(-P, edge, p.W + 2 * P, p.water - edge);
  ctx.fillStyle = rgba(c.on, 0.16);
  ctx.fillRect(-P, Math.round(edge), p.W + 2 * P, 1);
  ctx.fillStyle = rgba(c.on, 0.035);
  for (let y = edge + fh * 0.08; y < p.water - 1; y += fh * 0.08) ctx.fillRect(-P, Math.round(y), p.W + 2 * P, 1);
  const bw = Math.max(2, fh * 0.07);
  const bh = fh * 0.22;
  for (let x = -P + fh * 0.4; x < p.W + P; x += fh * 0.9) {
    if (Math.abs(x - p.door.x - p.door.w / 2) < p.door.w * 1.6) continue;
    ctx.fillStyle = rgba(mix(c.clay, BLACK, 0.62));
    ctx.fillRect(Math.round(x), Math.round(edge - bh), Math.round(bw), Math.round(bh));
    ctx.fillStyle = rgba(c.on, 0.14);
    ctx.fillRect(Math.round(x), Math.round(edge - bh), Math.round(bw), 1);
  }
  // The lamps' posts and lanterns; their light is drawn live.
  ctx.fillStyle = rgba(mix(c.base, BLACK, 0.7));
  for (const l of p.lamps) {
    const top = S - fh * 1.55;
    const foot = S + p.quay * 0.6;
    ctx.fillRect(Math.round(l.x - 1), Math.round(top), 2, Math.round(foot - top));
    ctx.fillRect(Math.round(l.x - fh * 0.05), Math.round(foot - fh * 0.12), Math.round(fh * 0.1), Math.round(fh * 0.12));
    const lw = fh * 0.17;
    const lh = fh * 0.26;
    ctx.beginPath();
    ctx.moveTo(l.x - lw / 2, top - lh);
    ctx.lineTo(l.x + lw / 2, top - lh);
    ctx.lineTo(l.x + lw * 0.3, top);
    ctx.lineTo(l.x - lw * 0.3, top);
    ctx.closePath();
    ctx.moveTo(l.x - lw * 0.62, top - lh);
    ctx.lineTo(l.x, top - lh - fh * 0.12);
    ctx.lineTo(l.x + lw * 0.62, top - lh);
    ctx.closePath();
    ctx.fill();
  }
}

/** A bare elm: a trunk and eight orders of branches, seeded, darkest of all. */
function drawTree(ctx: CanvasRenderingContext2D, x: number, foot: number, height: number, seed: number, color: string) {
  const rnd = seeded(seed);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  const branch = (bx: number, by: number, ang: number, len: number, wid: number, depth: number) => {
    const ex = bx + Math.sin(ang) * len;
    const ey = by - Math.cos(ang) * len;
    ctx.lineWidth = Math.max(0.6, wid);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo((bx + ex) / 2 + (rnd() - 0.5) * len * 0.25, (by + ey) / 2, ex, ey);
    ctx.stroke();
    if (depth <= 0) return;
    const n = depth > 5 ? 2 : rnd() < 0.4 ? 3 : 2;
    for (let k = 0; k < n; k += 1) {
      const spread = (0.28 + rnd() * 0.42) * (depth > 5 ? 0.7 : 1);
      const a = ang + (k === 0 ? -spread : k === 1 ? spread : (rnd() - 0.5) * 0.3);
      branch(ex, ey, a * 0.92, len * (0.7 + rnd() * 0.12), wid * 0.66, depth - 1);
    }
  };
  branch(x, foot, (rnd() - 0.5) * 0.08, height * 0.26, height * 0.022, 8);
}

/** A bicycle against the quay, a line drawing in the dark. */
function drawBike(ctx: CanvasRenderingContext2D, x: number, ground: number, fh: number, flip: boolean, color: string) {
  const r = fh * 0.2;
  const d = r * 2.6 * (flip ? -1 : 1);
  const y = ground - r;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, fh * 0.025);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.moveTo(x + d + r, y);
  ctx.arc(x + d, y, r, 0, Math.PI * 2);
  ctx.stroke();
  const seat = { x: x + d * 0.3, y: y - r * 1.15 };
  const bar = { x: x + d * 0.86, y: y - r * 1.25 };
  const crank = { x: x + d * 0.42, y };
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(crank.x, crank.y);
  ctx.lineTo(seat.x, seat.y);
  ctx.lineTo(x, y);
  ctx.moveTo(crank.x, crank.y);
  ctx.lineTo(bar.x - d * 0.06, bar.y + r * 0.25);
  ctx.lineTo(seat.x, seat.y + r * 0.15);
  ctx.moveTo(x + d, y);
  ctx.lineTo(bar.x, bar.y);
  ctx.lineTo(bar.x - d * 0.1, bar.y - r * 0.12);
  ctx.moveTo(seat.x - d * 0.08, seat.y - r * 0.05);
  ctx.lineTo(seat.x + d * 0.08, seat.y - r * 0.05);
  ctx.stroke();
}

function layer(w: number, h: number, dpr: number) {
  const cv = document.createElement("canvas");
  cv.width = Math.round((w + 2 * P) * dpr);
  cv.height = Math.round(h * dpr);
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, P * dpr, 0);
  return cv;
}

export function Facade({
  label,
  open,
  closed,
  mode = "hero",
  onLit,
}: {
  label: string;
  open: string;
  closed: string;
  mode?: "hero" | "close";
  /** Hero: fires as the door's light holds, so the poster line arrives after it. */
  onLit?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const lit = useRef(onLit);
  useEffect(() => {
    lit.current = onLit;
  }, [onLit]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const hero = mode === "hero";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = cv.closest("section");
    const copy = hero && section ? Array.from(section.querySelectorAll<HTMLElement>("[data-opener-copy], [data-opener-title]")) : [];
    const wide = window.matchMedia("(min-width: 768px)");
    // What is lit: the lamps, the far windows, the door. Dark until the gate opens on the hero; on everywhere else.
    const all = reduced || !hero ? 1 : 0;
    const light = { lamps: [] as number[], far: all, door: all };
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    let p: Plan | null = null;
    let colors: Colors = { sky: [56, 42, 31], on: [252, 246, 238], amber: [244, 162, 92], clay: [185, 72, 52], base: [54, 40, 29] };
    let dpr = 1;
    let W = 0;
    let H = 0;
    let layers: { far: HTMLCanvasElement; street: HTMLCanvasElement; front: HTMLCanvasElement } | null = null;
    const scene = document.createElement("canvas");
    const sctx = scene.getContext("2d")!;

    const read = () => {
      const base = rgbOf(cv, "--inverse", colors.base);
      const on = rgbOf(cv, "--on-inverse", colors.on);
      colors = { base, on, sky: mix(base, on, 0.035), amber: rgbOf(cv, "--accent-2", colors.amber), clay: rgbOf(cv, "--accent", colors.clay) };
    };

    // The visitor's own time: "Open" from nine to six, "After closing" outside it.
    const tick = () => {
      const now = new Date();
      const h = now.getHours();
      if (clock.current) clock.current.textContent = `${pad(h)}:${pad(now.getMinutes())}`;
      if (word.current) word.current.textContent = h >= 9 && h < 18 ? open : closed;
    };

    const build = () => {
      const box = cv.parentElement!.getBoundingClientRect();
      W = Math.max(1, box.width);
      H = Math.max(1, box.height);
      const phone = W < 768;
      // Large screens keep the layers lighter; they are scaled during the walk to the door anyway.
      dpr = Math.min(W > 1200 ? 1.5 : 2, window.devicePixelRatio || 1);
      cv.width = scene.width = Math.round(W * dpr);
      cv.height = scene.height = Math.round(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      let water = H * (phone ? 0.58 : 0.6);
      const top = phone ? 132 : Math.max(112, H * 0.13);
      if (hero && section) {
        // The water starts just above the copy: the poster line is set on the water, the street stands above it.
        const sectionTop = section.getBoundingClientRect().top;
        const tops = copy.map((el) => el.getBoundingClientRect().top - sectionTop).filter((t) => t > 0);
        const copyTop = tops.length ? Math.min(...tops) : H * 0.62;
        water = clamp(copyTop - (phone ? 18 : 26), H * 0.5, H * 0.72);
      }
      p = plan(W, H, water, top);
      if (light.lamps.length !== p.lamps.length) light.lamps = p.lamps.map(() => all);
      const far = layer(W, H, dpr);
      drawFar(far.getContext("2d")!, p, colors);
      const street = layer(W, H, dpr);
      drawStreet(street.getContext("2d")!, p, colors);
      const front = layer(W, H, dpr);
      const fctx = front.getContext("2d")!;
      for (const t of p.trees) drawTree(fctx, t.x, p.S + p.quay * 0.5, (p.S - top) * 1.08 * t.reach, t.seed, rgba(mix(colors.base, BLACK, 0.7), 0.96));
      for (const b of p.bikes) drawBike(fctx, b.x, p.S + p.quay * 0.62, p.fh, b.flip, rgba(mix(colors.base, BLACK, 0.74)));
      layers = { far, street, front };
      if (readout.current) {
        readout.current.style.top = `${phone ? 78 : 104}px`;
        readout.current.style.right = `${Math.round(phone ? 16 : Math.max(24, W * 0.04))}px`;
      }
    };

    /** Where a layer of depth d sits: the pointer's lean, the scroll's drift and the walk to the door, as one transform. */
    const place = (d: number, zoom: number, drift: number, at: { x: number; y: number }) => {
      const s = 1 + (zoom - 1) * d;
      return { s, tx: at.x * (1 - s) + look.x * 14 * d, ty: at.y * (1 - s) + look.y * 7 * d + drift * (1 - d) * H * 0.14 };
    };
    const set = (c: CanvasRenderingContext2D, m: { s: number; tx: number; ty: number }) => c.setTransform(dpr * m.s, 0, 0, dpr * m.s, dpr * m.tx, dpr * m.ty);

    let t0 = performance.now();
    const draw = (now: number) => {
      if (!p || !layers) return;
      const t = reduced ? 0 : (now - t0) / 1000;
      // The scroll: the hero's own progress (it is the first section), or the close's passage through the screen.
      let drift = 0;
      let walk = 0;
      if (section && !reduced) {
        if (hero) {
          const prog = clamp(window.scrollY / Math.max(1, section.offsetHeight), 0, 1);
          drift = prog;
          walk = smooth(0.06, 1, prog);
          if (!wide.matches && readout.current) {
            // On a phone the hour sits right under the bar: it leaves with the first touch of the scroll.
            const a = 1 - smooth(0, 0.05, prog);
            readout.current.style.opacity = String(a);
            readout.current.style.visibility = a < 0.01 ? "hidden" : "";
          }
          if (wide.matches) {
            // The type leaves before the next scene covers it.
            const a = 1 - smooth(0.02, 0.3, prog);
            [...copy, readout.current].forEach((el) => {
              if (!el) return;
              el.style.opacity = String(a);
              el.style.visibility = a < 0.01 ? "hidden" : "";
            });
          }
        } else {
          const r = section.getBoundingClientRect();
          drift = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1) - 0.5;
        }
      }
      look.x += (look.tx - look.x) * 0.05;
      look.y += (look.ty - look.y) * 0.05;
      const door = p.door;
      const fh = p.fh;
      const at = { x: door.x + door.w / 2, y: door.y + door.h / 2 };
      const zoom = 1 + walk * walk * (p.phone ? 1.1 : 2.6);
      const c = colors;
      // The close: as it scrolls on, the street goes to bed (the lamps and the far windows go out one by one) and only
      // the door stays lit, its light growing on the water.
      const late = hero || reduced ? 0 : smooth(-0.2, 0.25, drift);
      const lampOn = (i: number) => (light.lamps[i] ?? 0) * clamp(1 - late * 1.6 + (p!.lamps[i]?.at ?? 0) * 0.6, 0, 1);
      const doorBoost = 1 + late * 0.8;

      // The sky and the moon.
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.globalAlpha = 1;
      sctx.globalCompositeOperation = "source-over";
      sctx.fillStyle = rgba(c.sky);
      sctx.fillRect(0, 0, W, H);
      set(sctx, place(0.2, zoom, drift, at));
      const { x: mx, y: my, r: mr } = p.moon;
      const halo = sctx.createRadialGradient(mx, my, mr, mx, my, mr * 7);
      halo.addColorStop(0, rgba(c.on, 0.09));
      halo.addColorStop(1, rgba(c.on, 0));
      sctx.fillStyle = halo;
      sctx.fillRect(mx - mr * 7, my - mr * 7, mr * 14, mr * 14);
      sctx.beginPath();
      sctx.arc(mx, my, mr, 0, Math.PI * 2);
      sctx.fillStyle = rgba(mix(c.on, c.amber, 0.12), 0.92);
      sctx.fill();

      // The far canal, and the few windows that wake in it.
      set(sctx, place(0.45, zoom, drift, at));
      sctx.drawImage(layers.far, -P, 0, W + 2 * P, H);
      for (const fr of p.far) {
        for (const w of fr.wins) {
          const on = clamp((light.far - w.at * 0.7) / 0.3, 0, 1) * clamp(1 - late * 2 + w.at, 0, 1);
          if (on <= 0) continue;
          sctx.fillStyle = rgba(mix(c.amber, c.on, 0.2), 0.5 * on);
          sctx.fillRect(w.x, w.y, w.w, w.h);
        }
      }

      // The street, then the lamps' light on it: a pool on the pavement and the fronts, the lantern glowing.
      const s = place(1, zoom, drift, at);
      set(sctx, s);
      sctx.drawImage(layers.street, -P, 0, W + 2 * P, H);
      const ly = p.S - fh * 1.68;
      sctx.globalCompositeOperation = "lighter";
      p.lamps.forEach((l, i) => {
        const on = lampOn(i);
        if (on <= 0) return;
        const R = fh * 2.8;
        const g = sctx.createRadialGradient(l.x, ly, 0, l.x, ly, R);
        g.addColorStop(0, rgba(c.amber, 0.42 * on));
        g.addColorStop(0.18, rgba(c.amber, 0.14 * on));
        g.addColorStop(1, rgba(c.amber, 0));
        sctx.fillStyle = g;
        sctx.fillRect(l.x - R, ly - R, R * 2, R * 2);
        sctx.fillStyle = rgba(mix(c.amber, c.on, 0.45), 0.95 * on);
        sctx.fillRect(l.x - fh * 0.065, ly - fh * 0.08, fh * 0.13, fh * 0.19);
      });
      sctx.globalCompositeOperation = "source-over";

      // The door: dark wood until it lights; then open, the hall lit, a page in the light, the fanlight glowing.
      const on = light.door;
      const wood = rgba(mix(c.base, BLACK, 0.58));
      const fan = { y: door.y - fh * 0.24, h: fh * 0.18 };
      sctx.fillStyle = wood;
      sctx.fillRect(door.x, door.y, door.w, door.h);
      sctx.strokeStyle = rgba(c.on, 0.2);
      sctx.lineWidth = 1;
      sctx.strokeRect(door.x + 0.5, door.y + 0.5, door.w - 1, door.h - 1);
      sctx.fillStyle = rgba(mix(c.base, BLACK, 0.62));
      sctx.fillRect(door.x, fan.y, door.w, fan.h);
      if (on > 0) {
        const hall = mix(c.amber, c.on, 0.18);
        sctx.fillStyle = rgba(hall, on);
        sctx.fillRect(door.x, door.y, door.w, door.h);
        // The page in the doorway: its bar, a headline, a line, a picture, the button.
        const px = door.x + door.w * 0.16;
        const pw = door.w * 0.68;
        const r = (y: number, w: number, h: number, col: RGB, a: number) => {
          sctx.fillStyle = rgba(col, a * on);
          sctx.fillRect(px, door.y + door.h * y, pw * w, Math.max(1, door.h * h));
        };
        r(0.1, 0.42, 0.022, c.base, 0.55);
        r(0.17, 0.92, 0.06, c.base, 0.75);
        r(0.26, 0.62, 0.02, c.base, 0.5);
        r(0.34, 1, 0.32, c.clay, 0.55);
        r(0.72, 0.46, 0.06, c.clay, 0.95);
        // The leaf, swung in on its left hinge, dark against the light.
        sctx.fillStyle = rgba(mix(c.base, BLACK, 0.5), on);
        sctx.beginPath();
        sctx.moveTo(door.x, door.y);
        sctx.lineTo(door.x + door.w * 0.2, door.y + door.h * 0.05);
        sctx.lineTo(door.x + door.w * 0.2, door.y + door.h * 0.97);
        sctx.lineTo(door.x, door.y + door.h);
        sctx.closePath();
        sctx.fill();
        sctx.fillStyle = rgba(hall, on);
        sctx.fillRect(door.x, fan.y, door.w, fan.h);
        sctx.fillStyle = wood;
        for (let k = 1; k < 4; k += 1) sctx.fillRect(door.x + (door.w * k) / 4 - 0.5, fan.y, 1, fan.h);
        // The light it lays on the stoop and the street, and its glow.
        sctx.globalCompositeOperation = "lighter";
        sctx.fillStyle = rgba(c.amber, 0.2 * on);
        sctx.beginPath();
        sctx.moveTo(door.x, door.y + door.h);
        sctx.lineTo(door.x + door.w, door.y + door.h);
        sctx.lineTo(door.x + door.w * 2.3, p.S + p.quay);
        sctx.lineTo(door.x - door.w * 1.3, p.S + p.quay);
        sctx.closePath();
        sctx.fill();
        const g = sctx.createRadialGradient(at.x, at.y, door.w * 0.3, at.x, at.y, door.w * 4);
        g.addColorStop(0, rgba(c.amber, Math.min(0.7, 0.4 * on * doorBoost)));
        g.addColorStop(1, rgba(c.amber, 0));
        sctx.fillStyle = g;
        sctx.fillRect(at.x - door.w * 4, at.y - door.w * 4, door.w * 8, door.w * 8);
        sctx.globalCompositeOperation = "source-over";
      }

      // The front: elms and bicycles.
      set(sctx, place(1.35, zoom, drift, at));
      sctx.drawImage(layers.front, -P, 0, W + 2 * P, H);

      // On screen: the street above the water line, then the water mirroring it, row by row.
      const wy = p.water * s.s + s.ty;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(scene, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (wy >= H) return;
      ctx.fillStyle = rgba(mix(c.base, BLACK, 0.5));
      ctx.fillRect(0, wy, W, H - wy);
      const st = p.phone ? 3 : 2;
      const depth = H - wy;
      for (let y = Math.max(0, Math.floor(wy)); y < H; y += st) {
        const j = y - wy;
        const sy = wy - j * 0.94 - st;
        if (sy < 0) break;
        const amp = 0.35 + j * 0.012;
        const dx = Math.sin(j * 0.09 + t * 1.3) * amp + Math.sin(j * 0.031 - t * 0.6) * amp * 1.2;
        ctx.globalAlpha = 0.4 * (1 - Math.min(1, j / depth) * 0.55);
        ctx.drawImage(scene, 0, Math.round(sy * dpr), scene.width, Math.round(st * dpr), dx, y, W, st);
      }
      // The lights laid on the water as broken streaks, shimmering.
      ctx.globalCompositeOperation = "lighter";
      const streak = (x: number, y: number, width: number, strength: number, col: RGB) => {
        if (strength <= 0) return;
        const n = Math.floor(Math.min(depth, (wy - y) * 1.5 + fh * 0.6) / 4);
        ctx.fillStyle = rgba(col);
        for (let k = 0; k < n; k += 1) {
          const flick = 0.5 + 0.5 * Math.sin(k * 1.7 + t * 3.1 + Math.sin(k * 0.37 + t) * 3);
          const w = width * (0.35 + flick * 0.9) * (1 + k * 0.012);
          ctx.globalAlpha = strength * (1 - k / n) * (0.45 + 0.55 * flick);
          ctx.fillRect(x + Math.sin(k * 0.5 + t * 1.9) * (1 + k * 0.06) - w / 2, wy + 3 + k * 4, w, 1.5);
        }
      };
      p.lamps.forEach((l, i) => streak(l.x * s.s + s.tx, ly * s.s + s.ty, fh * 0.16 * s.s, 0.42 * lampOn(i), c.amber));
      streak(at.x * s.s + s.tx, at.y * s.s + s.ty, door.w * 1.4 * s.s * doorBoost, Math.min(0.85, 0.55 * on * doorBoost), mix(c.amber, c.on, 0.2));
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      // The quay's shadow on the water.
      ctx.fillStyle = rgba(BLACK, 0.25);
      ctx.fillRect(0, wy, W, Math.max(1, fh * 0.05));
    };

    read();
    build();
    tick();
    draw(performance.now());
    const minute = window.setInterval(tick, 30_000);
    let raf = 0;
    let running = false;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(cv);
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      look.tx = (e.clientX / window.innerWidth) * 2 - 1;
      look.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduced) window.addEventListener("pointermove", onPointer, { passive: true });
    let pending = 0;
    const onResize = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        read();
        build();
        draw(performance.now());
      });
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(onResize).catch(() => undefined);
    t0 = performance.now();

    // The lights come on as the gate opens: the quay lamps from both edges toward the middle, each with a catch, a few
    // far windows, and last the door: a flicker, then held. The poster line follows the door.
    let tl: gsap.core.Timeline | null = null;
    const unwait =
      reduced || !hero
        ? () => undefined
        : whenUncovered(() => {
            tl = gsap.timeline({ onUpdate: () => !running && draw(performance.now()) });
            (p?.lamps ?? []).forEach((l, i) => {
              const o = { v: 0 };
              const set = () => (light.lamps[i] = o.v);
              tl!
                .to(o, { v: 0.8, duration: 0.05, onUpdate: set }, 0.1 + l.at * 0.4)
                .to(o, { v: 0.2, duration: 0.07, onUpdate: set })
                .to(o, { v: 1, duration: 0.5, ease: "power2.out", onUpdate: set });
            });
            tl.to(light, { far: 1, duration: 1.2, ease: "none" }, 0.15)
              .to(light, { door: 0.7, duration: 0.06 }, 0.7)
              .to(light, { door: 0.1, duration: 0.08 })
              .to(light, { door: 0.85, duration: 0.05 }, "+=0.08")
              .to(light, { door: 0.35, duration: 0.1 })
              .to(light, { door: 1, duration: 0.7, ease: "power2.out" })
              .call(() => lit.current?.(), [], 1.05);
          });
    if (reduced || !hero) lit.current?.();

    return () => {
      stop();
      io.disconnect();
      window.clearInterval(minute);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(pending);
      unwait?.();
      tl?.kill();
    };
  }, [mode, open, closed]);

  return (
    <>
      <canvas ref={canvas} role="img" aria-label={label} className="absolute inset-0 block" />
      {/* The visitor's own hour: the building's state in a word, then the time where they are. */}
      <span ref={readout} className="absolute flex items-baseline gap-3 text-on-inverse" style={{ top: 104, right: 24 }}>
        <span ref={word} className="text-small text-[color-mix(in_oklab,var(--on-inverse)_80%,var(--inverse))]">
          {closed}
        </span>
        <span ref={clock} className="font-display text-h3 leading-none tabular-nums" suppressHydrationWarning>
          {" "}
        </span>
      </span>
    </>
  );
}
