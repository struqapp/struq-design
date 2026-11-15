"use client";
// components/struq/kit/subject/SectionDrawing.tsx (Struq recipe)
// A technical section drawing for trades and makers, drawn to the conventions a draughtsman would sign: every cut
// face hatched in its material's standard pattern (steel ANSI32, brass and copper ANSI33, brick ANSI31, ceramic
// crossed, timber end grain crossed, finished wood in grain, concrete stippled with aggregate, plaster dotted, mineral
// wool as the batt coil, thin sections solid), touching parts hatched at different angles, outlines heavy and
// everything else thin, the centre line in dash and dot, dimension lines with arrowheads and values, numbered
// callouts on leaders, and a title block with the names, the title and the caller's fields. Line weights and hatch
// spacing stay the same on a phone and a wide screen.
//
// <SectionDrawing template="compression-fitting" title="Knelkoppeling 15 mm" locale="nl-NL"
//   names={{ pipe: "Koperen buis 15 mm", olive: "Knelring", nut: "Wartel", body: "Koppelstuk" }}
//   fields={[{ label: "Schaal", value: "2:1" }, { label: "Tekening", value: "KR-015" }]} />
//
// Props
// - template: "compression-fitting", "mug", "bowl", "door-jamb" or "wall" (drawings.ts), or
// - drawing: your own Drawing ({ view, parts, lines?, dims?, callouts?, names?, title?, unit? }; parts are SVG paths
//   in drawing units, y down, each with a material). One of the two.
// - names: the callouts' names by key, in the client's words (the template's English ones otherwise).
// - title: the title block's title (the template's otherwise). subtitle: a line under it.
// - fields: { label, value }[] for the title block (scale, drawing number, date, maker), only what the caller has.
// - labels: { unit? }: the units line ("Dimensions in mm"), English or Dutch by locale otherwise.
// - paper: "scene" (default) the drawing in the scene's ink on its ground, so an inverse scene reads as a dark sheet;
//   "print" a printed sheet in the palette's light colour.
// - locale (default "en-GB"), caption (a line under the sheet, in the scene's ink), build ("scroll" default, or
//   "static"), className (on the figure).
//
// Mounting: inside any section, in six or more of twelve columns on a wide screen, where the title block stands
// beside the drawing; under 48rem it stands under it. The root is a <figure data-subject="section">.
//
// Motion: tied to the scroll. The outlines draw themselves as the sheet comes up through the view, the hatching
// settles into the cut faces, then the centre line, the dimensions and the numbered callouts set in. Reduced motion,
// build="static" or no scripts: the finished drawing.
import { useId, useRef, type ReactNode } from "react";
import { useScrollBuild } from "./build";
import { usePen, type Pt } from "./draw";
import { DRAWINGS, type Drawing, type DrawingDim, type DrawingName, type Material } from "./drawings";
import { FIGURES, languageOf, number as numberText } from "./format";

type Props = {
  template?: DrawingName;
  drawing?: Drawing;
  names?: Record<string, string>;
  title?: string;
  subtitle?: string;
  fields?: { label: string; value: string }[];
  labels?: { unit?: string };
  paper?: "scene" | "print";
  locale?: string;
  caption?: string;
  build?: "scroll" | "static";
  className?: string;
};

const UNIT_LINE: Record<string, string> = { en: "Dimensions in {unit}", nl: "Maten in {unit}" };
const SMALL = "text-[0.75rem] leading-[1.45]";

/** The hatch tiles, drawn in screen pixels through `u` and turned by the part's angle. */
function Hatch({ id, material, angle, u }: { id: string; material: Material; angle: number; u: (px: number) => number }) {
  const s = u(6.5);
  const line = { stroke: "var(--ink)", strokeWidth: u(0.6), fill: "none" } as const;
  const dot = { fill: "var(--ink)" } as const;
  const common = { id, patternUnits: "userSpaceOnUse" as const, patternTransform: `rotate(${angle})` };
  switch (material) {
    case "brick":
      return (
        <pattern {...common} width={s} height={s}>
          <path d={`M0 ${s / 2} H${s}`} style={line} />
        </pattern>
      );
    case "steel":
      return (
        <pattern {...common} width={s} height={s * 2.2}>
          <path d={`M0 ${s * 0.6} H${s} M0 ${s * 1.05} H${s}`} style={line} />
        </pattern>
      );
    case "brass":
    case "copper":
      return (
        <pattern {...common} width={s * 1.8} height={s * 2}>
          <path d={`M0 ${s * 0.5} H${s * 1.8}`} style={line} />
          <path d={`M0 ${s * 1.5} H${s * 1.8}`} style={{ ...line, strokeDasharray: `${s * 1.1} ${s * 0.7}` }} />
        </pattern>
      );
    case "ceramic":
      return (
        <pattern {...common} width={s * 1.6} height={s * 1.6}>
          <path d={`M0 ${s * 0.8} H${s * 1.6} M${s * 0.8} 0 V${s * 1.6}`} style={line} />
        </pattern>
      );
    case "wood":
      return (
        <pattern {...common} width={s * 8} height={s * 1.7}>
          <path d={`M0 ${s * 0.85} Q${s * 2} ${s * 0.25} ${s * 4} ${s * 0.85} T${s * 8} ${s * 0.85}`} style={line} />
        </pattern>
      );
    case "concrete":
    case "block":
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={s * 7} height={s * 7}>
          {[
            [0.8, 1.1], [3.4, 0.6], [5.6, 2.2], [1.9, 3.4], [4.6, 4.6], [0.6, 5.6], [6.3, 6.1], [3, 6.4],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x * s} cy={y * s} r={u(0.75)} style={dot} />
          ))}
          <path d={`M${2.6 * s} ${2.0 * s} l${s * 0.7} ${s * 0.15} l${-s * 0.45} ${s * 0.55} Z`} style={line} />
          <path d={`M${5.2 * s} ${5.0 * s} l${-s * 0.6} ${s * 0.45} l${s * 0.7} ${s * 0.25} Z`} style={line} />
          <path d={`M${0.9 * s} ${4.3 * s} l${s * 0.55} ${-s * 0.4} l${s * 0.1} ${s * 0.6} Z`} style={line} />
          {material === "block" ? <path d={`M0 ${s * 7} L${s * 7} 0`} style={line} /> : null}
        </pattern>
      );
    case "plaster":
      return (
        <pattern id={id} patternUnits="userSpaceOnUse" width={s * 1.4} height={s * 1.4}>
          <circle cx={s * 0.35} cy={s * 0.35} r={u(0.6)} style={dot} />
          <circle cx={s * 1.05} cy={s * 1.05} r={u(0.6)} style={dot} />
        </pattern>
      );
    case "insulation":
      return (
        <pattern {...common} width={s * 3} height={s * 3}>
          <path d={`M0 0 L${s * 1.5} ${s * 3} L${s * 3} 0`} style={line} />
        </pattern>
      );
    default:
      return null;
  }
}

/** A filled arrowhead with its tip at `tip`, pointing along `dir` (a unit vector). */
function head(tip: Pt, dir: Pt, u: (px: number) => number) {
  const l = u(8);
  const w = u(2.6);
  const [dx, dy] = dir;
  return `M${tip[0]} ${tip[1]} L${tip[0] - dx * l - dy * w} ${tip[1] - dy * l + dx * w} L${tip[0] - dx * l + dy * w} ${tip[1] - dy * l - dx * w} Z`;
}

export function SectionDrawing({
  template,
  drawing: own,
  names,
  title,
  subtitle,
  fields = [],
  labels,
  paper = "scene",
  locale = "en-GB",
  caption,
  build = "scroll",
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const drawing: Drawing = own ?? DRAWINGS[template ?? "compression-fitting"]();
  const [vx, vy, vw, vh] = drawing.view;
  const px = usePen(svg, vw, 640);
  const u = (pixels: number) => pixels / px;
  const at = (p: Pt) => ({ left: `${((p[0] - vx) / vw) * 100}%`, top: `${((p[1] - vy) / vh) * 100}%` });
  const nameOf = (key: string) => names?.[key] ?? drawing.names?.[key] ?? key;
  const unit = drawing.unit ?? "mm";
  const unitLine = (labels?.unit ?? UNIT_LINE[languageOf(locale)] ?? UNIT_LINE.en).replace("{unit}", unit);

  useScrollBuild(
    root,
    build === "scroll",
    (el, tl) => {
      tl.fromTo(el.querySelectorAll("[data-section-edge]"), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, stagger: 0.04 });
      tl.from(el.querySelectorAll("[data-section-face]"), { autoAlpha: 0, duration: 0.7, stagger: 0.03 }, "-=0.6");
      tl.from(el.querySelectorAll("[data-section-thin]"), { autoAlpha: 0, duration: 0.5 }, "-=0.3");
      tl.from(el.querySelectorAll("[data-section-note]"), { autoAlpha: 0, duration: 0.4, stagger: 0.05 }, "-=0.2");
    },
    [template, own],
    { start: "top 80%", end: "bottom 80%" },
  );

  const hatchId = (i: number) => `${raw}-h${i}`;
  const weights = { edge: u(1.7), thin: u(0.7), center: u(0.7) };

  // The dimensions: line, extension lines, arrowheads, and where the value stands.
  const dims = (drawing.dims ?? []).map((dim: DrawingDim, i) => {
    const horizontal = dim.axis === "x";
    const a: Pt = horizontal ? [dim.a[0], dim.at] : [dim.at, dim.a[1]];
    const b: Pt = horizontal ? [dim.b[0], dim.at] : [dim.at, dim.b[1]];
    const value = Math.abs(horizontal ? dim.b[0] - dim.a[0] : dim.b[1] - dim.a[1]);
    const text = dim.text ?? `${dim.prefix ?? ""}${numberText(value, locale, 1)}`;
    const ext = (from: Pt, to: Pt) => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const len = Math.hypot(dx, dy);
      if (len < u(4)) return "";
      const ux = dx / len;
      const uy = dy / len;
      return `M${from[0] + ux * u(3)} ${from[1] + uy * u(3)} L${to[0] + ux * u(5)} ${to[1] + uy * u(5)}`;
    };
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dir: Pt = [(b[0] - a[0]) / (span || 1), (b[1] - a[1]) / (span || 1)];
    // A value wider than its span stands beyond the end, outside the arrowheads.
    const roomy = span * px > text.length * 7 + 18;
    const mid: Pt = roomy ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : [b[0] + dir[0] * u(6 + text.length * 3.6), b[1] + dir[1] * u(6 + text.length * 3.6)];
    return { i, a, b, dir, text, horizontal, mid, paths: `${ext(dim.a, a)} ${ext(dim.b, b)} M${a[0]} ${a[1]} L${b[0]} ${b[1]}` };
  });

  const callouts = drawing.callouts ?? [];

  const legend: ReactNode = callouts.length ? (
    <ol className="m-0 grid list-none gap-y-1.5 p-0">
      {callouts.map((callout, i) => (
        <li key={callout.key} className={`grid grid-cols-[1.5rem_1fr] items-baseline ${SMALL}`}>
          <span className={`${FIGURES} font-medium`}>{i + 1}</span>
          <span>{nameOf(callout.key)}</span>
        </li>
      ))}
    </ol>
  ) : null;

  return (
    <figure ref={root} data-subject="section" className={`@container m-0 ${className}`}>
      <div data-paper={paper} className={`${paper === "print" ? "subject-paper" : ""} grid border border-[color:var(--ink)] text-ink @3xl:grid-cols-[minmax(0,1fr)_16rem]`}>
        <div className="relative min-w-0 p-[3cqi] @3xl:p-[2.5cqi]">
          <svg ref={svg} viewBox={`${vx} ${vy} ${vw} ${vh}`} className="block h-auto w-full overflow-visible" role="img" aria-label={title ?? drawing.title ?? ""}>
            <defs>
              {drawing.parts.map((part, i) => (
                <Hatch key={i} id={hatchId(i)} material={part.material} angle={part.angle ?? 45} u={u} />
              ))}
            </defs>
            {drawing.parts.map((part, i) => (
              <g key={i}>
                {part.material !== "void" ? (
                  <path
                    data-section-face=""
                    d={part.d}
                    style={{ fill: part.material === "solid" ? "var(--ink)" : part.material === "timber" ? "none" : `url(#${hatchId(i)})`, stroke: "none" }}
                  />
                ) : null}
                {part.material === "timber" && part.box ? (
                  <path
                    data-section-face=""
                    d={`M${part.box[0]} ${part.box[1]} L${part.box[0] + part.box[2]} ${part.box[1] + part.box[3]} M${part.box[0] + part.box[2]} ${part.box[1]} L${part.box[0]} ${part.box[1] + part.box[3]}`}
                    style={{ stroke: "var(--ink)", strokeWidth: weights.thin, fill: "none" }}
                  />
                ) : null}
              </g>
            ))}
            {drawing.parts.map((part, i) =>
              part.stroke === "" ? null : (
                <path
                  key={`e${i}`}
                  data-section-edge=""
                  pathLength={1}
                  d={part.stroke ?? part.d}
                  style={{ fill: "none", stroke: "var(--ink)", strokeWidth: weights.edge, strokeLinejoin: "round", strokeLinecap: "round" }}
                />
              ),
            )}
            {(drawing.lines ?? []).map((line, i) =>
              line.kind === "visible" ? (
                <path
                  key={`l${i}`}
                  data-section-edge=""
                  pathLength={1}
                  d={line.d}
                  style={{ fill: "none", stroke: "var(--ink)", strokeWidth: weights.edge, strokeLinejoin: "round", strokeLinecap: "round" }}
                />
              ) : (
                <path
                  key={`l${i}`}
                  data-section-thin=""
                  d={line.d}
                  style={{
                    fill: "none",
                    stroke: "var(--ink)",
                    strokeWidth: line.kind === "center" ? weights.center : weights.thin,
                    strokeDasharray: line.kind === "center" ? `${u(16)} ${u(3.5)} ${u(2)} ${u(3.5)}` : line.kind === "hidden" ? `${u(5)} ${u(3)}` : undefined,
                    strokeLinejoin: "round",
                  }}
                />
              ),
            )}
            {dims.map((dim) => (
              <g key={`d${dim.i}`} data-section-note="">
                <path d={dim.paths} style={{ fill: "none", stroke: "var(--ink)", strokeWidth: weights.thin }} />
                <path d={`${head(dim.a, [-dim.dir[0], -dim.dir[1]], u)} ${head(dim.b, dim.dir, u)}`} style={{ fill: "var(--ink)" }} />
              </g>
            ))}
            {callouts.map((callout) => (
              <g key={callout.key} data-section-note="">
                <path d={`M${callout.at[0]} ${callout.at[1]} L${callout.to[0]} ${callout.to[1]}`} style={{ stroke: "var(--ink)", strokeWidth: weights.thin }} />
                <circle cx={callout.at[0]} cy={callout.at[1]} r={u(2.4)} style={{ fill: "var(--ink)" }} />
              </g>
            ))}
          </svg>

          <div className="pointer-events-none absolute inset-[3cqi] @3xl:inset-[2.5cqi]">
            {dims.map((dim) => (
              <span
                key={`t${dim.i}`}
                data-section-note=""
                className={`absolute ${SMALL} ${FIGURES}`}
                style={{
                  ...at(dim.mid),
                  transform: dim.horizontal
                    ? "translate(-50%, calc(-100% - 0.15rem))"
                    : "translate(-50%, -50%) rotate(-90deg) translateY(calc(-50% - 0.2rem))",
                }}
              >
                {dim.text}
              </span>
            ))}
            {callouts.map((callout, i) => (
              <span
                key={callout.key}
                data-section-note=""
                className={`absolute grid size-[1.25rem] -translate-x-1/2 @3xl:size-[1.5rem] -translate-y-1/2 place-items-center rounded-full border border-[color:var(--ink)] bg-surface-0 ${SMALL} font-medium ${FIGURES}`}
                style={at(callout.to)}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        <div className="grid content-end gap-5 border-t border-[color:var(--ink)] p-5 @3xl:border-l @3xl:border-t-0">
          {legend}
          <div className="grid gap-3 border-t border-[color:var(--ink)] pt-4">
            <div>
              <p className="m-0 font-display text-[1.25rem] leading-[1.15] tracking-[-0.01em]">{title ?? drawing.title}</p>
              {subtitle ? <p className={`m-0 mt-1 ${SMALL} text-ink-muted`}>{subtitle}</p> : null}
            </div>
            <div className="border-t border-line pt-3">
              {fields.length ? (
                <dl className="m-0 mb-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {fields.map((field) => (
                    <div key={field.label}>
                      <dt className={`${SMALL} text-ink-muted`}>{field.label}</dt>
                      <dd className={`m-0 ${SMALL} ${FIGURES}`}>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className={`m-0 ${SMALL} text-ink-muted`}>{unitLine}</p>
            </div>
          </div>
        </div>
      </div>
      {caption ? <figcaption className="mt-4 font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}
