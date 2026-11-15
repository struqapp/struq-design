"use client";
// components/struq/kit/subject/PatternPaper.tsx (Struq recipe)
// A sewing pattern piece on pattern paper, drawn as a pattern maker draws it: a light centimetre grid, the piece from
// a named block (bodice front and back, sleeve, skirt panel, trouser front) with its true anatomy (necklines and
// armholes scoop inward), the stitching line dashed, the cut line a true even offset of it (computed per edge, the
// hem deeper, nothing on a fold), notches as snips into the allowance (one front, two back), the darts with their
// apex, the grainline arrow, the fold bracket ("CF, place on fold") where the piece is cut on the fold, and the
// piece's label block: style name, piece, size, how many to cut, the allowance included.
//
// <PatternPaper piece="bodice-front" style="The Ines blouse" size="38" number="1" locale="en-GB" />
//
// Props
// - piece: "bodice-front", "bodice-back", "sleeve", "skirt-panel" or "trouser-front" (patterns.ts).
// - style: the pattern's name, set largest in the label block. size: the size this sheet is graded to.
// - number: optional piece number ("1"). name: overrides the piece's own name ("Front").
// - allowance: the seam allowance in centimetres, default the block's own (1.5); hems keep their own depth.
// - cut: overrides the cutting line ("Cut 2 in lining").
// - labels: { fold?, cutFold?, cutPair?, seam?, size?, grain?, front?, back? }: the fixed words; English or Dutch
//   by locale otherwise. seam may hold {n} for the allowance ("{n} cm seam allowance included").
// - locale (default "en-GB"), caption (a line under the sheet, in the scene's ink), build ("scroll" default, or
//   "static"), className (on the figure).
//
// Mounting: inside any section, in five or more of twelve columns on a wide screen. The sheet is printed paper in the
// palette's light colour in every scene. The trouser front lies on its side on a wide sheet and stands upright on a
// narrow one. The root is a <figure data-subject="pattern">.
//
// Motion: tied to the scroll. The cut line draws itself around the piece as it comes up through the view, then the
// stitching line, the marks and the label set in. Reduced motion, build="static" or no scripts: the finished sheet.
import { useRef } from "react";
import { useScrollBuild } from "./build";
import { bounds, offsetPoints, outlinePath, pointOn, polyPath, usePen, type Pt } from "./draw";
import { languageOf, number as numberText } from "./format";
import { PATTERN_PIECES, turned, type PatternTemplate, type PieceName } from "./patterns";

type PatternLabels = {
  fold: string;
  cutFold: string;
  cutPair: string;
  seam: string;
  size: string;
  grain: string;
  front: string;
  back: string;
};

type Props = {
  piece: PieceName;
  style: string;
  size?: string;
  number?: string;
  name?: string;
  allowance?: number;
  cut?: string;
  labels?: Partial<PatternLabels>;
  locale?: string;
  caption?: string;
  build?: "scroll" | "static";
  className?: string;
};

const WORDS: Record<string, PatternLabels & { names: Record<PieceName, string> }> = {
  en: {
    fold: "place on fold",
    cutFold: "Cut 1 on fold",
    cutPair: "Cut 2",
    seam: "{n} cm seam allowance included",
    size: "Size",
    grain: "Straight grain",
    front: "CF",
    back: "CB",
    names: {
      "bodice-front": "Bodice front",
      "bodice-back": "Bodice back",
      sleeve: "Sleeve",
      "skirt-panel": "Skirt front",
      "trouser-front": "Trouser front",
    },
  },
  nl: {
    fold: "aan de stofvouw",
    cutFold: "Knip 1x aan de stofvouw",
    cutPair: "Knip 2x",
    seam: "Inclusief {n} cm naadtoeslag",
    size: "Maat",
    grain: "Draadrichting",
    front: "MV",
    back: "MA",
    names: {
      "bodice-front": "Voorpand",
      "bodice-back": "Achterpand",
      sleeve: "Mouw",
      "skirt-panel": "Rok voorpand",
      "trouser-front": "Broek voorpand",
    },
  },
};

const SMALL = "text-[0.75rem] leading-[1.4]";

export function PatternPaper({
  piece,
  style,
  size,
  number,
  name,
  allowance,
  cut,
  labels,
  locale = "en-GB",
  caption,
  build = "scroll",
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const base = PATTERN_PIECES[piece];
  const words = WORDS[languageOf(locale)] ?? WORDS.en;
  const text: PatternLabels = { ...words, ...labels };
  const sa = allowance ?? base.allowance;
  const block = {
    style,
    piece: name ?? words.names[piece],
    number,
    size: size ? `${text.size} ${size}` : undefined,
    cut: cut ?? (base.fold ? text.cutFold : text.cutPair),
    seam: text.seam.replace("{n}", numberText(sa, locale)),
  };

  useScrollBuild(
    root,
    build === "scroll",
    (el, tl) => {
      const cuts = el.querySelectorAll<SVGPathElement>("[data-pattern-cut]");
      tl.fromTo(cuts, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2 });
      tl.from(el.querySelectorAll("[data-pattern-stitch]"), { autoAlpha: 0, duration: 0.6 }, "-=0.5");
      tl.from(el.querySelectorAll("[data-pattern-mark]"), { autoAlpha: 0, duration: 0.4, stagger: 0.05 }, "-=0.3");
      tl.from(el.querySelectorAll("[data-pattern-label]"), { autoAlpha: 0, y: 8, duration: 0.6, stagger: 0.1 }, "-=0.4");
    },
    [piece, sa],
    { start: "top 80%", end: "bottom 85%" },
  );

  return (
    <figure ref={root} data-subject="pattern" data-piece={piece} className={`@container m-0 ${className}`}>
      <div data-paper="print" className="subject-paper mx-auto w-full max-w-[44rem] border border-line text-ink">
        {base.long ? (
          <>
            <div className="@2xl:hidden">
              <Sheet template={base} allowance={sa} text={text} block={block} />
            </div>
            <div className="hidden @2xl:block">
              <Sheet template={turned(base)} allowance={sa} text={text} block={block} />
            </div>
          </>
        ) : (
          <Sheet template={base} allowance={sa} text={text} block={block} />
        )}
      </div>
      {caption ? <figcaption className="mx-auto mt-4 max-w-[44rem] font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}

type Block = { style: string; piece: string; number?: string; size?: string; cut: string; seam: string };

function Sheet({ template, allowance, text, block }: { template: PatternTemplate; allowance: number; text: PatternLabels; block: Block }) {
  const svg = useRef<SVGSVGElement>(null);
  const { outline } = template;
  const cutPts = offsetPoints(outline, allowance);
  const box = bounds(cutPts);
  const margin = 2.5;
  const left = template.fold ? 4.2 : margin;
  const vb = {
    x: Math.floor(box.x - left),
    y: Math.floor(box.y - margin),
    w: 0,
    h: 0,
  };
  vb.w = Math.ceil(box.x + box.w + margin) - vb.x;
  vb.h = Math.ceil(box.y + box.h + margin + 1) - vb.y;
  const px = usePen(svg, vb.w, 600);
  const u = (pixels: number) => pixels / px;
  const at = (p: Pt) => ({ left: `${((p[0] - vb.x) / vb.w) * 100}%`, top: `${((p[1] - vb.y) / vb.h) * 100}%` });

  const segAllowance = (i: number) => (outline.segs[i].fold ? 0 : (outline.segs[i].allowance ?? allowance));
  const snip = (seg: number, t: number, shift = 0) => {
    const { p, n } = pointOn(outline, seg, t);
    const d = segAllowance(seg);
    const along: Pt = [-n[1] * shift, n[0] * shift];
    const reach = Math.min(0.9, d * 0.6);
    const a: Pt = [p[0] + n[0] * d + along[0], p[1] + n[1] * d + along[1]];
    const b: Pt = [p[0] + n[0] * (d - reach) + along[0], p[1] + n[1] * (d - reach) + along[1]];
    return polyPath([a, b]);
  };

  const arrow = (tip: Pt, from: Pt) => {
    const dx = tip[0] - from[0];
    const dy = tip[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const l = u(9);
    const w = u(4);
    return polyPath([
      [tip[0] - ux * l - uy * w, tip[1] - uy * l + ux * w],
      tip,
      [tip[0] - ux * l + uy * w, tip[1] - uy * l - ux * w],
    ]);
  };

  const [g0, g1] = template.grain;
  const grainAngle = (Math.atan2(g1[1] - g0[1], g1[0] - g0[0]) * 180) / Math.PI;
  const upright = Math.abs(grainAngle) > 45 && Math.abs(grainAngle) < 135;
  const grainMid: Pt = [(g0[0] + g1[0]) / 2, (g0[1] + g1[1]) / 2];

  const ink = "var(--ink)";
  const minor = Array.from({ length: vb.w + 1 }, (_, i) => vb.x + i);
  const rows = Array.from({ length: vb.h + 1 }, (_, i) => vb.y + i);

  return (
    <div className="relative">
      <svg
        ref={svg}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${block.style}, ${block.piece}`}
      >
        <g style={{ stroke: "color-mix(in oklab, var(--ink) 9%, transparent)", strokeWidth: u(0.6) }}>
          {minor.map((x) => (
            <line key={`x${x}`} x1={x} y1={vb.y} x2={x} y2={vb.y + vb.h} style={x % 5 === 0 ? { stroke: "color-mix(in oklab, var(--ink) 17%, transparent)", strokeWidth: u(0.9) } : undefined} />
          ))}
          {rows.map((y) => (
            <line key={`y${y}`} x1={vb.x} y1={y} x2={vb.x + vb.w} y2={y} style={y % 5 === 0 ? { stroke: "color-mix(in oklab, var(--ink) 17%, transparent)", strokeWidth: u(0.9) } : undefined} />
          ))}
        </g>

        <path data-pattern-cut="" pathLength={1} d={polyPath(cutPts, true)} fill="none" style={{ stroke: ink, strokeWidth: u(1.7), strokeLinejoin: "miter" }} />
        <path
          data-pattern-stitch=""
          d={outlinePath(outline)}
          fill="none"
          style={{ stroke: ink, strokeWidth: u(0.9), strokeDasharray: `${u(6)} ${u(4)}` }}
        />

        <g data-pattern-mark="" style={{ stroke: ink, strokeWidth: u(1.2), fill: "none", strokeLinecap: "round" }}>
          {template.notches.flatMap((notch) =>
            notch.count === 2
              ? [<path key={`${notch.seg}-${notch.t}-a`} d={snip(notch.seg, notch.t, -0.32)} />, <path key={`${notch.seg}-${notch.t}-b`} d={snip(notch.seg, notch.t, 0.32)} />]
              : [<path key={`${notch.seg}-${notch.t}`} d={snip(notch.seg, notch.t)} />],
          )}
        </g>

        {template.darts.map((dart) => {
          const a = pointOn(outline, dart.seg, dart.t1).p;
          const b = pointOn(outline, dart.seg, dart.t2).p;
          return (
            <g key={`${dart.seg}-${dart.t1}`} data-pattern-mark="">
              <path d={polyPath([a, dart.apex, b])} fill="none" style={{ stroke: ink, strokeWidth: u(0.9), strokeDasharray: `${u(6)} ${u(4)}` }} />
              <path d={snip(dart.seg, dart.t1)} style={{ stroke: ink, strokeWidth: u(1.2) }} />
              <path d={snip(dart.seg, dart.t2)} style={{ stroke: ink, strokeWidth: u(1.2) }} />
              <circle cx={dart.apex[0]} cy={dart.apex[1]} r={u(2.6)} style={{ fill: ink }} />
            </g>
          );
        })}

        <g data-pattern-mark="" style={{ stroke: ink, strokeWidth: u(1), fill: "none", strokeLinejoin: "round", strokeLinecap: "round" }}>
          <path d={polyPath([g0, g1])} />
          <path d={arrow(g0, g1)} />
          <path d={arrow(g1, g0)} />
        </g>

        {template.fold ? (
          <g data-pattern-mark="" style={{ stroke: ink, strokeWidth: u(1), fill: "none", strokeLinejoin: "round", strokeLinecap: "round" }}>
            <path
              d={polyPath([
                [template.fold.from[0] - u(2), template.fold.from[1]],
                [template.fold.from[0] - 2.2, template.fold.from[1]],
                [template.fold.to[0] - 2.2, template.fold.to[1]],
                [template.fold.to[0] - u(2), template.fold.to[1]],
              ])}
            />
            <path d={arrow([template.fold.from[0] - u(2), template.fold.from[1]], [template.fold.from[0] - 2.2, template.fold.from[1]])} />
            <path d={arrow([template.fold.to[0] - u(2), template.fold.to[1]], [template.fold.to[0] - 2.2, template.fold.to[1]])} />
          </g>
        ) : null}

        <g data-pattern-mark="" style={{ stroke: ink, strokeWidth: u(1.2), fill: "none" }}>
          <path d={polyPath([[vb.x + vb.w - 1.5 - 5, vb.y + vb.h - 1.4], [vb.x + vb.w - 1.5, vb.y + vb.h - 1.4]])} />
          <path d={polyPath([[vb.x + vb.w - 6.5, vb.y + vb.h - 1.4 - u(4)], [vb.x + vb.w - 6.5, vb.y + vb.h - 1.4 + u(4)]])} />
          <path d={polyPath([[vb.x + vb.w - 1.5, vb.y + vb.h - 1.4 - u(4)], [vb.x + vb.w - 1.5, vb.y + vb.h - 1.4 + u(4)]])} />
        </g>
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {template.fold ? (
          <span
            data-pattern-mark=""
            className={`absolute whitespace-nowrap ${SMALL} font-medium`}
            style={{
              ...at([template.fold.from[0] - 2.2, (template.fold.from[1] + template.fold.to[1]) / 2]),
              // Centred on the bracket, turned to read upward, then moved off it to the left by half its own height.
              transform: "translate(-50%, -50%) rotate(-90deg) translateY(calc(-50% - 0.45rem))",
            }}
          >
            {`${template.fold.side === "CF" ? text.front : text.back}, ${text.fold}`}
          </span>
        ) : null}
        <span
          data-pattern-mark=""
          className={`absolute whitespace-nowrap ${SMALL} text-ink-muted`}
          style={{
            ...at(grainMid),
            transform: upright
              ? "translate(-50%, -50%) rotate(-90deg) translateY(calc(50% + 0.4rem))"
              : "translate(-50%, calc(-100% - 0.3rem))",
          }}
        >
          {text.grain}
        </span>
        <span
          data-pattern-mark=""
          className={`absolute whitespace-nowrap ${SMALL} text-ink-muted subject-figures`}
          style={{ ...at([vb.x + vb.w - 4, vb.y + vb.h - 1.4]), transform: "translate(-50%, calc(-100% - 0.35rem))" }}
        >
          5 cm
        </span>
      </div>

      <div
        data-pattern-label=""
        className="absolute"
        style={{ ...at(template.label.at), width: `${(template.label.width / vb.w) * 100}%` }}
      >
        <p className="m-0 font-display text-[clamp(1rem,3.6cqi,1.625rem)] leading-[1.1] tracking-[-0.01em]">{block.style}</p>
        <p className={`m-0 mt-1.5 ${SMALL} font-medium`}>
          {block.number ? <span className="subject-figures">{`${block.number}  `}</span> : null}
          {block.piece}
        </p>
        {block.size ? <p className={`m-0 ${SMALL} subject-figures`}>{block.size}</p> : null}
        <p className={`m-0 ${SMALL}`}>{block.cut}</p>
        <p className={`m-0 ${SMALL} text-ink-muted`}>{block.seam}</p>
      </div>
    </div>
  );
}
