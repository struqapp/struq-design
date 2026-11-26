"use client";
// app/scenes/Entrances.tsx: the centerpiece, "Open when the building isn't." One ordinary day on an institution's
// site, as four example pages (./SitePage) arriving at their hours: 07:40 a museum's exhibition, 13:10 a theatre's
// season, 20:00 a brand's launch, 23:55 an archive's collection. A fork of the project-stack showpiece: one stage
// pins for about three screens and holds still while the day runs through it. The day's rule scrubs (its filled
// stretch and its lit window run from hour to hour), the page swaps in place as the next one rises over it like a
// window shade, the hour and its sentence change through their masks, and the ground darkens smoothly from morning
// paper to midnight. The intro says plainly that the pages are examples, not client work.
// Phones and reduced motion: the hours one under the other, each on its own step of the day's light, the page above
// its sentence so every hour opens on the page.
import { useRef, type CSSProperties } from "react";
import { feel } from "@/components/struq/kit/feel";
import { gsap, useGSAP } from "@/components/struq/kit/gsap";
import { Reveal } from "@/components/struq/kit/Reveal";
import { SplitHeadline } from "@/components/struq/kit/SplitHeadline";
import { site, type SamplePage } from "@/lib/site";
import { SitePage } from "./SitePage";

const DAY = "var(--on-inverse)";
const NIGHT = "var(--inverse)";
/** Morning to midnight: each hour's share of night in the ground, and whether its ink is the night or the day. */
const LIGHT = [0, 0.14, 0.84, 1];

const frac = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h * 60 + m) / 1440;
};
const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");

/** Any CSS colour as sRGB, through a one-pixel canvas (oklch included), so GSAP can tween between them. */
function rgbOf(css: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = css;
  document.querySelector("[data-blocks]")?.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0, 0, 0];
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}
const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

/** The day as a rule: the hours under it, the stretch up to the hour filled, the hour itself a lit window. */
function DayRule({ time, live }: { time: string; live?: boolean }) {
  const at = frac(time);
  return (
    <div aria-hidden data-day-rule={live ? "" : undefined} className="relative h-12 w-full">
      <div className="absolute inset-x-0 top-4 h-px bg-current opacity-35" />
      <div data-day-fill={live ? "" : undefined} className="absolute left-0 top-[15px] h-[3px] w-full origin-left bg-current" style={{ transform: `scaleX(${at})` }} />
      {Array.from({ length: 25 }, (_, h) => (
        <span key={h} className={`absolute top-4 w-px bg-current opacity-35 ${h % 6 === 0 ? "h-3" : "h-1.5"}`} style={{ left: `${(h / 24) * 100}%` }} />
      ))}
      {[0, 6, 12, 18, 24].map((h) => (
        <span
          key={h}
          className={`text-small absolute top-7 tabular-nums ${h === 0 ? "" : h === 24 ? "-translate-x-full" : "-translate-x-1/2"}`}
          style={{ left: `${(h / 24) * 100}%` }}
        >
          {String(h % 24).padStart(2, "0")}:00
        </span>
      ))}
      <span
        data-day-mark={live ? "" : undefined}
        className="absolute top-[9px] block h-[14px] w-[20px] -translate-x-1/2 border border-current bg-accent-2"
        style={{ left: `${at * 100}%` }}
      />
    </div>
  );
}

function Hour({ p }: { p: SamplePage }) {
  return (
    <>
      <p className="font-display text-h2 tabular-nums">{p.time}</p>
      <p className="text-body max-w-[34ch]">{p.moment}</p>
      <p className="text-small">
        {p.kind}: example of {article(p.site)} {p.site.toLowerCase()} website
      </p>
    </>
  );
}

function Page({ p, className = "" }: { p: SamplePage; className?: string }) {
  return <SitePage site={p.site} nav={p.nav} path={p.path} title={p.title} sub={p.sub} tone={p.tone} layout={p.layout} className={className} />;
}

export function Entrances() {
  const stage = useRef<HTMLDivElement>(null);
  const e = site.entrances;
  const pages = e.pages;
  const last = frac(pages[pages.length - 1].time);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const day = rgbOf(DAY);
        const night = rgbOf(NIGHT);
        const ground = (i: number) => mix(day, night, LIGHT[i]);
        const ink = (i: number) => (LIGHT[i] > 0.5 ? mix(day, day, 0) : mix(night, night, 0));
        const shown = gsap.utils.toArray<HTMLElement>("[data-day-page]", el);
        const hours = gsap.utils.toArray<HTMLElement>("[data-day-hour]", el);
        const fill = el.querySelector("[data-day-fill]");
        const intro = el.querySelector("[data-day-intro]");
        const rule = el.querySelector("[data-day-rule]");
        const flips = (i: number) => LIGHT[i] > 0.5 !== LIGHT[i - 1] > 0.5;
        const mark = el.querySelector<HTMLElement>("[data-day-mark]");
        gsap.set(el, { backgroundColor: ground(0), color: ink(0) });
        gsap.set(shown.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(hours.slice(1), { autoAlpha: 0, y: 28 });
        gsap.set(fill, { scaleX: frac(pages[0].time) });
        gsap.set(mark, { left: `${frac(pages[0].time) * 100}%` });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${(pages.length - 1) * 110}%`,
            pin: true,
            scrub: feel(el).scrub.pinned,
            onUpdate: (self) => {
              // The bar reads the ground under it: night once the evening has come in.
              el.dataset.barTone = self.progress > 0.5 ? "inverse" : "ground";
            },
          },
        });
        for (let i = 1; i < pages.length; i += 1) {
          const at = frac(pages[i].time);
          tl.to({}, { duration: 0.3 })
            .addLabel(`h${i}`)
            // The day runs on: the rule fills to the next hour and its lit window travels there.
            .to(fill, { scaleX: at, duration: 1, ease: "power1.inOut" }, `h${i}`)
            .to(mark, { left: `${at * 100}%`, duration: 1, ease: "power1.inOut" }, `h${i}`)
            // The ground darkens toward the hour's light. Where it crosses from day to night the ink turns at once at
            // the midpoint, on a steep curve, and the rule dips out across it, so no line ever sits on the grey.
            .to(el, { backgroundColor: ground(i), duration: 1, ease: flips(i) ? "power4.inOut" : "none" }, `h${i}`)
            // The next page rises over the last like a window shade; the hour and its sentence change through masks.
            .to(shown[i], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power2.inOut" }, `h${i}+=0.1`)
            .to(hours[i - 1], { autoAlpha: 0, y: -24, duration: 0.35, ease: "power2.in" }, `h${i}`)
            .to(hours[i], { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" }, `h${i}+=0.45`);
          // The heading and its intro say it once, at the first hour, and leave as the day runs on.
          if (i === 1) tl.to(intro, { autoAlpha: 0, y: -16, duration: 0.35, ease: "power2.in" }, "h1");
          if (flips(i)) {
            tl.to(rule, { autoAlpha: 0, duration: 0.25 }, `h${i}+=0.15`)
              .set(el, { color: ink(i) }, `h${i}+=0.5`)
              .to(rule, { autoAlpha: 1, duration: 0.25 }, `h${i}+=0.62`);
          } else {
            tl.set(el, { color: ink(i) }, `h${i}`);
          }
        }
        tl.to({}, { duration: 0.3 });
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  return (
    <section id="entrances" data-bar-tone="ground" className="relative bg-surface-0">
      {/* The intro, where the day runs one hour under the other (phones, reduced motion). On a wide screen with motion
          the heading stands in the stage itself, over the first hour, so the day starts on the first screen. */}
      <div className="grid grid-cols-12 gap-x-sheet-gutter gap-y-6 px-sheet-margin pt-28 pb-16 md:pt-40 md:pb-24 motion-safe:md:hidden">
        <SplitHeadline as="h2" on="scroll" className="col-span-12 font-display text-h2 text-ink md:col-span-7">
          {e.heading}
        </SplitHeadline>
        <Reveal className="col-span-12 md:col-span-4 md:col-start-9 md:self-end">
          <p className="text-body max-w-[42ch] text-ink-muted">{e.text}</p>
        </Reveal>
      </div>

      {/* Wide screens with motion: one stage, the day running through it. */}
      <div
        ref={stage}
        data-showpiece="project-stack"
        data-bar-tone="ground"
        className="hidden h-svh flex-col gap-6 px-sheet-margin pt-[11vh] pb-[5vh] motion-safe:md:flex"
        style={{ background: DAY, color: NIGHT }}
      >
        <DayRule time={pages[0].time} live />
        <div className="grid min-h-0 flex-1 grid-cols-12 items-center gap-x-sheet-gutter">
          <div className="col-span-3 flex flex-col gap-10">
            <div data-day-intro="" className="flex flex-col gap-4">
              <h2 className="font-display text-h3 leading-[1.05]">{e.heading}</h2>
              <p className="text-small max-w-[40ch] opacity-80">{e.text}</p>
            </div>
            <div className="grid">
            {pages.map((p) => (
              <div key={p.time} data-day-hour="" className="flex flex-col gap-4 [grid-area:1/1]">
                <Hour p={p} />
              </div>
            ))}
            </div>
          </div>
          <div className="col-span-9 grid">
            {pages.map((p, i) => (
              <div key={p.time} data-day-page="" className="mx-auto w-full max-w-[min(100%,calc(66vh*1.6))] [grid-area:1/1]" style={{ zIndex: i + 1 }}>
                <Page p={p} className="aspect-[16/10] w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phones and reduced motion: the hours one under the other, the light dimming down the page. */}
      <ol className="m-0 list-none p-0 motion-safe:md:hidden">
        {pages.map((p, i) => {
          const dark = LIGHT[i] > 0.5;
          const style = {
            background: `color-mix(in oklab, ${DAY}, ${NIGHT} ${Math.round(LIGHT[i] * 100)}%)`,
            color: dark ? DAY : NIGHT,
          } as CSSProperties;
          return (
            <li key={p.time} data-bar-tone={dark ? "inverse" : "ground"} className="flex flex-col gap-6 px-sheet-margin py-14" style={style}>
              <DayRule time={p.time} />
              <Page p={p} className="aspect-[4/5] w-full md:aspect-[16/10]" />
              <div className="flex flex-col gap-3">
                <Hour p={p} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
