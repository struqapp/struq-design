"use client";
// components/struq/kit/drawn/RoofSection.tsx (Struq recipe)
// An architectural section through the eave of a roof, drawn to scale in millimetres the way a draughtsman would ink
// it: the brick wall and the wall plate as context, then the build-up bottom to top (rafters, membrane, battens, the
// cover, the gutter). Every cut face is hatched by its material (timber along the grain where it runs in the plane of
// the section, crossed where it is cut across; brick at 45 degrees; insulation as the batt coil; thin sections such as
// tiles, slate, zinc and bitumen solid), outlines heavy, hatching and leaders thin, the pitch dimensioned. The layers
// end in steps up the slope, as in a cut-away, so each one shows its own surface and carries its own leader and name
// without crossing another. Line weights, label size and leader spacing stay the same in screen pixels from a phone
// to a wide screen, so it reads at 390 and at 1440.
//
// <RoofSection progress={p} />                                   a tile roof at 40 degrees, named in Dutch
// <RoofSection cover="slate" pitch={45} locale="en-GB" />         finished, English names
// <RoofSection cover="flat" labels={{ cover: "Bitumen, twee lagen" }} progress={p} />
//
// Props
// - cover: "tile" (default) | "slate" | "metal" (standing seam on boarding) | "flat" (joists, boarding, insulation,
//   bitumen). It sets what each layer is and its default name.
// - pitch: degrees, 0 to 60 (default 40; 2 for a flat roof). The rafters, the tiles' lap and the dimension follow it.
// - layers: which layers to draw and build, in build order (default all: "rafters", "membrane", "battens", "cover",
//   "gutter"). A layer left out is not drawn.
// - labels: the layer names in the client's words, by layer ({ rafters: "Sporen", ... }); false hides every name.
//   The defaults are Dutch or English by `locale` and follow the cover (a flat roof's "rafters" are "Balklaag").
// - progress: 0 to 1, the build. Each layer takes an equal share, bottom up: its outline draws, its hatching settles,
//   then its name sets in on its leader. Left out, the drawing stands finished. Drive it from your scene's scroll
//   (ScrollTrigger progress) and read which layer is landing with `roofLayerAt(progress, layers.length)`.
// - wall: false drops the wall and wall plate (default true). dimension: false drops the pitch (default true).
// - locale (default "nl-NL"), title (the figure's accessible name; a sentence by default), className (on the figure).
//
// Mounting: give the figure a box. With only a width it keeps its own aspect (taller than wide at a steep pitch); with
// a width and a height (a sticky screen: className="absolute inset-0 h-full w-full") the drawing fits inside it and
// measures the scale it renders at, so the weights and names hold. The root is a <figure data-drawn="roof">, ink on
// the scene's ground, the cover in the palette's accent; the context (wall, plate) a step lighter.
//
// Motion: none of its own. It renders `progress`; the scene owns the scroll. Reduced motion: pass 1.
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

export type RoofCover = "tile" | "slate" | "metal" | "flat";
export type RoofLayer = "rafters" | "membrane" | "battens" | "cover" | "gutter";
export const ROOF_LAYERS: readonly RoofLayer[] = ["rafters", "membrane", "battens", "cover", "gutter"];

type Props = {
  cover?: RoofCover;
  pitch?: number;
  layers?: readonly RoofLayer[];
  labels?: Partial<Record<RoofLayer, string>> | false;
  progress?: number;
  wall?: boolean;
  dimension?: boolean;
  locale?: string;
  title?: string;
  className?: string;
};

const NAMES: Record<"nl" | "en", Record<RoofCover, Record<RoofLayer, string>>> = {
  nl: {
    tile: { rafters: "Sporen", membrane: "Folie", battens: "Latten", cover: "Pannen", gutter: "Goot" },
    slate: { rafters: "Sporen", membrane: "Folie", battens: "Latten", cover: "Leien", gutter: "Goot" },
    metal: { rafters: "Sporen", membrane: "Folie", battens: "Dakbeschot", cover: "Zink, staande naad", gutter: "Goot" },
    flat: { rafters: "Balklaag", membrane: "Dakbeschot", battens: "Isolatie", cover: "Bitumen", gutter: "Goot" },
  },
  en: {
    tile: { rafters: "Rafters", membrane: "Membrane", battens: "Battens", cover: "Tiles", gutter: "Gutter" },
    slate: { rafters: "Rafters", membrane: "Membrane", battens: "Battens", cover: "Slates", gutter: "Gutter" },
    metal: { rafters: "Rafters", membrane: "Membrane", battens: "Boarding", cover: "Standing seam", gutter: "Gutter" },
    flat: { rafters: "Joists", membrane: "Boarding", battens: "Insulation", cover: "Bitumen", gutter: "Gutter" },
  },
};

const TITLE = {
  nl: "Doorsnede van de dakvoet: muur, {layers}",
  en: "Section through the eave: wall, {layers}",
};

/** The share of layer i in a build of n layers at `progress`, 0 to 1. */
export function roofLayerProgress(progress: number, i: number, n: number): number {
  return clamp(progress * n - i);
}

/** The layer landing at `progress`: the index whose share is under way (the last one once all have landed). */
export function roofLayerAt(progress: number, n: number): number {
  return Math.max(0, Math.min(n - 1, Math.floor(progress * n)));
}

type Pt = [number, number];
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const r = (n: number) => Math.round(n * 10) / 10;
const poly = (pts: Pt[], close = true) => pts.map((p, i) => `${i ? "L" : "M"}${r(p[0])} ${r(p[1])}`).join(" ") + (close ? " Z" : "");

/** One shape of the drawing: its outline, how its cut face is filled, and its own window inside the layer's build. */
type Shape = {
  d: string;
  face?: "grain" | "brick" | "insulation" | "solid" | "none";
  /** Crossed timber: the two diagonals of a cut-across section, as a path. */
  cross?: string;
  /** Extra thin lines that belong to it (a seam seen beyond, a second ply). */
  thin?: string;
  heavy?: boolean;
  accent?: boolean;
};

type Part = { key: RoofLayer; shapes: Shape[]; anchor: Pt };

/** The whole drawing in millimetres, y down. The origin is the top of the rafter at its plumb cut. */
function geometry(cover: RoofCover, pitchDeg: number, layers: readonly RoofLayer[], withWall: boolean) {
  const p = (clamp(pitchDeg, 0, 60) * Math.PI) / 180;
  const [cos, sin, tan] = [Math.cos(p), Math.sin(p), Math.tan(p)];
  const flat = cover === "flat";
  /** A point at `s` up the slope from the plumb cut and `n` above the rafter's top. */
  const P = (s: number, n: number): Pt => [s * cos - n * sin, -s * sin - n * cos];

  const D = flat ? 220 : 171; // rafter or joist depth
  const S = flat ? 1500 : 1700; // drawn length along the slope
  const ends = { cover: 0.62, battens: 0.8, membrane: 0.9 };
  const has = (k: RoofLayer) => layers.includes(k);
  const parts: Part[] = [];
  const context: Shape[] = [];

  // The underside of the rafter: y = -x tan p + D / cos p.
  const under = (x: number) => -x * tan + D / cos;

  // The wall and the plate. A birdsmouth seats a pitched rafter on the plate; a flat joist simply bears on it.
  const xa = flat ? 300 : 340;
  const notch = flat || p < 0.26 ? 0 : 48;
  const ySeat = under(xa) - notch;
  const seatEnd = notch ? xa + notch / tan : xa;
  const plateH = 70;
  const wallBottom = ySeat + plateH + 260;
  if (withWall) {
    context.push({ d: poly([[xa, ySeat], [xa + 100, ySeat], [xa + 100, ySeat + plateH], [xa, ySeat + plateH]]), cross: `M${xa} ${ySeat} L${xa + 100} ${ySeat + plateH} M${xa + 100} ${ySeat} L${xa} ${ySeat + plateH}` });
    const zig = (y: number) => {
      const w = 100;
      return [[xa + w, y - 10], [xa + w * 0.62, y - 10], [xa + w * 0.55, y - 24], [xa + w * 0.45, y + 4], [xa + w * 0.38, y - 10], [xa, y - 10]] as Pt[];
    };
    context.push({ d: poly([[xa, ySeat + plateH], [xa + 100, ySeat + plateH], ...zig(wallBottom)]), face: "brick" });
  }

  // Rafters: the plumb cut at the eave, the birdsmouth, a break line where the drawing stops up the slope.
  if (has("rafters")) {
    const zz: Pt[] = [P(S, 0), P(S + 18, -D * 0.38), P(S - 14, -D * 0.5), P(S + 8, -D * 0.62), P(S, -D)];
    const outline: Pt[] = [
      [0, 0],
      ...zz,
      [seatEnd, ySeat],
      ...(notch ? ([[xa, ySeat], [xa, under(xa)]] as Pt[]) : []),
      [0, D / cos],
    ];
    const rafter: Shape = { d: poly(outline), face: "grain", heavy: true };
    const shapes = [rafter];
    if (!flat) {
      // The fascia board on the plumb cut, cut across.
      const top = -6;
      const bot = D / cos - 20;
      shapes.unshift({ d: poly([[-22, top], [0, top], [0, bot], [-22, bot]]), cross: `M-22 ${top} L0 ${bot} M0 ${top} L-22 ${bot}`, heavy: true });
    }
    parts.push({ key: "rafters", shapes, anchor: P(S - 110, 0) });
  }

  // The second layer: a membrane for a pitched roof, the boarding for a flat one.
  const t1 = flat ? 18 : 1.5;
  if (has("membrane")) {
    const sEnd = S * ends.membrane;
    if (flat) {
      parts.push({ key: "membrane", shapes: [{ d: poly([P(-30, 0), P(sEnd, 0), P(sEnd, t1), P(-30, t1)]), face: "solid", heavy: false }], anchor: P(sEnd - 40, t1) });
    } else {
      // Over the rafter, over the fascia and down into the gutter.
      const lip: Pt[] = [P(sEnd, 1.5), P(0, 1.5), [-26, -2], [-58, 60]];
      parts.push({ key: "membrane", shapes: [{ d: poly(lip, false), heavy: true }], anchor: P(sEnd - 40, 1.5) });
    }
  }

  // Battens: counter-battens along the rafter, tile battens across it (or the boarding, or the insulation).
  const cb = 22; // counter-batten
  const bh = 22; // batten height
  const bw = 32; // batten width along the slope
  const base = t1 + cb; // top of the counter-batten
  const topOfBattens = base + bh;
  const coverLen = cover === "slate" ? 500 : 420;
  const gauge = cover === "slate" ? 210 : 330;
  const firstBatten = cover === "slate" ? 330 : 300;
  const battenAt: number[] = [];
  for (let b = firstBatten; b + bw < S * ends.battens - 8; b += gauge) battenAt.push(b);
  const deckTop = flat ? t1 + 100 : base + 18; // insulation top, or boarding top for metal
  if (has("battens")) {
    const sEnd = S * ends.battens;
    const shapes: Shape[] = [];
    if (flat) {
      shapes.push({ d: poly([P(0, t1), P(sEnd, t1), P(sEnd, deckTop), P(0, deckTop)]), face: "insulation", heavy: true });
    } else {
      shapes.push({ d: poly([P(14, t1), P(sEnd + 20, t1), P(sEnd + 20, base), P(14, base)]), face: "grain", heavy: true });
      if (cover === "metal") {
        shapes.push({ d: poly([P(-24, base), P(sEnd, base), P(sEnd, deckTop), P(-24, deckTop)]), face: "grain", heavy: true });
      } else {
        // The eave batten stands taller, so the first row lies at the same tilt as the rest.
        const rise = cover === "slate" ? base + 7 + bh : base + bh + 15;
        const box = (s0: number, n0: number, s1: number, n1: number): Shape => {
          const [a, b, c, d] = [P(s0, n0), P(s1, n0), P(s1, n1), P(s0, n1)];
          return { d: poly([a, b, c, d]), cross: `M${r(a[0])} ${r(a[1])} L${r(c[0])} ${r(c[1])} M${r(b[0])} ${r(b[1])} L${r(d[0])} ${r(d[1])}`, heavy: true };
        };
        shapes.push(box(16, base, 16 + bw, rise));
        for (const b of battenAt) shapes.push(box(b, base, b + bw, topOfBattens));
      }
    }
    const last = flat || cover === "metal" ? sEnd - 40 : (battenAt[battenAt.length - 1] ?? sEnd) + bw / 2;
    parts.push({ key: "battens", shapes, anchor: P(last, flat || cover === "metal" ? deckTop : topOfBattens) });
  }

  // The cover, laid from the eave up, each row over the one below.
  if (has("cover")) {
    const sEnd = S * ends.cover;
    const shapes: Shape[] = [];
    let anchor: Pt = P(sEnd, topOfBattens);
    if (cover === "tile" || cover === "slate") {
      const T = cover === "slate" ? 7 : 14;
      const lowN = cover === "slate" ? topOfBattens + 2 * T : topOfBattens + 15;
      // The top batten stays bare, so the battens show beyond the last row.
      const hosts = battenAt.slice(0, -1).filter((b) => b + bw + 20 <= sEnd + 1);
      hosts.forEach((b) => {
        const top = b + bw + (cover === "slate" ? 0 : 20);
        const bot = top - coverLen;
        const tilt = (lowN - topOfBattens) / coverLen;
        const at = (s: number, extra: number): Pt => P(s, topOfBattens + (top - s) * tilt + extra);
        const outline: Pt[] = [at(bot, 0), at(top, 0), at(top, T), at(bot, T)];
        if (cover === "tile") {
          // The nib hooks behind the batten.
          const nib: Pt[] = [P(b + bw + 14, topOfBattens), P(b + bw + 14, topOfBattens - 15), P(b + bw, topOfBattens - 15), P(b + bw, topOfBattens)];
          outline.splice(1, 0, ...nib);
        }
        shapes.push({ d: poly(outline), face: "solid", accent: true, heavy: true });
        anchor = at(top - 30, T);
      });
    } else if (cover === "metal") {
      const top = deckTop + 0.8;
      shapes.push({
        d: poly([P(sEnd, top), P(-30, top), [P(-30, top)[0] - 2, P(-30, top)[1] + 40]], false),
        heavy: true,
        accent: true,
        thin: poly([P(-30, top + 25), P(sEnd, top + 25)], false),
      });
      anchor = P(sEnd - 40, top);
    } else {
      const top = deckTop + 4;
      shapes.push({ d: poly([P(-20, deckTop), P(sEnd, deckTop), P(sEnd, top), P(-20, top)]), face: "solid", accent: true, heavy: true, thin: poly([P(-20, top + 4), P(sEnd - 60, top + 4)], false) });
      anchor = P(sEnd - 40, top + 4);
    }
    parts.push({ key: "cover", shapes, anchor });
  }

  // The gutter: half-round zinc on its bracket, under the lowest row, the bead rolled to the outside.
  if (has("gutter")) {
    const R = 66;
    const cx = flat ? -110 : -104;
    const cy = flat ? 40 : 46;
    const bowl = `M${cx - R} ${cy} A${R} ${R} 0 0 0 ${cx + R} ${cy} L${cx + R + 6} ${cy - 10}`;
    const bead = `M${cx - R - 6} ${cy} a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0`;
    const B = R + 5;
    const bracket = `M-22 ${cy - 22} L${cx + R + 12} ${cy - 22} L${cx + B} ${cy} A${B} ${B} 0 0 1 ${cx - B} ${cy} L${cx - B - 4} ${cy - 8}`;
    parts.push({
      key: "gutter",
      shapes: [
        { d: bracket, heavy: false },
        { d: bowl, heavy: true },
        { d: bead, heavy: true },
      ],
      anchor: [cx, cy + R + 5],
    });
  }

  // The bounds: every point the paths name, read back from their numbers.
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of [...context, ...parts.flatMap((x) => x.shapes)]) {
    const nums = (s.d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    // Arc commands carry radii and flags; the gutter's bounds are added by hand below.
    if (/A|a/.test(s.d)) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
  }
  if (has("gutter")) {
    xs.push(flat ? -110 - 78 : -104 - 78, 0);
    ys.push(140);
  }
  if (!xs.length) xs.push(0, 100), ys.push(0, 100);
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  const dim = flat ? null : { at: [seatEnd, ySeat] as Pt, len: 230 };
  return { parts, context, box, dim, wallBottom, p, P, S };
}

export function RoofSection({
  cover = "tile",
  pitch,
  layers = ROOF_LAYERS,
  labels,
  progress,
  wall = true,
  dimension = true,
  locale = "nl-NL",
  title,
  className = "",
}: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const lang = locale.toLowerCase().startsWith("nl") ? "nl" : "en";
  const deg = pitch ?? (cover === "flat" ? 2 : 40);
  const geo = useMemo(() => geometry(cover, deg, layers, wall), [cover, deg, layers, wall]);
  const names = { ...NAMES[lang][cover], ...(labels || {}) };
  const showLabels = labels !== false;

  // The frame: the drawing, room above for the names, room below for the gutter's name.
  // The names' room is set in screen pixels, so it is read from the scale the last render measured.
  const [px, setPx] = useState(0.3);
  const u = (n: number) => n / px;
  const pad = 40;
  const order = [...geo.parts].filter((x) => x.key !== "gutter").sort((a, b) => a.anchor[0] - b.anchor[0]);
  const step = u(24);
  const font = u(13);
  const ladder = step * Math.max(0, order.length - 1) + u(18) + font * 1.4;
  const labelRoom = showLabels ? ladder + u(10) : 40;
  const vx = geo.box.x0 - pad - (showLabels ? u(8) : 0);
  const vy = geo.box.y0 - labelRoom;
  const vw = geo.box.x1 - vx + pad + (showLabels ? u(72) : 0);
  const vh = geo.box.y1 + (showLabels && layers.includes("gutter") ? u(52) : pad) - vy;
  // The scale the drawing renders at: the svg fits its box (meet), so the smaller of the two ratios.
  useEffect(() => {
    const el = svg.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.height > 0) {
        const next = Math.round(Math.min(b.width / vw, b.height / vh) * 1000) / 1000;
        setPx((was) => (Math.abs(was - next) > 0.002 ? next : was));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [vw, vh]);
  const w = { heavy: u(1.5), mid: u(1), thin: u(0.55) };
  const raw = `roof${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const n = geo.parts.length;
  const prog = progress === undefined ? 1 : clamp(progress);

  // The names: a ladder up and to the right, so no leader crosses another name.
  const ladderTop = geo.box.y0 - u(18) - step * (order.length - 1);

  const hatch: ReactNode = (
    <defs>
      <pattern id={`${raw}-grain`} patternUnits="userSpaceOnUse" width={u(64)} height={u(9)} patternTransform={`rotate(${-(geo.p * 180) / Math.PI})`}>
        <path d={`M0 ${u(4.5)} Q${u(16)} ${u(1.5)} ${u(32)} ${u(4.5)} T${u(64)} ${u(4.5)}`} fill="none" stroke="var(--ink)" strokeWidth={w.thin} />
      </pattern>
      <pattern id={`${raw}-brick`} patternUnits="userSpaceOnUse" width={u(7)} height={u(7)} patternTransform="rotate(45)">
        <path d={`M0 ${u(3.5)} H${u(7)}`} stroke="var(--ink)" strokeWidth={w.thin} />
      </pattern>
      <pattern id={`${raw}-insulation`} patternUnits="userSpaceOnUse" width={u(18)} height={100} patternTransform={`rotate(${-(geo.p * 180) / Math.PI})`}>
        <path d={`M0 0 L${u(9)} 100 L${u(18)} 0`} fill="none" stroke="var(--ink)" strokeWidth={w.thin} />
      </pattern>
    </defs>
  );

  const fillOf = (s: Shape) =>
    s.face === "solid" ? (s.accent ? "var(--accent)" : "var(--ink)") : s.face && s.face !== "none" ? `url(#${raw}-${s.face})` : "none";

  const renderShape = (s: Shape, key: string, t: number, context = false) => {
    const line = span(t, 0, 0.7);
    const face = span(t, 0.35, 0.9);
    const stroke = s.accent ? "var(--accent)" : "var(--ink)";
    return (
      <g key={key} opacity={context ? 0.55 : 1}>
        {s.face && s.face !== "none" ? <path d={s.d} fill={fillOf(s)} stroke="none" opacity={face} /> : null}
        {s.cross ? <path d={s.cross} fill="none" stroke="var(--ink)" strokeWidth={w.thin} opacity={face} /> : null}
        {s.thin ? <path d={s.thin} fill="none" stroke={stroke} strokeWidth={w.thin} strokeDasharray={`${u(6)} ${u(3)}`} opacity={face} /> : null}
        <path
          d={s.d}
          pathLength={1}
          fill="none"
          stroke={stroke}
          strokeWidth={s.heavy ? w.heavy : w.mid}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={line < 1 ? "1 1" : undefined}
          strokeDashoffset={line < 1 ? 1 - line : undefined}
          opacity={line > 0 ? 1 : 0}
        />
      </g>
    );
  };

  const layerNames = geo.parts.map((x) => names[x.key]).join(", ");
  const label = title ?? TITLE[lang].replace("{layers}", layerNames.toLowerCase());

  return (
    <figure data-drawn="roof" className={`m-0 text-ink ${className}`}>
      <svg ref={svg} viewBox={`${r(vx)} ${r(vy)} ${r(vw)} ${r(vh)}`} className="block h-full w-full overflow-visible" role="img" aria-label={label}>
        {hatch}
        {geo.context.map((s, i) => renderShape(s, `c${i}`, 1, true))}
        {geo.parts.map((part, i) => {
          const t = roofLayerProgress(prog, i, n);
          const m = part.shapes.length;
          return (
            <g key={part.key} data-layer={part.key} data-landed={t >= 1 ? "" : undefined}>
              {part.shapes.map((s, j) => {
                // Repeated pieces land one after another inside the layer's share, from the eave up.
                const a = m > 1 ? (j / m) * 0.55 : 0;
                return renderShape(s, `${part.key}${j}`, span(t, a, a + (m > 1 ? 0.45 : 1)));
              })}
            </g>
          );
        })}
        {dimension && geo.dim && layers.includes("rafters") ? (
          (() => {
            const t = roofLayerProgress(prog, 0, n);
            const [x, y] = geo.dim.at;
            const R = geo.dim.len * 0.8;
            const a: Pt = [x + R * Math.cos(geo.p), y - R * Math.sin(geo.p)];
            return (
              <g opacity={span(t, 0.6, 1)}>
                <path d={`M${r(x)} ${r(y)} H${r(x + geo.dim.len)}`} stroke="var(--ink)" strokeWidth={w.thin} fill="none" />
                <path d={`M${r(x + R)} ${r(y)} A${r(R)} ${r(R)} 0 0 0 ${r(a[0])} ${r(a[1])}`} stroke="var(--ink)" strokeWidth={w.thin} fill="none" />
                <text x={x + R + u(6)} y={y - R * Math.sin(geo.p / 2) + u(4)} fontSize={font} fill="var(--ink)" style={{ fontFeatureSettings: '"tnum"' }}>
                  {`${Math.round(deg)}°`}
                </text>
              </g>
            );
          })()
        ) : null}
        {showLabels
          ? geo.parts.map((part, i) => {
              const t = roofLayerProgress(prog, i, n);
              const o = span(t, 0.65, 1);
              const [ax, ay] = part.anchor;
              const ink = part.key === "cover" ? "var(--accent)" : "var(--ink)";
              if (part.key === "gutter") {
                const ly = ay + u(30);
                return (
                  <g key={`n${part.key}`} opacity={o}>
                    <path d={`M${r(ax)} ${r(ay + u(4))} V${r(ly - font)}`} stroke="var(--ink)" strokeWidth={w.thin} />
                    <circle cx={ax} cy={ay + u(4)} r={u(2.2)} fill="var(--ink)" />
                    <text x={ax} y={ly + u(2)} fontSize={font} textAnchor="middle" fill="var(--ink)">
                      {names[part.key]}
                    </text>
                  </g>
                );
              }
              const rank = order.findIndex((x) => x.key === part.key);
              const ly = ladderTop + rank * step;
              const lift = (1 - o) * u(6);
              return (
                <g key={`n${part.key}`} opacity={o}>
                  <path d={`M${r(ax)} ${r(ay)} V${r(ly)} h${r(u(10))}`} fill="none" stroke="var(--ink)" strokeWidth={w.thin} />
                  <circle cx={ax} cy={ay} r={u(2.2)} fill={ink} />
                  <text x={ax + u(14)} y={ly + u(4.5) + lift} fontSize={font} fill="var(--ink)" fontWeight={500}>
                    {names[part.key]}
                  </text>
                </g>
              );
            })
          : null}
      </svg>
    </figure>
  );
}
