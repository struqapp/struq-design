"use client";
// components/struq/kit/gl/objects/parts.ts (Struq kit): the shared craft behind the ready-made objects.
//
// Not an object of its own. It holds what Pendant, LeverMachine and Vessel all need, so each stays readable:
// - turned(profile, segments): a smooth lathe from a hand-drawn silhouette, resampled along a curve so the edge
//   never shows facets, with the seam welded so no line runs down the back;
// - knurled(radius, height, ridges): a short ring with fine ridges, the grip on a cap, a knob or a bezel;
// - slab(width, depth, height, radius): a housing or tray, rounded in plan and bevelled top and bottom;
// - METALS: chrome, brass and copper as real physical metal (a lacquered clearcoat over a brushed base);
// - useObjectMotion: the slow turn, the sway with the scroll speed and the lean toward the pointer, the same on every
//   object so a page with two of them moves as one world.
import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { BufferGeometry, ExtrudeGeometry, LatheGeometry, MathUtils, Shape, SplineCurve, Vector2, Vector3, type Object3D } from "three";
import { usePointer, useScrollVelocity, type Signal } from "../signals";

export type Value = number | Signal;
export const read = (v: Value | undefined, fallback = 0) => (typeof v === "number" ? v : (v?.current ?? fallback));

export type MetalName = "chrome" | "brass" | "copper";

/** Polished metal, the way a product photographer sees it: a bright base, a little roughness, a clear lacquer. */
export const METALS: Record<MetalName, { color: string; roughness: number; clearcoat: number }> = {
  chrome: { color: "#e9ebee", roughness: 0.09, clearcoat: 0.6 },
  brass: { color: "#d9b26a", roughness: 0.2, clearcoat: 0.8 },
  copper: { color: "#d08a62", roughness: 0.22, clearcoat: 0.8 },
};

/** Average the normals of the lathe's first and last column, which sit on the same seam. */
export function weldSeam(g: BufferGeometry, rows: number, segments: number) {
  const n = g.attributes.normal;
  const a = new Vector3();
  const b = new Vector3();
  for (let j = 0; j < rows; j++) {
    const i0 = j;
    const i1 = segments * rows + j;
    a.fromBufferAttribute(n, i0);
    b.fromBufferAttribute(n, i1);
    a.add(b).normalize();
    n.setXYZ(i0, a.x, a.y, a.z);
    n.setXYZ(i1, a.x, a.y, a.z);
  }
  n.needsUpdate = true;
}

/**
 * Resample a silhouette ([radius, height] from the bottom up) along a smooth curve. `samples` sets how fine the edge
 * is; a few close points in the source make a tight fillet, far ones a long soft curve.
 */
export function resample(profile: ReadonlyArray<readonly [number, number]>, samples = 96) {
  return new SplineCurve(profile.map(([r, y]) => new Vector2(r, y))).getSpacedPoints(samples).map((p) => new Vector2(Math.max(0, p.x), p.y));
}

/** A smooth turned solid from a silhouette. */
export function turned(profile: ReadonlyArray<readonly [number, number]>, segments = 64, samples = 96) {
  const pts = resample(profile, samples);
  const g = new LatheGeometry(pts, segments);
  g.computeVertexNormals();
  weldSeam(g, pts.length, segments);
  return g;
}

/** A turned solid from points used as they are (for outlines already resampled, such as a wall). */
export function lathe(points: Vector2[], segments = 64) {
  const g = new LatheGeometry(points, segments);
  g.computeVertexNormals();
  weldSeam(g, points.length, segments);
  return g;
}

/**
 * A knurled ring: a short band of `ridges` fine ridges, with a rounded top and bottom edge. The grip on a cap, a knob
 * or a gauge bezel; a light raking across it is what tells the eye it is machined.
 */
export function knurled(radius: number, height: number, ridges = 72, depth = 0.06) {
  const e = height * 0.18;
  const profile: [number, number][] = [
    [radius * 0.82, 0],
    [radius - e, 0],
    [radius, e],
    [radius, height - e],
    [radius - e, height],
    [radius * 0.82, height],
  ];
  const pts = resample(profile, 24);
  const segments = ridges * 4;
  const g = new LatheGeometry(pts, segments);
  const pos = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r < radius * 0.9) continue;
    const a = Math.atan2(v.x, v.z);
    // A rounded ridge, not a sawtooth: the flat between two ridges catches the light.
    const k = 1 - depth * (0.5 - 0.5 * Math.cos(a * ridges)) * ((r - radius * 0.9) / (radius * 0.1));
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A slab: a rounded rectangle in plan (`radius` at the corners), `height` tall, its top and bottom edges bevelled by
 * `bevel`. The housing of a machine, a tray, a plinth: unlike a RoundedBox its corner radius can be larger than its
 * height. Centred on the origin.
 */
export function slab(width: number, depth: number, height: number, radius: number, bevel = 0.01) {
  const w = width / 2 - bevel;
  const d = depth / 2 - bevel;
  const r = Math.max(0.001, Math.min(radius - bevel, w, d));
  const s = new Shape();
  s.moveTo(-w + r, -d);
  s.lineTo(w - r, -d);
  s.absarc(w - r, -d + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w, d - r);
  s.absarc(w - r, d - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w + r, d);
  s.absarc(-w + r, d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w, -d + r);
  s.absarc(-w + r, -d + r, r, Math.PI, Math.PI * 1.5, false);
  const g = new ExtrudeGeometry(s, { depth: Math.max(0.0005, height - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 });
  g.translate(0, 0, -(height - bevel * 2) / 2);
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

type Motion = {
  /** The group that leans and sways: put its origin on the hang point or the base. */
  pivot: RefObject<Object3D | null>;
  /** The group that turns about its own vertical axis. */
  body: RefObject<Object3D | null>;
  spin: boolean;
  lean: boolean;
  turn?: Value;
  /** A hanging object swings with the scroll speed; a standing one only rocks a hair. */
  hang?: boolean;
};

/** The kit's object motion: a slow turn, the scroll speed in a sway, a lean toward the pointer. All damped. */
export function useObjectMotion({ pivot, body, spin, lean, turn, hang = false }: Motion) {
  const velocity = useScrollVelocity();
  const pointer = usePointer();
  const spun = useRef(0);
  useFrame((_, delta) => {
    const v = velocity.current;
    if (spin) spun.current += delta * (0.14 + Math.abs(v) * 1.2);
    const b = body.current;
    if (b) b.rotation.y = spun.current + read(turn);
    const p = pivot.current;
    if (!p) return;
    const sway = hang ? -v * 0.12 : -v * 0.015;
    p.rotation.z = MathUtils.damp(p.rotation.z, sway + (lean ? -pointer.current.x * (hang ? 0.06 : 0.035) : 0), 3, delta);
    p.rotation.x = MathUtils.damp(p.rotation.x, lean ? -pointer.current.y * (hang ? 0.05 : 0.03) : 0, 3, delta);
  });
}
