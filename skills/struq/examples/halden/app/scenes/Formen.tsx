"use client";
// app/scenes/Formen.tsx: the pendant drawn in half section, held on the screen while one breath fills it. The
// outline draws itself with the scroll, then the body fills with clear glass and the cut wall sets solid. One
// caption, no numbers, no title block. Its own ground covers the world. Scrubbed, so it runs back on the way up;
// reduced motion shows the finished drawing.
import { useRef } from "react";
import { prefersReduced } from "@/components/struq/kit/feel";
import { PROFILES } from "@/components/struq/kit/gl";
import { ScrollTrigger, useGSAP } from "@/components/struq/kit/gsap";
import { RevealText } from "@/components/struq/kit/motion";
import { site } from "@/lib/site";

type P = [number, number];

/** The globe's outer wall resampled to n points, and the inner wall offset inward by `wall` along the normal. */
function wallPoints(profile: ReadonlyArray<readonly [number, number]>, wall: number, n: number) {
  const dense: P[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [p0, p1, p2, p3] = [profile[Math.max(0, i - 1)], profile[i], profile[i + 1], profile[Math.min(profile.length - 1, i + 2)]];
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t * t + (-a + 3 * b - 3 * cc + d) * t * t * t);
      dense.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push([...profile[profile.length - 1]] as P);
  const len = [0];
  for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const outer: P[] = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const target = (i / n) * len[len.length - 1];
    while (j < len.length - 2 && len[j + 1] < target) j++;
    const k = (target - len[j]) / (len[j + 1] - len[j] || 1);
    outer.push([Math.max(0, dense[j][0] + (dense[j + 1][0] - dense[j][0]) * k), dense[j][1] + (dense[j + 1][1] - dense[j][1]) * k]);
  }
  const inner = outer.map((pt, i) => {
    const [a, b] = [outer[Math.max(0, i - 1)], outer[Math.min(outer.length - 1, i + 1)]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [Math.max(0, pt[0] - ((b[1] - a[1]) / l) * wall), pt[1] + ((b[0] - a[0]) / l) * wall] as P;
  });
  return { outer, inner };
}

const S = 80;
const { outer, inner } = wallPoints(PROFILES["pendant-globe"], 0.05, 160);
const f = (n: number) => Math.round(n * 100) / 100;
const scale = (list: P[]) => list.map(([r, y]) => [r * S, -y * S] as P);
const path = (list: P[]) => list.map((p, i) => `${i ? "L" : "M"}${f(p[0])} ${f(p[1])}`).join(" ");
const mirror = (list: P[]) => list.map(([x, y]) => [-x, y] as P);
const O = scale(outer);
const I = scale(inner);
const OUTLINE = path([...mirror(O).reverse(), ...O]);
const CUT = path([...mirror(O), ...mirror(I).reverse()]) + " Z";
const BODY = path([...mirror(I).reverse(), ...I]) + " Z";

export function Formen() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const cut = useRef<SVGPathElement>(null);
  const body = useRef<SVGPathElement>(null);

  useGSAP(() => {
    const l = line.current;
    if (!root.current || !l) return;
    const length = l.getTotalLength();
    l.style.strokeDasharray = `${length}`;
    const paint = (t: number) => {
      const fill = Math.min(1, Math.max(0, (t - 0.55) / 0.3));
      l.style.strokeDashoffset = `${Math.round(length * (1 - Math.min(1, t / 0.55)))}`;
      cut.current?.setAttribute("fill-opacity", `${fill}`);
      body.current?.setAttribute("fill-opacity", `${0.14 * fill}`);
    };
    if (prefersReduced()) return paint(1);
    paint(0);
    ScrollTrigger.create({ trigger: root.current, start: "top 70%", end: "bottom bottom", scrub: true, onUpdate: (self) => paint(self.progress) });
  });

  return (
    <section id="formen" data-beat="formen" data-scene="formen" data-energy="2" data-bar-tone="ground" className="relative bg-surface-1">
      <div ref={root} className="relative h-[170svh]">
        <figure className="sticky top-0 flex h-svh flex-col items-center justify-center px-4 pt-16 pb-6">
          <svg viewBox="-110 -165 220 265" className="h-[80svh] max-h-[80svh] w-auto max-w-full text-ink" role="img" aria-label={site.formen.drawing}>
            <line x1="0" y1="-165" x2="0" y2="-93" stroke="currentColor" strokeWidth="0.8" />
            <path d="M-16.8 -80 L-15.5 -92.8 L15.5 -92.8 L16.8 -80 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <line x1="0" y1="-150" x2="0" y2="96" stroke="currentColor" strokeWidth="0.45" strokeDasharray="10 3 2 3" opacity="0.6" />
            <path ref={body} d={BODY} fill="currentColor" fillOpacity="0.14" />
            <path ref={cut} d={CUT} fill="currentColor" />
            <path ref={line} d={OUTLINE} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <figcaption data-caption className="text-small text-ink-muted mt-3">
            {site.formen.caption}
          </figcaption>
        </figure>
      </div>
      <div className="mx-auto grid max-w-[96rem] gap-8 px-4 pt-6 pb-28 md:grid-cols-12 md:px-[4vw] md:pb-36">
        <RevealText as="h2" className="font-display text-h2 text-ink max-w-[12ch] md:col-span-5">
          {site.formen.title}
        </RevealText>
        <div className="md:col-span-5 md:col-start-7 md:pt-3">
          {site.formen.lines.map((l, i) => (
            <p key={l} className={`text-lead text-ink-muted max-w-[30rem] ${i ? "mt-3" : ""}`}>
              {l}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
