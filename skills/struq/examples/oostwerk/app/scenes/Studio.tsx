"use client";
// app/scenes/Studio.tsx: "Small, on purpose". The line at the heading step beside a drawn piece that says the same
// thing: one narrow canal house in elevation, the street's own house, drawn line by line as the scene passes (plinth
// first, the gable last) and then built: the brick takes its ground, the glass its ink, the door its colour, and one
// window under the gable lights. The people who draw it are the people who build it. Scrubbed, so it is the reader's
// hand that draws. No photo: nothing here stands in for Oostwerk's own room or people.
// Reduced motion and no scripts: the house drawn and built.
import { useRef } from "react";
import { gsap, useGSAP } from "@/components/struq/kit/gsap";
import { Reveal } from "@/components/struq/kit/Reveal";
import { SplitHeadline } from "@/components/struq/kit/SplitHeadline";
import { site } from "@/lib/site";

// The house on a grid of one floor = 110 units: plinth 33, raised ground floor 143, four floors, a neck gable of 138.
const FH = 110;
const X = 30;
const WIDTH = 226;
const FOOT = 760;
const PLINTH = FOOT - 33;
const GROUND = PLINTH - 143;
const BODY = GROUND - 4 * FH;
const BAY = WIDTH / 3;
const WW = BAY * 0.5;

type Part = { d: string; y: number; fill?: "brick" | "glass" | "door" | "lit" | "stone" };

function rect(x: number, y: number, w: number, h: number) {
  return `M${x} ${y}h${w}v${h}h${-w}Z`;
}

/** Every line of the elevation, with the height it stands at (the drawing runs from the street up). */
function parts(): Part[] {
  const out: Part[] = [];
  const cx = X + WIDTH / 2;
  const g = 138;
  // The body and its neck gable, as one outline, filled with brick once built.
  out.push({
    // Drawn first and painted under everything (the sort runs from the street up; the brick stands lowest).
    y: FOOT + 1,
    fill: "brick",
    d: `M${X} ${FOOT}V${BODY}H${X + WIDTH * 0.12}Q${X + WIDTH * 0.26} ${BODY - g * 0.12} ${X + WIDTH * 0.26} ${BODY - g * 0.42}H${X + WIDTH * 0.29}V${BODY - g * 0.92}Q${cx} ${BODY - g * 1.12} ${X + WIDTH * 0.71} ${BODY - g * 0.92}V${BODY - g * 0.42}H${X + WIDTH * 0.74}Q${X + WIDTH * 0.74} ${BODY - g * 0.12} ${X + WIDTH * 0.88} ${BODY}H${X + WIDTH}V${FOOT}Z`,
  });
  out.push({ y: FOOT, d: `M0 ${FOOT}H286` });
  out.push({ y: PLINTH, fill: "stone", d: rect(X, PLINTH, WIDTH, FOOT - PLINTH) });
  out.push({ y: BODY, d: `M${X} ${BODY}H${X + WIDTH}` });
  // The hoist beam and the attic window under the gable's top.
  out.push({ y: BODY - g * 0.95, d: `M${cx} ${BODY - g * 0.86}v30h16` });
  out.push({ y: BODY - g * 0.4, fill: "lit", d: rect(cx - 17, BODY - g * 0.5, 34, 44) });
  // Four floors of tall sashes, six panes each.
  for (let f = 0; f < 4; f += 1) {
    const y = GROUND - (f + 1) * FH + FH * 0.2;
    const h = FH * 0.62 * (f === 3 ? 0.88 : 1);
    for (let b = 0; b < 3; b += 1) {
      const x = X + b * BAY + (BAY - WW) / 2;
      out.push({ y, fill: "glass", d: rect(x, y, WW, h) });
      out.push({ y, d: `M${x + WW / 2} ${y}v${h}M${x} ${y + h / 3}h${WW}M${x} ${y + (2 * h) / 3}h${WW}M${x - 3} ${y - 7}h${WW + 6}` });
    }
  }
  // The raised ground floor: two tall windows and the door between them, its fanlight, the stoop.
  for (const b of [0, 2]) {
    const x = X + b * BAY + (BAY - WW) / 2;
    const y = GROUND + FH * 0.18;
    out.push({ y, fill: "glass", d: rect(x, y, WW, FH * 0.96) });
    out.push({ y, d: `M${x + WW / 2} ${y}v${FH * 0.96}M${x} ${y + FH * 0.24}h${WW}M${x} ${y + FH * 0.6}h${WW}` });
    out.push({ y: PLINTH, fill: "glass", d: rect(x + WW * 0.1, PLINTH + 8, WW * 0.8, 16) });
  }
  const dw = BAY * 0.56;
  const dx = cx - dw / 2;
  out.push({ y: PLINTH - FH * 1.06, fill: "door", d: rect(dx, PLINTH - FH * 1.06, dw, FH * 1.06) });
  out.push({ y: PLINTH - FH * 1.3, fill: "glass", d: rect(dx, PLINTH - FH * 1.3, dw, FH * 0.18) });
  out.push({ y: PLINTH - FH * 1.3, d: `M${dx + dw / 4} ${PLINTH - FH * 1.3}v${FH * 0.18}M${dx + dw / 2} ${PLINTH - FH * 1.3}v${FH * 0.18}M${dx + (3 * dw) / 4} ${PLINTH - FH * 1.3}v${FH * 0.18}` });
  for (let k = 0; k < 3; k += 1) {
    const w = dw * (1.15 + k * 0.22);
    out.push({ y: PLINTH + k * 11, fill: "stone", d: rect(cx - w / 2, PLINTH + k * 11, w, 11) });
  }
  // The draughtsman's measure beside it: the height, ticked at every floor.
  const mx = X + WIDTH + 22;
  out.push({ y: FOOT, d: `M${mx} ${FOOT}V${BODY - g}${[FOOT, PLINTH, GROUND, ...[1, 2, 3, 4].map((f) => GROUND - f * FH), BODY - g].map((y) => `M${mx - 5} ${y}h10`).join("")}` });
  return out.sort((a, b) => b.y - a.y);
}

const FILL: Record<NonNullable<Part["fill"]>, string> = {
  brick: "var(--surface-2)",
  stone: "var(--surface-3)",
  glass: "var(--ink)",
  door: "var(--accent)",
  lit: "var(--accent-2)",
};

export function Studio() {
  const root = useRef<HTMLElement>(null);
  const s = site.studio;
  const list = parts();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lines = gsap.utils.toArray<SVGPathElement>("[data-line]", el);
        const fills = gsap.utils.toArray<SVGPathElement>("[data-fill]", el);
        gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(fills, { fillOpacity: 0 });
        gsap
          .timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: el.querySelector("[data-house]"), start: "top 85%", end: "bottom 45%", scrub: 0.6 } })
          .to(lines, { strokeDashoffset: 0, duration: 0.5, stagger: 0.6 / lines.length }, 0)
          .to(fills.filter((f) => f.dataset.fill !== "lit"), { fillOpacity: 1, duration: 0.25, stagger: 0.12 / fills.length, ease: "power1.inOut" }, 0.72)
          .to(fills.filter((f) => f.dataset.fill === "lit"), { fillOpacity: 1, duration: 0.08 }, 1.02);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="studio" data-scene="studio" data-bar-tone="ground" className="relative overflow-hidden bg-surface-1 py-16 md:py-4">
      <div className="grid grid-cols-12 items-center gap-x-sheet-gutter gap-y-12 px-sheet-margin">
        <figure className="col-span-12 m-0 flex justify-center md:order-last md:col-span-5 md:col-start-8">
          <svg
            data-house=""
            viewBox="0 40 300 730"
            role="img"
            aria-label={s.drawing}
            className="h-[62svh] w-auto text-ink md:h-[100svh]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          >
            {list.map((p, i) =>
              p.fill ? (
                <g key={i}>
                  <path data-fill={p.fill} d={p.d} fill={FILL[p.fill]} stroke="none" />
                  <path data-line="" d={p.d} pathLength={1} vectorEffect="non-scaling-stroke" />
                </g>
              ) : (
                <path key={i} data-line="" d={p.d} pathLength={1} vectorEffect="non-scaling-stroke" />
              ),
            )}
          </svg>
        </figure>
        <div className="col-span-12 flex flex-col gap-6 md:col-span-6">
          <SplitHeadline as="h2" on="scroll" className="font-display text-h2 text-ink">
            {s.line}
          </SplitHeadline>
          <Reveal>
            <p className="text-body max-w-[36ch] text-ink-muted">{s.label}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
