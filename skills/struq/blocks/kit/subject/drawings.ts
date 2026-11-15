// components/struq/kit/subject/drawings.ts (Struq recipe)
// The section drawings SectionDrawing ships, in millimetres (y down), each drawn from how the real thing is made and
// checked against it:
// - compression-fitting: a 15 mm straight coupling cut along its axis. Copper pipe (15 OD, 0.7 wall, drawn solid as
//   thin sections are) pushed into the body's socket up to the pipe stop; the olive (a barrel ring, both ends
//   tapered) sits on the pipe between the nut's inner cone and the body's seat at the socket mouth; the nut is
//   threaded onto the body's male thread (thread crest thick, root thin); the hex in the middle. Upper and lower
//   halves of one part hatched alike, touching parts hatched the other way, the olive at a third angle.
// - mug: a thrown mug in half section, the profile on the left of the centre line, the outside on the right. Wall 5,
//   rim 4 and rounded, base 4.5 over a recessed underside, a 6 mm foot ring with a bevel, the inner corner filleted;
//   the handle pulled and joined at two attachments on the outside, with a revolved section of the handle drawn on
//   it.
// - bowl: a footed bowl in half section: wall about 5, rim rounded, foot ring 6 wide and 5 deep, base 6.
// - door-jamb: a horizontal section through an internal door frame in a stud wall: plasterboard on both faces, the
//   stud (structural timber, crossed), mineral wool between studs, packers, the jamb lining flush with both faces,
//   the planted stop, the door leaf closed against it 3 mm off the jamb, an architrave on each face set back 6 mm
//   from the lining's edge (the reveal).
// - wall: a cavity wall in horizontal section, outside to inside: facing brick 102, a 50 clear cavity, 100 mineral
//   wool batts (partial fill), 100 concrete block inner leaf, 13 plaster; a stainless wall tie with its drip across
//   the cavity. Break lines where the strip is cut.
// Parts carry a material (SectionDrawing hatches it to the standard pattern), the callouts a key into `names`.
import type { Pt } from "./draw";

export type Material =
  | "steel"
  | "brass"
  | "copper"
  | "wood"
  | "timber"
  | "ceramic"
  | "insulation"
  | "concrete"
  | "block"
  | "brick"
  | "plaster"
  | "solid"
  | "void";

export type DrawingPart = {
  /** The cut face to hatch, an SVG path in drawing units. */
  d: string;
  material: Material;
  /** Hatch angle in degrees (45 by default). Touching parts take different angles. */
  angle?: number;
  /** The edge to draw at outline weight; the face's own outline when left out (a strip's break ends stay thin). */
  stroke?: string;
  /** For "timber": the box the cross is drawn corner to corner in. */
  box?: [number, number, number, number];
};

export type DrawingLine = { d: string; kind: "visible" | "thin" | "center" | "hidden" };

/**
 * A dimension: the distance between a and b measured along x or y, its line at `at` (the y of an x dimension, the x
 * of a y dimension). `prefix` for a diameter ("Ø"). `text` overrides the measured value.
 */
export type DrawingDim = { a: Pt; b: Pt; axis: "x" | "y"; at: number; prefix?: string; text?: string };

/** A numbered callout: the leader's dot on the part (`at`), the balloon (`to`), the key of its name. */
export type DrawingCallout = { key: string; at: Pt; to: Pt };

export type Drawing = {
  /** x, y, width, height of the drawing area, in drawing units. */
  view: [number, number, number, number];
  parts: DrawingPart[];
  lines?: DrawingLine[];
  dims?: DrawingDim[];
  callouts?: DrawingCallout[];
  /** The callouts' names, by key. */
  names?: Record<string, string>;
  /** The drawing's default title. */
  title?: string;
  /** The unit the dimensions are in. */
  unit?: string;
};

export type DrawingName = "compression-fitting" | "mug" | "bowl" | "door-jamb" | "wall";

const f = (n: number) => Math.round(n * 100) / 100;
const poly = (pts: readonly Pt[], close = true) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${f(p[0])} ${f(p[1])}`).join(" ") + (close ? " Z" : "");
const rect = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
/** An axially symmetric part's half, given as (x, r) with r up from the axis, mirrored to the other side. */
const upper = (pts: readonly Pt[]) => pts.map(([x, r]) => [x, -r] as Pt);
const lower = (pts: readonly Pt[]) => pts.map(([x, r]) => [x, r] as Pt);
const flipX = (pts: readonly Pt[]) => pts.map(([x, y]) => [-x, y] as Pt);

/** A break line across a cut member: a straight run with one sharp zig in the middle. */
function breakLine(a: Pt, b: Pt, size = 3): string {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const ext = size * 1.2;
  return poly(
    [
      [a[0] - ux * ext, a[1] - uy * ext],
      [mx - ux * size, my - uy * size],
      [mx - ux * size * 0.3 + nx * size, my - uy * size * 0.3 + ny * size],
      [mx + ux * size * 0.3 - nx * size, my + uy * size * 0.3 - ny * size],
      [mx + ux * size, my + uy * size],
      [b[0] + ux * ext, b[1] + uy * ext],
    ],
    false,
  );
}

/**
 * The batt insulation symbol: a coil whose loops span the band across its width and run along its length, the way
 * mineral wool is drawn in section.
 */
function coil(x0: number, y0: number, x1: number, y1: number, along: "x" | "y"): string {
  const width = along === "y" ? x1 - x0 : y1 - y0;
  const length = along === "y" ? y1 - y0 : x1 - x0;
  const pitch = width * 0.24;
  const k = pitch / (2 * Math.PI);
  const r = pitch * 0.42;
  const R = width / 2 - width * 0.06;
  const turns = Math.floor((length - 2 * r) / pitch);
  const used = turns * pitch;
  const start = (length - used) / 2;
  const pts: Pt[] = [];
  const steps = turns * 36;
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / 36) * 2 * Math.PI;
    const across = R * Math.cos(t);
    const run = start + k * t - r * Math.sin(t);
    pts.push(along === "y" ? [x0 + width / 2 + across, y0 + run] : [x0 + run, y0 + width / 2 + across]);
  }
  return poly(pts, false);
}

function compressionFitting(): Drawing {
  // One side of the coupling as (x, r); the right side is its mirror.
  const nut: Pt[] = [
    [-34, 7.7], [-31, 7.7], [-31, 8.1], [-26, 9.1], [-26, 9.6], [-24, 9.6], [-24, 10.5], [-9, 10.5],
    [-9, 12.4], [-9.8, 13.2], [-33.2, 13.2], [-34, 12.4],
  ];
  const olive: Pt[] = [[-30, 7.5], [-30, 8.3], [-26, 9.1], [-22, 8.3], [-22, 7.5]];
  const pipe: Pt[] = [[-48, 6.8], [-3, 6.8], [-3, 7.5], [-48, 7.5]];
  // The body across both sides: socket, seat and thread on the left, mirrored on the right.
  const bodyLeft: Pt[] = [
    [-3, 6.8], [-3, 7.6], [-20, 7.6], [-24, 9.0], [-24, 10.5], [-7, 10.5], [-7, 12.0], [-6.2, 12.8],
  ];
  const body: Pt[] = [...bodyLeft, ...flipX(bodyLeft).reverse()];
  const half = (pts: Pt[], side: "upper" | "lower") => (side === "upper" ? upper(pts) : lower(pts));
  const parts: DrawingPart[] = [];
  for (const side of ["upper", "lower"] as const) {
    parts.push({ d: poly(half(body, side)), material: "brass", angle: 45 });
    for (const mirror of [false, true]) {
      const m = (pts: Pt[]) => half(mirror ? flipX(pts) : pts, side);
      parts.push({ d: poly(m(nut)), material: "brass", angle: -45 });
      parts.push({ d: poly(m(olive)), material: "copper", angle: 75 });
      parts.push({ d: poly(m(pipe)), material: "solid" });
    }
  }
  const lines: DrawingLine[] = [{ d: poly([[-56, 0], [56, 0]], false), kind: "center" }];
  // The thread's root on the body (thin), each side, each half.
  for (const s of [-1, 1]) for (const x of [-1, 1]) lines.push({ d: poly([[x * 24, s * 9.6], [x * 7, s * 9.6]], false), kind: "thin" });
  // The pipe cut short at both ends.
  for (const x of [-48, 48]) lines.push({ d: breakLine([x, -9.5], [x, 9.5], 2.2), kind: "thin" });
  return {
    view: [-60, -31, 120, 55],
    parts,
    lines,
    dims: [
      { a: [-40, -7.5], b: [-40, 7.5], axis: "y", at: -40, prefix: "Ø" },
      { a: [-34, 13.2], b: [34, 13.2], axis: "x", at: 21 },
    ],
    callouts: [
      { key: "pipe", at: [-43, -7.15], to: [-47, -24] },
      { key: "olive", at: [-26.5, -8.6], to: [-34, -24] },
      { key: "nut", at: [-17, -12], to: [-20, -24] },
      { key: "body", at: [0, -12.2], to: [0, -24] },
    ],
    names: { pipe: "Copper pipe, 15 mm", olive: "Olive", nut: "Nut", body: "Body" },
    title: "Compression coupling, 15 mm",
    unit: "mm",
  };
}

function mug(): Drawing {
  const section =
    "M0 -7 L-30 -7 C-33.3 -7 -36 -9.7 -36 -13 L-36 -80 L-37 -93 C-37 -95.6 -41 -95.6 -41 -93 L-41 -5 L-39 0 L-33 0 L-31.5 -2.5 L0 -2.5 Z";
  const lines: DrawingLine[] = [
    { d: "M0 0 L39 0 L41 -5 L41 -18", kind: "visible" },
    { d: "M41 -30 L41 -68", kind: "visible" },
    { d: "M41 -80 L41 -93 C41 -94.6 40 -95 39 -95 L0 -95", kind: "visible" },
    { d: "M0 -5 L41 -5", kind: "visible" },
    // The handle: outer and inner edges, joined at the two attachments.
    { d: "M41 -80 C60 -82 68 -66 67 -50 C66 -34 58 -20 41 -18", kind: "visible" },
    { d: "M41 -30 C52 -31 56 -40 56 -50 C56 -60 52 -68 41 -68", kind: "visible" },
    { d: "M0 -103 L0 6", kind: "center" },
  ];
  return {
    view: [-80, -116, 186, 130],
    parts: [
      { d: section, material: "ceramic" },
      // The revolved section of the handle, laid on it.
      { d: "M57.7 -50 C57.7 -53.3 65.3 -53.3 65.3 -50 C65.3 -46.7 57.7 -46.7 57.7 -50 Z", material: "ceramic", angle: -45 },
    ],
    lines,
    dims: [
      { a: [-41, -93], b: [41, -93], axis: "x", at: -106, prefix: "Ø" },
      { a: [41, 0], b: [39, -95], axis: "y", at: 82 },
    ],
    callouts: [
      { key: "rim", at: [-39, -94.2], to: [-62, -100] },
      { key: "wall", at: [-38.5, -60], to: [-62, -64] },
      { key: "base", at: [-16, -4.8], to: [-62, -28] },
      { key: "foot", at: [-36, -0.8], to: [-62, -6] },
      { key: "handle", at: [61.5, -75], to: [66, -96] },
    ],
    names: {
      rim: "Rim, rounded, 4 thick",
      wall: "Wall, 5 thick",
      base: "Base over a recessed underside",
      foot: "Foot ring with bevel",
      handle: "Pulled handle, two attachments",
    },
    title: "Mug, half section",
    unit: "mm",
  };
}

function bowl(): Drawing {
  const section =
    "M0 -11 L-30 -11 C-52 -12 -71 -30 -75 -60 C-75.4 -62.9 -79.6 -62.9 -80 -60 C-77 -30 -58 -9 -37 -7 L-36 0 L-30 0 L-29 -5 L0 -5 Z";
  return {
    view: [-112, -84, 228, 98],
    parts: [{ d: section, material: "ceramic" }],
    lines: [
      { d: "M0 0 L36 0 L37 -7 C58 -9 77 -30 80 -60 C79.8 -61.4 78.9 -62 77.5 -62 L0 -62", kind: "visible" },
      { d: "M0 -7 L37 -7", kind: "visible" },
      { d: "M0 -72 L0 6", kind: "center" },
    ],
    dims: [
      { a: [-80, -60], b: [80, -60], axis: "x", at: -74, prefix: "Ø" },
      { a: [36, 0], b: [77.5, -62], axis: "y", at: 94 },
    ],
    callouts: [
      { key: "rim", at: [-77.5, -61.8], to: [-98, -50] },
      { key: "wall", at: [-66, -30], to: [-98, -28] },
      { key: "foot", at: [-33, -0.8], to: [-98, -6] },
      { key: "base", at: [-12, -8], to: [-50, 8] },
    ],
    names: { rim: "Rim, rounded", wall: "Wall, about 5 thick", foot: "Foot ring, 6 wide", base: "Base, 6 thick" },
    title: "Bowl, half section",
    unit: "mm",
  };
}

function doorJamb(): Drawing {
  const architrave = (face: 1 | -1): string => {
    // Section of a 70 x 18 architrave: a small round at the opening's edge, a chamfer on the outer edge.
    const y0 = face === 1 ? 0 : 114;
    const s = face === 1 ? -1 : 1;
    return `M22 ${y0} L22 ${y0 + s * 15} Q22 ${y0 + s * 18} 19 ${y0 + s * 18} L-42 ${y0 + s * 18} L-48 ${y0 + s * 12} L-48 ${y0} Z`;
  };
  return {
    view: [-196, -60, 382, 238],
    parts: [
      { d: rect(-150, 0, 142, 12.5), material: "plaster", stroke: poly([[-150, 0], [-8, 0], [-8, 12.5], [-150, 12.5]], false) },
      { d: rect(-150, 101.5, 142, 12.5), material: "plaster", stroke: poly([[-150, 101.5], [-8, 101.5], [-8, 114], [-150, 114]], false) },
      { d: rect(-46, 12.5, 38, 89), material: "timber", box: [-46, 12.5, 38, 89] },
      { d: rect(-150, 12.5, 104, 89), material: "void", stroke: poly([[-150, 12.5], [-46, 12.5]], false) },
      { d: rect(-8, 22, 8, 70), material: "wood", angle: 90 },
      { d: rect(0, 0, 28, 114), material: "wood", angle: 90 },
      { d: rect(28, 42, 12, 38), material: "wood", angle: 0 },
      { d: rect(31, 2, 119, 40), material: "wood", angle: 0, stroke: poly([[150, 2], [31, 2], [31, 42], [150, 42]], false) },
      { d: architrave(1), material: "wood", angle: 0 },
      { d: architrave(-1), material: "wood", angle: 0 },
    ],
    lines: [
      { d: coil(-150, 12.5, -46, 101.5, "x"), kind: "thin" },
      { d: breakLine([-150, -4], [-150, 118], 4), kind: "thin" },
      { d: breakLine([150, -2], [150, 46], 3), kind: "thin" },
    ],
    dims: [
      { a: [-150, 0], b: [-150, 114], axis: "y", at: -172 },
      { a: [-48, -18], b: [22, -18], axis: "x", at: -40 },
      { a: [150, 2], b: [150, 42], axis: "y", at: 168 },
    ],
    callouts: [
      { key: "architrave", at: [-20, -10], to: [-120, -38] },
      { key: "jamb", at: [14, 60], to: [88, 104] },
      { key: "stop", at: [34, 61], to: [112, 104] },
      { key: "leaf", at: [90, 22], to: [136, 104] },
      { key: "stud", at: [-27, 57], to: [-60, 154] },
      { key: "plasterboard", at: [-100, 107.5], to: [-110, 154] },
      { key: "insulation", at: [-120, 60], to: [-150, 154] },
      { key: "packer", at: [-4, 40], to: [-20, 154] },
    ],
    names: {
      architrave: "Architrave, 70 x 18",
      jamb: "Jamb lining, 28",
      stop: "Door stop, 38 x 12",
      leaf: "Door leaf, 40",
      stud: "Stud, 38 x 89",
      plasterboard: "Plasterboard, 12.5",
      insulation: "Mineral wool",
      packer: "Packer",
    },
    title: "Door jamb, horizontal section",
    unit: "mm",
  };
}

function wall(): Drawing {
  const H = 180;
  const layer = (x: number, w: number, material: Material, angle?: number): DrawingPart => ({
    d: rect(x, 0, w, H),
    material,
    angle,
    stroke: `${poly([[x, 0], [x, H]], false)} ${poly([[x + w, 0], [x + w, H]], false)}`,
  });
  const tie = poly([[52, 88.5], [122, 88.5], [127, 95], [132, 88.5], [302, 88.5], [302, 91.5], [132, 91.5], [127, 98], [122, 91.5], [52, 91.5]]);
  return {
    view: [-28, -78, 420, 330],
    parts: [
      layer(0, 102, "brick", 45),
      layer(102, 50, "void"),
      { d: rect(152, 0, 100, H), material: "void", stroke: `${poly([[152, 0], [152, H]], false)}` },
      layer(252, 100, "block"),
      layer(352, 13, "plaster"),
      { d: tie, material: "solid" },
    ],
    lines: [
      { d: coil(152, 0, 252, H, "y"), kind: "thin" },
      { d: breakLine([-6, 0], [371, 0], 5), kind: "thin" },
      { d: breakLine([-6, H], [371, H], 5), kind: "thin" },
    ],
    dims: [
      { a: [0, 0], b: [102, 0], axis: "x", at: -26 },
      { a: [102, 0], b: [152, 0], axis: "x", at: -26 },
      { a: [152, 0], b: [252, 0], axis: "x", at: -26 },
      { a: [252, 0], b: [352, 0], axis: "x", at: -26 },
      { a: [352, 0], b: [365, 0], axis: "x", at: -26 },
      { a: [0, 0], b: [365, 0], axis: "x", at: -56 },
    ],
    callouts: [
      { key: "brick", at: [51, 140], to: [30, 224] },
      { key: "cavity", at: [127, 140], to: [95, 224] },
      { key: "insulation", at: [202, 140], to: [160, 224] },
      { key: "tie", at: [80, 90], to: [225, 224] },
      { key: "block", at: [302, 140], to: [290, 224] },
      { key: "plaster", at: [358.5, 140], to: [355, 224] },
    ],
    names: {
      brick: "Facing brick, 102",
      cavity: "Clear cavity, 50",
      insulation: "Mineral wool batts, 100",
      tie: "Stainless wall tie with drip",
      block: "Concrete block, 100",
      plaster: "Plaster, 13",
    },
    title: "Cavity wall, horizontal section",
    unit: "mm",
  };
}

export const DRAWINGS: Record<DrawingName, () => Drawing> = {
  "compression-fitting": compressionFitting,
  mug,
  bowl,
  "door-jamb": doorJamb,
  wall,
};
