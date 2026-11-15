// components/struq/kit/subject/draw.ts (Struq recipe)
// The drawing pieces' geometry and pen: outlines made of straight and cubic segments in real units (cm, mm), sampled
// to points, offset outward by a true even distance per segment (a seam allowance, a hem allowance, nothing on a
// fold), points and normals along a segment (a notch), and a pen that keeps every line weight and hatch spacing in
// screen pixels whatever size the drawing renders at.
//
// const piece = { start: [0, 8.5], segs: [{ to: [7, 0], c1: [3.9, 8.5], c2: [7, 4.7] }, ...] };
// outlinePath(piece)          -> "M0 8.5 C3.9 8.5 7 4.7 7 0 ..."
// offsetPath(piece, 1.5)      -> the cut line, 1.5 out from every segment (0 where a segment is a fold)
// const px = usePen(svgRef, 60) // screen pixels per unit of a 60 unit wide drawing
import { useEffect, useState, type RefObject } from "react";

export type Pt = readonly [number, number];

/** One edge of an outline: a line to `to`, or a cubic through c1 and c2 when both are given. */
export type Seg = {
  to: Pt;
  c1?: Pt;
  c2?: Pt;
  /** This edge's own allowance; the outline's default when left out. */
  allowance?: number;
  /** The edge lies on a fold: no allowance, the cut line is the fold. */
  fold?: boolean;
};

export type Outline = { start: Pt; segs: Seg[] };

const r = (n: number) => Math.round(n * 1000) / 1000;

/** The SVG path of a closed outline. */
export function outlinePath(outline: Outline): string {
  const parts = [`M${r(outline.start[0])} ${r(outline.start[1])}`];
  for (const seg of outline.segs) {
    parts.push(
      seg.c1 && seg.c2
        ? `C${r(seg.c1[0])} ${r(seg.c1[1])} ${r(seg.c2[0])} ${r(seg.c2[1])} ${r(seg.to[0])} ${r(seg.to[1])}`
        : `L${r(seg.to[0])} ${r(seg.to[1])}`,
    );
  }
  return `${parts.join(" ")} Z`;
}

/** An open path through points. */
export function polyPath(points: readonly Pt[], close = false): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${r(p[0])} ${r(p[1])}`).join(" ") + (close ? " Z" : "");
}

function cubic(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]];
}

function cubicTangent(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const x = 3 * u * u * (c1[0] - p0[0]) + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (p3[0] - c2[0]);
  const y = 3 * u * u * (c1[1] - p0[1]) + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (p3[1] - c2[1]);
  return [x, y];
}

/** Where each segment starts. */
function starts(outline: Outline): Pt[] {
  return outline.segs.map((_, i) => (i === 0 ? outline.start : outline.segs[i - 1].to));
}

/** The outline as points, each with the allowance of the edge that leaves it. */
function sample(outline: Outline, allowance: number, steps = 28) {
  const from = starts(outline);
  const pts: Pt[] = [];
  const dist: number[] = [];
  outline.segs.forEach((seg, i) => {
    const d = seg.fold ? 0 : (seg.allowance ?? allowance);
    const p0 = from[i];
    if (seg.c1 && seg.c2) {
      for (let k = 0; k < steps; k += 1) {
        pts.push(cubic(p0, seg.c1, seg.c2, seg.to, k / steps));
        dist.push(d);
      }
    } else {
      pts.push(p0);
      dist.push(d);
    }
  });
  return { pts, dist };
}

function signedArea(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** The outward side of a closed outline: +1 or -1, applied to the right-hand normal (dy, -dx). */
export function outwardSign(outline: Outline): number {
  return signedArea(sample(outline, 0, 8).pts) >= 0 ? 1 : -1;
}

/**
 * The outline offset outward, each edge by its own allowance: every edge's offset line, and at every vertex the
 * meeting point of the two lines either side (a mitre), bevelled where a sharp corner would throw the mitre further
 * than three allowances. Curves are sampled finely, so the offset of a curve is a true even distance from it.
 */
export function offsetPoints(outline: Outline, allowance: number): Pt[] {
  const { pts, dist } = sample(outline, allowance);
  const n = pts.length;
  const sign = signedArea(pts) >= 0 ? 1 : -1;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (sign * dy) / len;
    const ny = (sign * -dx) / len;
    const d = dist[i];
    return { p: [p[0] + nx * d, p[1] + ny * d] as Pt, q: [q[0] + nx * d, q[1] + ny * d] as Pt, dx: dx / len, dy: dy / len };
  });
  const out: Pt[] = [];
  const limit = 3 * Math.max(allowance, ...dist);
  for (let i = 0; i < n; i += 1) {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const cross = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(cross) < 1e-6) {
      out.push(b.p);
      continue;
    }
    const t = ((b.p[0] - a.p[0]) * b.dy - (b.p[1] - a.p[1]) * b.dx) / cross;
    const hit: Pt = [a.p[0] + a.dx * t, a.p[1] + a.dy * t];
    if (Math.hypot(hit[0] - pts[i][0], hit[1] - pts[i][1]) > limit) {
      out.push(a.q, b.p);
    } else {
      out.push(hit);
    }
  }
  return out;
}

/** The cut line: the outline offset outward by its allowances, as a closed path. */
export function offsetPath(outline: Outline, allowance: number): string {
  return polyPath(offsetPoints(outline, allowance), true);
}

/** A point on segment `index` at t (0 to 1), with the outward unit normal there. */
export function pointOn(outline: Outline, index: number, t: number): { p: Pt; n: Pt } {
  const seg = outline.segs[index];
  const p0 = index === 0 ? outline.start : outline.segs[index - 1].to;
  const sign = outwardSign(outline);
  let p: Pt;
  let tan: Pt;
  if (seg.c1 && seg.c2) {
    p = cubic(p0, seg.c1, seg.c2, seg.to, t);
    tan = cubicTangent(p0, seg.c1, seg.c2, seg.to, Math.min(Math.max(t, 0.001), 0.999));
  } else {
    p = [p0[0] + (seg.to[0] - p0[0]) * t, p0[1] + (seg.to[1] - p0[1]) * t];
    tan = [seg.to[0] - p0[0], seg.to[1] - p0[1]];
  }
  const len = Math.hypot(tan[0], tan[1]) || 1;
  return { p, n: [(sign * tan[1]) / len, (sign * -tan[0]) / len] };
}

/** The bounding box of points. */
export function bounds(points: readonly Pt[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * Screen pixels per drawing unit, for a drawing `width` units wide inside `ref`. Starts from an assumed render width
 * (so the server and the first paint agree), then follows the real width. Every line weight divides by it, so a
 * hairline stays a hairline on a phone and on a wide screen.
 */
export function usePen(ref: RefObject<Element | null>, width: number, assumedPx = 640): number {
  const [px, setPx] = useState(assumedPx / width);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = (w: number) => {
      if (w > 0) setPx(Math.round((w / width) * 1000) / 1000);
    };
    measure(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => measure(entries[0]?.contentRect.width ?? 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, width]);
  return px;
}
