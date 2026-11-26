"use client";
// components/struq/kit/gl/objects/Roof.tsx (Struq kit): a roof that builds itself, layer by layer, and sheds the rain.
//
// A gable roof in section, the way a roofer draws it for a client: the rafters on their wall plates and ridge beam,
// then the boarding, the membrane, the battens and the cover, and the gutters at the eaves. At the gable end every
// layer stops a step short of the one under it (`cutaway`), so the whole build-up reads at a glance. `build` lays the
// layers on with the scroll, bottom up, each piece dropped into place in the order a roofer lays it (rafters across,
// tiles from the eaves up); `rain` lets it rain: the drops break on the cover, run down the slope into the gutter and
// out of the downpipe, and the cover darkens as it wets. Change `pitch` and the roof turns flat; change `cover` and the
// roof is stripped to the rafters and laid again in the new material.
//
//   <Roof cover="tile" pitch={40} build={on("lagen")} rain={on("droog")} chimney />
//   <Roof cover="bitumen" pitch={2} />                        a flat roof: boarding, bitumen in rolls, gutters
//   <Roof cover="slate" pitch={50} cutaway={false} />          a finished slate roof, no section
//
// Size and origin: about 2.2 wide (eave to eave at the flattest), 1.8 long along the ridge and up to 1.3 tall with the
// chimney, centred on the origin. It carries its own frame box (an invisible box of that size) and marks everything
// else unframed, so Framed sizes it once and the roof can flatten, lift or rain without being rescaled.
// The ridge runs along x; the front slope faces +z. Light it with a low key (a directional light from the side) so
// the tiles throw their rows.
//
// Props:
// - cover: "tile" | "slate" | "metal" | "bitumen". Default "tile". Tile is a profiled clay pan; slate is thin
//   staggered slates; metal is standing seam; bitumen is rolls laid from the eaves up (for a flat roof).
// - pitch: the slope in degrees, 0 to 55 (number or Signal). Default 40. Below about 5 it reads as a flat roof.
// - layers: which layers to show, bottom up: "structure" | "deck" | "membrane" | "battens" | "cover" | "gutter".
//   Default roofLayers(cover): tile structure, membrane, battens, cover, gutter; slate and metal structure, deck,
//   membrane, cover, gutter; bitumen structure, deck, cover, gutter. A page that names the layers reads the same list.
// - build: 0 (bare) to 1 (finished), a number or a Signal. The layers share it equally, in order; read
//   roofLayerAt(build, layers) for the layer being laid. Default 1.
// - rain: 0 (dry) to 1 (a steady rain), a number or a Signal. Default 0.
// - lift: 0 to 1, one tile on the front slope lifted and set back (a repair). Default 0.
// - cutaway: the stepped section at the gable end. Default true.
// - chimney: a brick chimney through the front slope, flashed in lead with the cover. Default false.
// - colors: { timber, deck, membrane, batten, tile, slate, metal, bitumen, zinc, lead, brick, rain } to follow a
//   palette or a real material (tile: the fired clay; zinc: the gutters and the pipe). Defaults are the real
//   materials: pine, a grey membrane, terracotta, blue-grey slate, anthracite seam, black bitumen, zinc, lead, brick.
// - turn: an extra angle about the vertical axis in radians (number or Signal), to turn a side to the camera.
// - lean: the lean toward the pointer and the scroll's sway. Default true. A roof does not spin.
// - frame: the frame box Framed measures, [width, height, depth]. Default [2.2, 1.35, 2.25], room for the roof flat,
//   steep or turned. A smaller box shows the roof larger in the same share of the screen (on a phone, say), at the
//   cost of its edges running closer to the frame's.
// - seed: the roofer's hand; another number gives other tile tones and another tile to lift. Default 7.
// - position, scale.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  MathUtils,
  Matrix4,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { read, useObjectMotion, type Value } from "./parts";

export type RoofCover = "tile" | "slate" | "metal" | "bitumen";
export type RoofLayer = "structure" | "deck" | "membrane" | "battens" | "cover" | "gutter";
export type RoofColors = Partial<Record<"timber" | "deck" | "membrane" | "batten" | RoofCover | "zinc" | "lead" | "brick" | "rain", string>>;

/** The layers, bottom up, in the order a roofer lays them. */
const ORDER: RoofLayer[] = ["structure", "deck", "membrane", "battens", "cover", "gutter"];

/** The layers a roof of this cover shows by default, bottom up. */
export function roofLayers(cover: RoofCover): RoofLayer[] {
  if (cover === "tile") return ["structure", "membrane", "battens", "cover", "gutter"];
  if (cover === "bitumen") return ["structure", "deck", "cover", "gutter"];
  return ["structure", "deck", "membrane", "cover", "gutter"];
}

/** The index of the layer being laid at `build`, in `layers`: the same split Roof uses. */
export function roofLayerAt(build: number, layers: readonly RoofLayer[]) {
  return Math.min(layers.length - 1, Math.max(0, Math.floor(build * layers.length)));
}

type Props = {
  cover?: RoofCover;
  pitch?: Value;
  layers?: RoofLayer[];
  build?: Value;
  rain?: Value;
  lift?: Value;
  cutaway?: boolean;
  chimney?: boolean;
  colors?: RoofColors;
  frame?: [number, number, number];
  turn?: Value;
  lean?: boolean;
  seed?: number;
  position?: [number, number, number];
  scale?: number;
};

const DEFAULTS: Required<RoofColors> = {
  timber: "#b98a5a",
  deck: "#c9a774",
  membrane: "#4a5560",
  batten: "#d2ab78",
  tile: "#8a4634",
  slate: "#3f454c",
  metal: "#5b6166",
  bitumen: "#2a2826",
  zinc: "#9ea4a8",
  lead: "#80878d",
  brick: "#8c4b3a",
  rain: "#7f8a94",
};

/* The roof's measures, in object units. */
const SLOPE = 1.08; // eave to ridge along the rafter top
const LEN = 1.7; // along the ridge
const OVER = 0.1; // rafter tails past the eave
const STEP = 0.13; // how much shorter each layer is than the one under it at the gable end
const RAFTERS = 7;
const DECK = 0.03;
const BATTEN = 0.045;
const CHIMNEY = { x: -0.42, u: 0.6, w: 0.24 };

type Spec = {
  /** The slope: +1 the front (faces +z), -1 the back. */
  s: 1 | -1;
  u: number;
  x: number;
  n: number;
  size: [number, number, number];
  /** Tilt about the piece's own x, radians (a tile resting on the row below). */
  tilt?: number;
  /** Laid by unrolling along x from the gable's far end, instead of dropped into place. */
  roll?: boolean;
  layer: RoofLayer;
  /** Where in its layer's share the piece is laid, 0 to 1. */
  at: number;
  tone?: number;
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);

function rng(seed: number) {
  let s = Math.floor(seed * 9973) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** A clay pan in section: one hollow and one roll, a real thickness, darker where the next row covers it. */
function tileGeometry(width: number, length: number) {
  const shape = new Shape();
  const n = 18;
  const top = (i: number) => {
    const x = -width / 2 + (i / n) * width;
    return [x, 0.018 * Math.sin((i / n) * Math.PI * 2 + Math.PI)] as const;
  };
  const [x0, y0] = top(0);
  shape.moveTo(x0, y0);
  for (let i = 1; i <= n; i++) shape.lineTo(...top(i));
  for (let i = n; i >= 0; i--) {
    const [x, y] = top(i);
    shape.lineTo(x, y - 0.012);
  }
  const g = new ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -length / 2);
  return shadeAlongZ(g, length, 0.62);
}

/** Vertex colours from dark at the upper end (local -z, under the row above) to full at the lower edge. */
function shadeAlongZ(g: BufferGeometry, length: number, low: number) {
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = clamp01((pos.getZ(i) + length / 2) / length);
    const k = low + (1 - low) * smooth(Math.min(1, t * 1.6));
    colors.set([k, k, k], i * 3);
  }
  g.setAttribute("color", new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** A standing-seam panel: a sheet with its raised seam along one edge, one unit long. */
function seamGeometry(width: number) {
  const sheet = new BoxGeometry(width, 0.005, 1);
  const seam = new BoxGeometry(0.012, 0.03, 1);
  seam.translate(width / 2 - 0.006, 0.015, 0);
  const g = mergeGeometries([sheet, seam]);
  return shadeAlongZ(g, 1, 0.9);
}

/** A half-round ridge piece along x, open underneath. */
function ridgeGeometry(length: number) {
  const g = new CylinderGeometry(0.07, 0.07, length, 16, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** A half-round gutter along x, open on top, one unit long. */
function gutterGeometry() {
  const g = new CylinderGeometry(0.05, 0.05, 1, 20, 1, true, Math.PI, Math.PI);
  g.rotateZ(Math.PI / 2);
  return g;
}

function brickTexture(color: string) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#b9b1a4";
  ctx.fillRect(0, 0, 64, 64);
  const base = new Color(color);
  const r = rng(11);
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 8 : 0;
    for (let col = -1; col < 4; col++) {
      const k = 0.86 + r() * 0.24;
      ctx.fillStyle = `#${base.clone().multiplyScalar(k).getHexString()}`;
      ctx.fillRect(col * 16 + off + 1, row * 8 + 1, 14, 6);
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Where each layer stops at the gable end: lower layers run further. */
function layerEnds(layers: RoofLayer[], cutaway: boolean) {
  const ends: Partial<Record<RoofLayer, number>> = {};
  let k = 0;
  for (const l of ORDER) {
    if (!layers.includes(l)) continue;
    ends[l] = LEN / 2 - (cutaway && l !== "structure" && l !== "gutter" ? STEP * ++k : 0);
  }
  return ends;
}

/** The height of each layer's underside above the rafter top, along the normal. */
function layerBases(layers: RoofLayer[]) {
  let n = 0;
  const base: Partial<Record<RoofLayer, number>> = {};
  for (const l of ORDER) {
    if (!layers.includes(l)) continue;
    base[l] = n;
    if (l === "deck") n += DECK;
    if (l === "membrane") n += 0.006;
    if (l === "battens") n += BATTEN;
  }
  return { base, top: n };
}

type Plan = { timber: Spec[]; membrane: Spec[]; cover: Spec[]; ridge: Spec[]; lead: Spec[]; coverTop: number; ends: Partial<Record<RoofLayer, number>> };

function plan(cover: RoofCover, layers: RoofLayer[], cutaway: boolean, chimney: boolean, seed: number): Plan {
  const r = rng(seed);
  const ends = layerEnds(layers, cutaway);
  const { base, top } = layerBases(layers);
  const timber: Spec[] = [];
  const membrane: Spec[] = [];
  const covers: Spec[] = [];
  const ridge: Spec[] = [];
  const lead: Spec[] = [];
  const sides = [1, -1] as const;
  const span = (l: RoofLayer) => {
    const end = ends[l] ?? LEN / 2;
    return { mid: (end - LEN / 2) / 2, len: end + LEN / 2, end };
  };
  const inChimney = (s: number, u: number, x: number, pad = 0.04) =>
    chimney && s === 1 && Math.abs(x - CHIMNEY.x) < CHIMNEY.w / 2 + pad && Math.abs(u - CHIMNEY.u) < CHIMNEY.w / 2 + pad;

  // Structure: the wall plates and the ridge beam first, then the rafters in pairs across the roof.
  if (layers.includes("structure")) {
    for (const s of sides) {
      timber.push({ s, u: 0.02, x: 0, n: -0.13, size: [LEN, 0.07, 0.1], layer: "structure", at: 0, tone: 0.82 });
    }
    timber.push({ s: 1, u: SLOPE - 0.02, x: 0, n: -0.08, size: [LEN, 0.12, 0.05], layer: "structure", at: 0.08, tone: 0.9 });
    for (let i = 0; i < RAFTERS; i++) {
      const x = -LEN / 2 + 0.05 + (i * (LEN - 0.1)) / (RAFTERS - 1);
      for (const s of sides) {
        timber.push({ s, u: (SLOPE - OVER) / 2, x, n: -0.05, size: [0.045, 0.1, SLOPE + OVER], layer: "structure", at: 0.18 + (0.75 * i) / RAFTERS, tone: 0.95 + r() * 0.1 });
      }
    }
  }

  // Deck: boards across the rafters, from the eaves up.
  if (layers.includes("deck")) {
    const { mid, len } = span("deck");
    const board = 0.12;
    const count = Math.ceil(SLOPE / board);
    for (let j = 0; j < count; j++) {
      for (const s of sides) {
        timber.push({ s, u: j * board + board / 2, x: mid, n: base.deck! + DECK / 2, size: [len, DECK, board - 0.006], layer: "deck", at: j / count, tone: 1.05 + r() * 0.12 });
      }
    }
  }

  // Membrane: three runs a side, each unrolled along the roof, the upper one lapping the lower.
  if (layers.includes("membrane")) {
    const { mid, len } = span("membrane");
    const runs = 3;
    const w = SLOPE / runs + 0.04;
    for (let j = 0; j < runs; j++) {
      for (const s of sides) {
        membrane.push({ s, u: j * (SLOPE / runs) + w / 2 - 0.02, x: mid, n: base.membrane! + 0.002 + j * 0.0008, size: [len, 0.004, w], roll: true, layer: "membrane", at: j / runs });
      }
    }
  }

  // Battens: counter battens over each rafter, then the battens across at the tile gauge.
  const gauge = cover === "slate" ? 0.085 : 0.13;
  if (layers.includes("battens")) {
    const { mid, len, end } = span("battens");
    for (let i = 0; i < RAFTERS; i++) {
      const x = -LEN / 2 + 0.05 + (i * (LEN - 0.1)) / (RAFTERS - 1);
      if (x > end) continue;
      for (const s of sides) timber.push({ s, u: SLOPE / 2, x, n: base.battens! + 0.008, size: [0.03, 0.016, SLOPE], layer: "battens", at: (0.35 * i) / RAFTERS, tone: 1.12 });
    }
    const rows = Math.floor((SLOPE - 0.08) / gauge) + 1;
    for (let j = 0; j < rows; j++) {
      for (const s of sides) timber.push({ s, u: 0.04 + j * gauge, x: mid, n: base.battens! + 0.016 + 0.0145, size: [len, 0.029, 0.04], layer: "battens", at: 0.4 + (0.6 * j) / rows, tone: 1.18 });
    }
  }

  // Cover: from the eaves up, row by row, left to right; the ridge last.
  const coverBase = top;
  let coverTop = coverBase;
  if (layers.includes("cover")) {
    const { mid, len, end } = span("cover");
    if (cover === "tile" || cover === "slate") {
      const tw = cover === "tile" ? 0.15 : 0.1;
      const tl = cover === "tile" ? 0.21 : 0.19;
      const thick = cover === "tile" ? 0.018 : 0.006;
      const rows = Math.floor((SLOPE + 0.05 - tl) / gauge) + 2;
      for (let row = 0; row < rows; row++) {
        const lower = -0.05 + row * gauge;
        const u = Math.min(lower + tl / 2, SLOPE - tl / 2 + 0.02);
        const shift = cover === "slate" && row % 2 ? tw / 2 : 0;
        const cols = Math.floor((len - shift) / tw);
        for (let c = 0; c < cols; c++) {
          const x = -LEN / 2 + shift + tw / 2 + c * tw;
          for (const s of sides) {
            if (inChimney(s, u, x)) continue;
            covers.push({ s, u, x, n: coverBase + thick, size: [1, 1, 1], tilt: cover === "tile" ? -0.07 : -0.035, layer: "cover", at: 0.85 * ((row + c / cols) / rows), tone: 0.88 + r() * 0.24 });
          }
        }
      }
      coverTop = coverBase + thick * 2 + 0.01;
    } else if (cover === "metal") {
      const pw = 0.22;
      const cols = Math.floor(len / pw);
      for (let c = 0; c < cols; c++) {
        for (const s of sides) covers.push({ s, u: (SLOPE - 0.04) / 2, x: -LEN / 2 + pw / 2 + c * pw, n: coverBase + 0.004, size: [1, 1, SLOPE + 0.04], layer: "cover", at: (0.85 * c) / cols, tone: 0.96 + r() * 0.08 });
      }
      coverTop = coverBase + 0.03;
    } else {
      const roll = 0.27;
      const runs = Math.ceil((SLOPE + 0.04) / (roll - 0.03));
      for (let j = 0; j < runs; j++) {
        for (const s of sides) covers.push({ s, u: -0.03 + j * (roll - 0.03) + roll / 2, x: mid, n: coverBase + 0.005 + j * 0.0015, size: [len, 0.008, roll], tilt: -0.012, roll: true, layer: "cover", at: (0.85 * j) / runs, tone: 0.95 + r() * 0.1 });
      }
      coverTop = coverBase + 0.012;
      // The roof edge: a metal trim along each eave, over the bitumen's last roll.
      for (const s of sides) lead.push({ s, u: -0.025, x: mid, n: coverTop + 0.012, size: [len, 0.035, 0.035], layer: "cover", at: 0.9, tone: 1.25 });
    }
    // The ridge: half-round pieces along the top (none on a flat bitumen roof, whose rolls lap over it).
    if (cover !== "bitumen") {
      const piece = 0.2;
      const count = Math.floor((end + LEN / 2) / (piece - 0.015));
      for (let i = 0; i < count; i++) ridge.push({ s: 1, u: SLOPE, x: -LEN / 2 + piece / 2 + i * (piece - 0.015), n: coverTop, size: [piece, 1, 1], layer: "cover", at: 0.86 + (0.12 * i) / count });
    }
    // Lead round the chimney: the apron below, the sides, the back gutter above.
    if (chimney) {
      const w = CHIMNEY.w;
      const n = coverTop + 0.004;
      lead.push({ s: 1, u: CHIMNEY.u - w / 2 - 0.07, x: CHIMNEY.x, n, size: [w + 0.14, 0.006, 0.16], layer: "cover", at: 0.9 });
      for (const side of [-1, 1]) lead.push({ s: 1, u: CHIMNEY.u + 0.01, x: CHIMNEY.x + side * (w / 2 + 0.045), n, size: [0.09, 0.006, w + 0.08], layer: "cover", at: 0.93 });
      lead.push({ s: 1, u: CHIMNEY.u + w / 2 + 0.06, x: CHIMNEY.x, n: n + 0.01, size: [w + 0.14, 0.006, 0.12], tilt: 0.25, layer: "cover", at: 0.96 });
    }
  }
  return { timber, membrane, cover: covers, ridge, lead, coverTop, ends };
}

const _m = new Matrix4();
const _basis = new Matrix4();
const _tilt = new Matrix4();
const _scale = new Matrix4();
const _p = new Vector3();
const _x = new Vector3();
const _n = new Vector3();
const _d = new Vector3();
const _down = new Vector3();
const _eave = new Vector3();
const _c = new Color();
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

/** The slope's frame at the current pitch, into the shared vectors: its eave point, up-slope and outward normal. */
function slopeFrame(s: 1 | -1, pitch: number, lift: number) {
  const sn = Math.sin(pitch);
  const cs = Math.cos(pitch);
  _d.set(0, sn, -s * cs);
  _n.set(0, cs, s * sn);
  _x.set(s, 0, 0);
  _down.copy(_d).negate();
  _eave.set(0, lift, s * SLOPE * cs);
}

/** A piece's matrix: placed on its slope, dropped in from above while it is laid (e from 0 to 1). */
function place(spec: Spec, pitch: number, lift: number, e: number, out: Matrix4) {
  if (e <= 0.001) return out.copy(HIDDEN);
  slopeFrame(spec.s, pitch, lift);
  let x = spec.x;
  let sx = spec.size[0];
  let drop = 0;
  if (spec.roll) {
    // Unrolled from the gable's far end (-x) toward the near one.
    const far = spec.x - spec.size[0] / 2;
    sx = Math.max(0.0001, spec.size[0] * smooth(e));
    x = far + sx / 2;
  } else {
    drop = (1 - smooth(e)) ** 2 * 0.55;
  }
  _p.copy(_eave).addScaledVector(_d, spec.u).addScaledVector(_n, spec.n + drop);
  _p.x += x;
  _basis.makeBasis(_x, _n, _down);
  if (spec.tilt) _basis.multiply(_tilt.makeRotationX(spec.tilt));
  const grow = spec.roll ? 1 : smooth(Math.min(1, e * 2.5));
  _scale.makeScale(sx * grow, spec.size[1] * grow, spec.size[2] * grow);
  return out.copy(_basis).multiply(_scale).setPosition(_p);
}

/** A layer's progress for one piece: the layer's share of `build`, then the piece's own window inside it. */
function pieceProgress(layerT: number, at: number) {
  return clamp01((layerT - at * 0.78) / 0.22);
}

/** An instanced mesh's ref, its pieces hidden until laid and each tinted by `colorOf` (times its own tone). */
function useInstances(specs: Spec[], colorOf: (spec: Spec) => string) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    specs.forEach((spec, i) => {
      mesh.setMatrixAt(i, HIDDEN);
      mesh.setColorAt(i, _c.set(colorOf(spec)).multiplyScalar(spec.tone ?? 1));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // The material compiled before the colours existed: compile it again with them.
    const material = mesh.material as MeshStandardMaterial;
    material.needsUpdate = true;
    // colorOf is read once per plan; a new palette arrives with a new plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs]);
  return ref;
}

const RAIN = 360;
const RUN = 110;
const SPOUT = 28;

export function Roof({
  cover = "tile",
  pitch = 40,
  layers: layersProp,
  build = 1,
  rain = 0,
  lift = 0,
  cutaway = true,
  chimney = false,
  colors,
  frame = [2.2, 1.35, 2.25],
  turn,
  lean = true,
  seed = 7,
  position,
  scale,
}: Props) {
  const pivot = useRef<Group>(null);
  const body = useRef<Group>(null);
  useObjectMotion({ pivot, body, spin: false, lean, turn });
  const palette = { ...DEFAULTS, ...colors };

  // A new cover is laid by stripping the old one to the rafters first: `shown` is the cover on the roof now.
  const [shown, setShown] = useState<RoofCover>(cover);
  const swap = useRef(1);
  const layers = useMemo(() => layersProp ?? roofLayers(shown), [layersProp, shown]);
  const p = useMemo(() => plan(shown, layers, cutaway, chimney, seed), [shown, layers, cutaway, chimney, seed]);
  const coverColor = palette[shown];

  const coverGeometry = useMemo<BufferGeometry>(() => {
    if (shown === "tile") return tileGeometry(0.15, 0.21);
    if (shown === "slate") return shadeAlongZ(new BoxGeometry(0.098, 0.006, 0.19, 1, 1, 6), 0.19, 0.7);
    if (shown === "metal") return seamGeometry(0.22);
    return shadeAlongZ(new BoxGeometry(1, 1, 1, 1, 1, 4), 1, 0.82);
  }, [shown]);
  const box = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const ridgeGeo = useMemo(() => ridgeGeometry(1), []);
  const gutterGeo = useMemo(() => gutterGeometry(), []);
  const pipeGeo = useMemo(() => new CylinderGeometry(0.026, 0.026, 1, 14), []);
  const dropGeo = useMemo(() => new BoxGeometry(0.004, 0.11, 0.004), []);
  const runGeo = useMemo(() => new BoxGeometry(0.006, 0.004, 0.07), []);
  const brick = useMemo(() => brickTexture(palette.brick), [palette.brick]);

  const timber = useInstances(p.timber, (spec) => (spec.layer === "deck" ? palette.deck : spec.layer === "battens" ? palette.batten : palette.timber));
  const membrane = useInstances(p.membrane, () => "#ffffff");
  const covers = useInstances(p.cover, () => "#ffffff");
  const ridge = useInstances(p.ridge, () => "#ffffff");
  const leads = useInstances(p.lead, () => "#ffffff");
  const drops = useRef<InstancedMesh>(null);
  const runs = useRef<InstancedMesh>(null);
  const spout = useRef<InstancedMesh>(null);
  const gutters = useRef<(Mesh | null)[]>([]);
  const pipe = useRef<Mesh>(null);
  const stack = useRef<Mesh>(null);
  const coverMat = useRef<MeshStandardMaterial>(null);

  // The rain's state: each drop's place and speed, each runnel's place on the slope.
  const weather = useMemo(() => {
    const r = rng(seed + 3);
    return {
      drops: Array.from({ length: RAIN }, () => ({ x: (r() - 0.5) * (LEN + 0.3), z: (r() - 0.5) * 2.3, y: r() * 2.6 - 1.2, v: 3 + r() * 1.2 })),
      runs: Array.from({ length: RUN }, () => ({ s: (r() < 0.6 ? 1 : -1) as 1 | -1, x: (r() - 0.5) * (LEN - 0.1), u: r() * SLOPE, v: 0.5 + r() * 0.5 })),
      spout: Array.from({ length: SPOUT }, (_, i) => ({ y: -i / SPOUT, v: 1.6 + r() * 0.4 })),
      wet: 0,
    };
  }, [seed]);

  const liftIndex = useMemo(() => {
    const front = p.cover.map((spec, i) => ({ spec, i })).filter(({ spec }) => spec.s === 1 && spec.u > 0.35 && spec.u < 0.75 && spec.x > 0 && spec.x < 0.45);
    return front.length ? front[Math.floor(rng(seed + 9)() * front.length)].i : -1;
  }, [p.cover, seed]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);
    // The swap: strip the old cover, then lay the new one.
    const target = cover === shown ? 1 : 0;
    swap.current = MathUtils.damp(swap.current, target, 3.2, dt);
    if (target === 0 && swap.current < 0.02) {
      swap.current = 0;
      setShown(cover);
    }

    const pr = MathUtils.degToRad(MathUtils.clamp(read(pitch, 40), 0, 55));
    const b = clamp01(read(build, 1));
    const wetTarget = clamp01(read(rain, 0));
    weather.wet = MathUtils.damp(weather.wet, wetTarget, 1.5, dt);
    const ridgeH = SLOPE * Math.sin(pr);
    // Centred: the roof's own height halves about the origin.
    const lift0 = -ridgeH / 2 + 0.05;

    const count = layers.length;
    const layerT = (l: RoofLayer) => {
      const i = layers.indexOf(l);
      if (i < 0) return 0;
      const t = clamp01(b * count - i);
      return l === "structure" || l === "gutter" ? t : t * swap.current;
    };

    const write = (mesh: InstancedMesh | null, specs: Spec[]) => {
      if (!mesh) return;
      specs.forEach((spec, i) => mesh.setMatrixAt(i, place(spec, pr, lift0, pieceProgress(layerT(spec.layer), spec.at), _m)));
      mesh.instanceMatrix.needsUpdate = true;
    };
    write(timber.current, p.timber);
    write(membrane.current, p.membrane);
    write(leads.current, p.lead);

    // The cover, with one piece lifted for a repair.
    const cm = covers.current;
    if (cm) {
      const ct = layerT("cover");
      const up = clamp01(read(lift, 0));
      p.cover.forEach((spec, i) => {
        const e = pieceProgress(ct, spec.at);
        if (i === liftIndex && up > 0.001 && e > 0.999) {
          place({ ...spec, n: spec.n + 0.16 * up, tilt: (spec.tilt ?? 0) + 0.7 * up }, pr, lift0, 1, _m);
        } else place(spec, pr, lift0, e, _m);
        cm.setMatrixAt(i, _m);
      });
      cm.instanceMatrix.needsUpdate = true;
    }

    // The ridge sits across both slopes, at the line where their covers meet.
    const rm = ridge.current;
    if (rm) {
      const ct = layerT("cover");
      const y = lift0 + ridgeH + p.coverTop / Math.cos(pr) - 0.03;
      p.ridge.forEach((spec, i) => {
        const e = pieceProgress(ct, spec.at);
        if (e <= 0.001) return rm.setMatrixAt(i, HIDDEN);
        const drop = (1 - smooth(e)) ** 2 * 0.55;
        const g = smooth(Math.min(1, e * 2.5));
        _m.makeScale(spec.size[0] * g, g * (0.6 + 0.4 * Math.cos(pr)), g).setPosition(spec.x, y + drop, 0);
        rm.setMatrixAt(i, _m);
      });
      rm.instanceMatrix.needsUpdate = true;
    }

    // Gutters at both eaves and the downpipe at the front, run out along the roof.
    const gt = layerT("gutter");
    const g = smooth(gt);
    const eaveZ = SLOPE * Math.cos(pr);
    const eaveY = lift0 + p.coverTop * Math.cos(pr) - 0.05 * Math.sin(pr);
    gutters.current.forEach((m, i) => {
      if (!m) return;
      const s = i === 0 ? 1 : -1;
      m.visible = g > 0.001;
      const len = (LEN + 0.06) * g;
      m.scale.set(Math.max(0.0001, len), 1, 1);
      m.position.set(-LEN / 2 - 0.03 + len / 2, eaveY - 0.06, s * (eaveZ + 0.06 + p.coverTop * Math.sin(pr)));
    });
    const pm = pipe.current;
    const pipeX = -LEN / 2 + 0.1;
    const pipeZ = eaveZ + 0.06 + p.coverTop * Math.sin(pr);
    const pipeTop = eaveY - 0.08;
    const pipeLen = 0.9;
    if (pm) {
      const pg = smooth(clamp01(gt * 2 - 1));
      pm.visible = pg > 0.001;
      pm.scale.set(1, Math.max(0.0001, pipeLen * pg), 1);
      pm.position.set(pipeX, pipeTop - (pipeLen * pg) / 2, pipeZ);
    }

    // The chimney stands with the structure, from below the slope to above the ridge.
    const sm = stack.current;
    if (sm) {
      const st = smooth(layerT("structure"));
      slopeFrame(1, pr, lift0);
      const foot = _eave.clone().addScaledVector(_d, CHIMNEY.u);
      const topY = lift0 + ridgeH + 0.32;
      const bottomY = foot.y - 0.25;
      const h = Math.max(0.0001, (topY - bottomY) * st);
      sm.visible = chimney && st > 0.001;
      sm.scale.set(CHIMNEY.w, h, CHIMNEY.w);
      sm.position.set(CHIMNEY.x, bottomY + h / 2, foot.z);
      if (brick) brick.repeat.set(1.5, (topY - bottomY) * 6);
    }

    // Wet tiles darken and shine.
    const mat = coverMat.current;
    if (mat) {
      const dry = shown === "metal" ? 0.32 : shown === "bitumen" ? 0.9 : 0.84;
      mat.roughness = MathUtils.lerp(dry, dry * 0.62, weather.wet);
      mat.color.set(coverColor).multiplyScalar(1 - 0.22 * weather.wet);
    }

    // The rain: drops fall, break on the cover (or fall past it), and come round again from above.
    const coverOn = layerT("cover") > 0.95 ? 1 : 0;
    const coverEnd = p.ends.cover ?? LEN / 2;
    const surface = (x: number, z: number) => {
      if (!coverOn || x < -LEN / 2 || x > coverEnd || Math.abs(z) > eaveZ) return -1.1;
      return lift0 + (eaveZ - Math.abs(z)) * Math.tan(pr) + p.coverTop / Math.cos(pr);
    };
    const dm = drops.current;
    const active = Math.round(weather.wet * RAIN);
    if (dm) {
      const r = Math.random;
      weather.drops.forEach((d, i) => {
        if (i >= active) return dm.setMatrixAt(i, HIDDEN);
        d.y -= d.v * dt;
        d.x -= 0.12 * dt;
        if (d.y < surface(d.x, d.z)) {
          d.y = 0.9 + r() * 0.5;
          d.x = (r() - 0.5) * (LEN + 0.3);
          d.z = (r() - 0.5) * 2.3;
        }
        _m.makeRotationZ(0.08).setPosition(d.x, d.y, d.z);
        dm.setMatrixAt(i, _m);
      });
      dm.instanceMatrix.needsUpdate = true;
    }

    // Runnels: water running down the cover to the eaves.
    const um = runs.current;
    if (um) {
      const on = coverOn * weather.wet;
      const n = Math.round(on * RUN);
      weather.runs.forEach((w, i) => {
        if (i >= n || w.x > coverEnd - 0.03) return um.setMatrixAt(i, HIDDEN);
        w.u -= w.v * dt * (0.4 + Math.sin(pr));
        if (w.u < -0.04) {
          w.u = SLOPE - 0.05 - Math.random() * 0.3;
          w.x = -LEN / 2 + 0.05 + Math.random() * (coverEnd + LEN / 2 - 0.1);
        }
        place({ s: w.s, u: w.u, x: w.x, n: p.coverTop + 0.008, size: [1, 1, 1], layer: "cover", at: 0 }, pr, lift0, 1, _m);
        um.setMatrixAt(i, _m);
      });
      um.instanceMatrix.needsUpdate = true;
    }

    // Out of the downpipe's foot.
    const om = spout.current;
    if (om) {
      const on = coverOn * weather.wet * (pm?.visible ? 1 : 0);
      const footY = pipeTop - pipeLen;
      weather.spout.forEach((w, i) => {
        if (on < 0.05) return om.setMatrixAt(i, HIDDEN);
        w.y -= w.v * dt * 0.5;
        if (w.y < -1) w.y += 1;
        // A short fall out of the shoe, thinning to nothing: the water leaves the roof, it does not fall forever.
        const t = -w.y;
        const k = 1 - t;
        _m.makeScale(1.4 * k, 0.6 * k, 1.4 * k).setPosition(pipeX, footY - t * 0.3, pipeZ + 0.03 + t * 0.06);
        om.setMatrixAt(i, _m);
      });
      om.instanceMatrix.needsUpdate = true;
    }
  });

  const rainColor = palette.rain;
  return (
    <group position={position} scale={scale}>
      {/* The frame box: Framed measures this once, never the roof, so the roof can change without being rescaled. */}
      <mesh visible={false}>
        <boxGeometry args={frame} />
      </mesh>
      <group ref={pivot} userData={{ unframed: true }}>
        <group ref={body}>
          <group>
            <instancedMesh key={`t${shown}${p.timber.length}`} ref={timber} args={[box, undefined, p.timber.length]} frustumCulled={false}>
              <meshStandardMaterial roughness={0.78} metalness={0} />
            </instancedMesh>
            {/* A layer with no pieces (no membrane on a flat roof, no lead without a chimney) has no mesh at all. */}
            {p.membrane.length ? (
              <instancedMesh key={`m${p.membrane.length}`} ref={membrane} args={[box, undefined, p.membrane.length]} frustumCulled={false}>
                <meshStandardMaterial color={palette.membrane} roughness={0.45} metalness={0.05} />
              </instancedMesh>
            ) : null}
            {p.cover.length ? (
              <instancedMesh key={`c${shown}${p.cover.length}`} ref={covers} args={[coverGeometry, undefined, p.cover.length]} frustumCulled={false}>
                <meshStandardMaterial ref={coverMat} vertexColors roughness={0.72} metalness={shown === "metal" ? 0.75 : 0} />
              </instancedMesh>
            ) : null}
            {p.ridge.length ? (
              <instancedMesh key={`r${shown}${p.ridge.length}`} ref={ridge} args={[ridgeGeo, undefined, p.ridge.length]} frustumCulled={false}>
                <meshStandardMaterial color={coverColor} roughness={0.8} metalness={shown === "metal" ? 0.75 : 0} side={DoubleSide} />
              </instancedMesh>
            ) : null}
            {p.lead.length ? (
              <instancedMesh key={`l${p.lead.length}`} ref={leads} args={[box, undefined, p.lead.length]} frustumCulled={false}>
                <meshStandardMaterial color={palette.lead} roughness={0.55} metalness={0.35} />
              </instancedMesh>
            ) : null}
            {[0, 1].map((i) => (
              <mesh key={i} ref={(m) => void (gutters.current[i] = m)} geometry={gutterGeo} visible={false}>
                <meshStandardMaterial color={palette.zinc} roughness={0.32} metalness={0.85} side={DoubleSide} />
              </mesh>
            ))}
            <mesh ref={pipe} geometry={pipeGeo} visible={false}>
              <meshStandardMaterial color={palette.zinc} roughness={0.32} metalness={0.85} />
            </mesh>
            <mesh ref={stack} geometry={box} visible={false}>
              <meshStandardMaterial map={brick ?? undefined} color={brick ? "#ffffff" : palette.brick} roughness={0.9} />
            </mesh>
            <instancedMesh ref={drops} args={[dropGeo, undefined, RAIN]} frustumCulled={false}>
              <meshBasicMaterial color={rainColor} transparent opacity={0.55} depthWrite={false} />
            </instancedMesh>
            <instancedMesh ref={runs} args={[runGeo, undefined, RUN]} frustumCulled={false}>
              <meshStandardMaterial color="#dfe8ee" roughness={0.05} metalness={0.2} transparent opacity={0.7} depthWrite={false} />
            </instancedMesh>
            <instancedMesh ref={spout} args={[dropGeo, undefined, SPOUT]} frustumCulled={false}>
              <meshBasicMaterial color={rainColor} transparent opacity={0.7} depthWrite={false} />
            </instancedMesh>
          </group>
        </group>
      </group>
    </group>
  );
}
