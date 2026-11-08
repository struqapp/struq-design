"use client";
// film-strip (Struq section recipe)
// Work shown as a reel running through a projector. The stage pins on the opening frame: the
// section's display line and one line of copy on the left, the first project seated in the gate
// beside it, the next ones waiting to its right, a row of sprocket holes along both edges of the
// strip, the project's title large at the foot and a hairline progress line above it. Portrait
// frames hang high, landscape frames stand low, as on a contact sheet. As you scroll the reel
// advances one frame at a time: a short, exact move (strip, sprockets and progress line travel
// together), then a hold with the next frame seated in the gate, its photo settling out of a
// push-in as it lands. While a frame moves in, the old title leaves upward through its mask and
// the new one rises into it, so a stopped scroll always lands on one seated frame and one whole
// title. The last stop is the closing frame, the call to action; when the pin lets go the reel
// keeps running out to the left as the page moves on.
//
// The reel is one number (`pos`, the stop in the gate: 0 is the first project, n the closing
// frame). The strip's travel, every photo's push-in and drift, the sprockets, the titles in flight
// and the progress line are derived from it on every frame. The frames sit in normal flow, so the
// first paint is the opening frame exactly. The pin grows with the frames and stays under 300%.
// Lead for a studio, a photographer, an architect: any brief with a handful of projects to show.
//
// <FilmStrip intro={{ title: "Recent werk", text: "..." }} items={[{ image, title: "Casa Ostuni", meta: "Woonhuis, 2025" }]}
//   outro={{ line: "Jouw huis is de volgende.", cta: { label: "Plan een gesprek", href: "/contact" } }} />
//
// Phones: no pin. The frames sit in a native horizontal swipe with scroll snap between the two
// sprocket rows, each title under its frame. Reduced motion, and pages without scripts: the same
// plain row, no scrub.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Shape = "portrait" | "landscape";

type Item = {
  image: StruqImage;
  /** The project's name, set at the foot while its frame is in the gate. */
  title: string;
  /** Metadata under the title: client or place, discipline, year. */
  meta?: string;
  /** Portrait frames hang high, landscape frames stand low. Defaults to the photo's own ratio. */
  shape?: Shape;
};

type Props = {
  items: Item[];
  /** The section's display line (set at poster scale) and one line of copy, left of the first frame. */
  intro: { title: string; text?: string };
  /** The closing frame: one line and the call to action. */
  outro?: { line: string; cta?: { label: string; href: string } };
  className?: string;
};

/** The push-in a photo settles out of as its frame seats in the gate. */
const PUSH = 1.18;
/** How far a photo drifts inside its frame as it passes the gate, as a share of the frame's width. */
const DRIFT = 0.05;
/** Units of the timeline: one move between stops, the hold on each seated stop. */
const MOVE = 1;
const HOLD = 0.75;
/** How far the reel runs on to the left as the pin lets go, as a share of the stage's width. */
const RUN_OUT = 0.45;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** power2.inOut, for the titles' own swap inside a move. */
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const shapeOf = (item: Item): Shape =>
  item.shape ?? (["4:5", "1:1"].includes(item.image.ratio) || item.image.height > item.image.width ? "portrait" : "landscape");

// One sprocket hole, as a mask: the row takes its colour from a token.
const SPROCKET =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='20' viewBox='0 0 32 20'%3E%3Crect x='9' y='4' width='14' height='12' rx='2.5' fill='%23000'/%3E%3C/svg%3E\")";

/** The projector shows once the page runs scripts (struq.nl's pre-paint `sq-js`, a client project's `js`). */
const PROJECTOR = "hidden md:motion-safe:[:is(.js,.sq-js)_&]:block";
const STILL = "md:motion-safe:[:is(.js,.sq-js)_&]:hidden";

export function FilmStrip({ items, intro, outro, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  const n = items.length;

  useGSAP(
    () => {
      const el = stage.current;
      if (!el || n < 1) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const root = el.querySelector<HTMLElement>("[data-projector]");
        const foot = el.querySelector<HTMLElement>("[data-foot]");
        const track = el.querySelector<HTMLElement>("[data-track]");
        const fill = el.querySelector<HTMLElement>("[data-fill]");
        if (!root || !root.offsetParent || !track || !fill) return;
        const stops = Array.from(track.querySelectorAll<HTMLElement>("[data-stop]"));
        const pushes = Array.from(track.querySelectorAll<HTMLElement>("[data-push]"));
        const titles = Array.from(el.querySelectorAll<HTMLElement>("[data-title]"));
        const metas = Array.from(el.querySelectorAll<HTMLElement>("[data-meta]"));
        const sprockets = Array.from(el.querySelectorAll<HTMLElement>("[data-sprockets]"));
        const last = stops.length - 1;

        // Each stop's left edge in the track, measured from the first frame's (the gate).
        const g = { at: [] as number[], fw: [] as number[], hole: 32, W: 1 };
        const measure = () => {
          const gate = stops[0].offsetLeft;
          g.at = stops.map((s) => s.offsetLeft - gate);
          g.fw = stops.map((s) => s.offsetWidth);
          g.hole = parseFloat(getComputedStyle(el).fontSize) * 2 || 32;
          g.W = el.clientWidth;
          // The title stands under the gate, so the seated frame is right above its name.
          if (foot) {
            foot.style.left = `${gate}px`;
            // Fit: every title on one line within the column under the gate, whatever the face. Measured at the
            // natural size, then one shared size for all, so the swap never changes scale mid-reel.
            foot.style.setProperty("--fs-fit", "1");
            const room = foot.clientWidth;
            const need = Math.max(0, ...titles.map((t) => t.scrollWidth));
            if (room > 0 && need > room) foot.style.setProperty("--fs-fit", String(Math.floor((room / need) * 1000) / 1000));          }
        };

        // `pos` is the stop in the gate; `out` is the run-out after the pin, both feeding one travel.
        const s = { pos: 0, out: 0 };
        const paint = () => {
          const pos = s.pos;
          const i = clamp(Math.floor(pos), 0, Math.max(0, last - 1));
          const travel = (last > 0 ? lerp(g.at[i], g.at[i + 1], clamp(pos - i, 0, 1)) : 0) + s.out * RUN_OUT * g.W;
          track.style.transform = `translate3d(${(-travel).toFixed(2)}px, 0, 0)`;
          // Each photo settles out of its push-in as its frame seats, and drifts against the travel.
          for (let j = 0; j < pushes.length; j += 1) {
            const d = j - pos;
            const k = lerp(1, PUSH, clamp(Math.abs(d), 0, 1));
            const x = clamp(d, -1.2, 1.2) * DRIFT * (g.fw[j] || 0);
            pushes[j].style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) scale(${k.toFixed(4)})`;
          }
          const run = -(travel % g.hole);
          for (const sp of sprockets) sp.style.transform = `translate3d(${run.toFixed(2)}px, 0, 0)`;
          fill.style.transform = `scaleX(${(last > 0 ? pos / last : 1).toFixed(4)})`;
          // The titles: within each move the old one leaves up and the new one rises into the mask, over the
          // middle of the move, so both are whole whenever a stop is seated. The closing frame has none.
          const swap = (x: number) => inOut(clamp((x - 0.25) / 0.5, 0, 1));
          for (let j = 0; j < titles.length; j += 1) {
            let y: number;
            if (pos <= j - 1) y = 140;
            else if (pos < j) y = 140 * (1 - swap(pos - (j - 1)));
            else if (pos < j + 1) y = -140 * swap(pos - j);
            else y = -140;
            const t = `translate3d(0, ${y.toFixed(2)}%, 0)`;
            titles[j].style.transform = t;
            if (metas[j]) metas[j].style.transform = t;
          }
        };

        measure();
        paint();

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: paint,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: `+=${Math.min(300, 40 + 52 * last)}%`,
            pin: true,
            scrub: 1,
            onRefresh: () => {
              measure();
              paint();
            },
          },
        });
        // A hold on the opening frame, then for each stop: the move, the hold. The last hold is the longest.
        tl.to({}, { duration: 0.6 });
        for (let j = 1; j <= last; j += 1) {
          tl.to(s, { pos: j, duration: MOVE, ease: "power3.inOut" });
          tl.to({}, { duration: j === last ? 1.1 : HOLD });
        }

        // The release is a move: the reel keeps running out to the left as the page carries the stage away, the
        // frames and the sprockets together, so the holes loop on and never end on screen.
        const pin = tl.scrollTrigger!;
        gsap.fromTo(
          s,
          { out: 0 },
          {
            out: 1,
            ease: "none",
            immediateRender: false,
            onUpdate: paint,
            scrollTrigger: { start: () => pin.end, end: () => pin.end + el.offsetHeight, scrub: true },
          },
        );

        return () => {
          for (const node of [track, fill, ...pushes, ...titles, ...metas, ...sprockets]) node.style.transform = "";
          if (foot) {
            foot.style.left = "";
            foot.style.removeProperty("--fs-fit");
          }
        };
      });
      return () => mm.revert();
    },
    { scope: stage, dependencies: [n] },
  );

  const holes = (
    <div
      aria-hidden
      className="pointer-events-none absolute -left-16 -right-16 top-0 h-5 bg-line [-webkit-mask-repeat:repeat-x] [-webkit-mask-size:2em_1.25em] [mask-repeat:repeat-x] [mask-size:2em_1.25em]"
      style={{ maskImage: SPROCKET, WebkitMaskImage: SPROCKET }}
    />
  );
  const sprocketRow = (moving: boolean, where: string) => (
    <div aria-hidden className={`absolute inset-x-0 h-5 overflow-hidden ${where}`}>
      <div data-sprockets={moving ? "" : undefined} className="absolute inset-0">
        {holes}
      </div>
    </div>
  );
  const display = "font-display leading-[0.88] tracking-[-0.04em] text-ink";

  return (
    <section
      ref={stage}
      aria-label={intro.title}
      data-section="film-strip"
      className={`relative bg-surface-0 ${className}`}
      style={
        {
          // The foot: the title (its size), its metadata and the margins; the strip takes what is left.
          "--fs-t": "clamp(2.5rem, 0.9rem + 3.9vw, 6rem)",
          "--fs-foot": "calc(var(--fs-t) * 1.04 + 4.6rem)",
          "--fs-top": "max(6svh, 2.5rem)",
        } as React.CSSProperties
      }
    >
      {/* The projector (wide screens with motion, once scripts run). */}
      <div data-projector="" className={`relative h-svh overflow-hidden ${PROJECTOR}`}>
        {/* The strip: sprockets along both edges, the reel between them. */}
        <div className="absolute inset-x-0 top-[var(--fs-top)] bottom-[calc(var(--fs-foot)+2.75rem)]">
          {sprocketRow(true, "top-0")}
          <div className="absolute inset-x-0 bottom-9 top-9">
            <ul
              data-track=""
              className="m-0 flex h-full w-max list-none items-start gap-[5.5vw] p-0 pl-[5vw] pr-[20vw] will-change-transform"
            >
              {/* The intro panel: the section's display line at poster scale, and one line of copy. */}
              <li className="flex h-full w-[40vw] shrink-0 flex-col justify-between">
                <h2 className={`m-0 text-[clamp(4rem,9.5vw,11rem)] ${display}`}>{intro.title}</h2>
                {intro.text ? <p className="m-0 max-w-[34ch] text-body text-ink-muted">{intro.text}</p> : null}
              </li>
              {items.map((item) => {
                const portrait = shapeOf(item) === "portrait";
                return (
                  <li
                    key={item.title}
                    data-stop=""
                    className={`relative shrink-0 overflow-hidden bg-surface-2 ${
                      portrait ? "aspect-[4/5] h-[min(92%,38vw)] self-start" : "aspect-[3/2] h-[min(70%,28vw)] self-end"
                    }`}
                  >
                    <div
                      data-push=""
                      className="absolute -inset-x-[7%] inset-y-0 will-change-transform"
                      style={{ transform: `scale(${PUSH})` }}
                    >
                      <Image
                        src={item.image.src}
                        alt={item.image.alt}
                        fill
                        sizes="45vw"
                        unoptimized={item.image.unoptimized}
                        className="object-cover"
                      />
                    </div>
                    {/* The name the foot shows for this frame, for screen readers (the foot itself is a picture). */}
                    <p className="sr-only">
                      {item.title}
                      {item.meta ? `, ${item.meta}` : ""}
                    </p>
                  </li>
                );
              })}
              {/* The closing frame: the call to action, seated in the gate at the last stop. */}
              {outro ? (
                <li data-stop="" className="flex w-[36vw] shrink-0 flex-col gap-8 self-center">
                  <p className={`m-0 text-[clamp(2.75rem,1rem_+_4.4vw,7rem)] ${display}`}>{outro.line}</p>
                  {outro.cta ? (
                    <a
                      href={outro.cta.href}
                      className="w-fit border-b border-ink pb-1 text-lead text-ink transition-[border-color] duration-500 [transition-timing-function:var(--ease-out-expo)] hover:border-accent"
                    >
                      {outro.cta.label}
                    </a>
                  ) : null}
                </li>
              ) : null}
            </ul>
          </div>
          {sprocketRow(true, "bottom-0")}
        </div>

        {/* The progress line, the length of the reel's run. */}
        <div aria-hidden className="absolute inset-x-[5vw] bottom-[calc(var(--fs-foot)+1.25rem)] h-px bg-line">
          <span data-fill="" className="absolute inset-0 origin-left bg-ink" style={{ transform: "scaleX(0)" }} />
        </div>

        {/* The title of the frame in the gate, and its metadata, each in its own mask, standing under the gate
            (where the first frame's left edge is: 5vw, the intro's 40vw and one gap, until measured). */}
        <div data-foot="" aria-hidden className="absolute bottom-10 left-[50.5vw] right-[5vw]">
          <p className={`relative m-0 overflow-hidden pb-[0.14em] text-[length:calc(var(--fs-t)*var(--fs-fit,1))] ${display}`}>
            {items.map((item, j) => (
              <span
                key={item.title}
                data-title=""
                className={`block whitespace-nowrap will-change-transform ${j === 0 ? "relative" : "absolute inset-x-0 top-0"}`}
                style={{ transform: j === 0 ? "translate3d(0, 0%, 0)" : "translate3d(0, 140%, 0)" }}
              >
                {item.title}
              </span>
            ))}
          </p>
          <p className="relative m-0 mt-3 overflow-hidden text-small text-ink-muted">
            {items.map((item, j) => (
              <span
                key={item.title}
                data-meta=""
                className={`block whitespace-nowrap ${j === 0 ? "relative" : "absolute inset-x-0 top-0"}`}
                style={{ transform: j === 0 ? "translate3d(0, 0%, 0)" : "translate3d(0, 140%, 0)" }}
              >
                {item.meta ?? " "}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* The plain reel: phones swipe it natively, frame by frame; reduced motion and pages without scripts
          show it still. Still film: the sprocket rows run above and below it. */}
      <div className={`py-14 md:py-[10svh] ${STILL}`}>
        <div className="px-6 md:px-[5vw]">
          <h2 className={`m-0 text-[clamp(3.5rem,15vw,11rem)] md:text-[clamp(4rem,9.5vw,11rem)] ${display}`}>{intro.title}</h2>
          {intro.text ? <p className="m-0 mt-6 max-w-[34ch] text-body text-ink-muted">{intro.text}</p> : null}
        </div>
        <div className="relative mt-10 py-9">
          {sprocketRow(false, "top-0")}
          <ul className="m-0 flex list-none snap-x snap-mandatory scroll-px-6 items-start gap-5 overflow-x-auto px-6 [scrollbar-width:none] md:scroll-px-[5vw] md:gap-[3vw] md:px-[5vw] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const portrait = shapeOf(item) === "portrait";
              return (
                <li key={item.title} className="shrink-0 snap-start">
                  <div
                    className={`relative overflow-hidden bg-surface-2 ${
                      portrait ? "aspect-[4/5] h-[min(62vw,58svh)] md:h-[30vw]" : "aspect-[3/2] h-[min(54vw,48svh)] md:h-[24vw]"
                    }`}
                  >
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      sizes="(min-width: 768px) 36vw, 80vw"
                      unoptimized={item.image.unoptimized}
                      className="object-cover"
                    />
                  </div>
                  <p className="m-0 mt-4 font-display text-h3 text-ink">{item.title}</p>
                  {item.meta ? <p className="m-0 mt-1 text-small text-ink-muted">{item.meta}</p> : null}
                </li>
              );
            })}
          </ul>
          {sprocketRow(false, "bottom-0")}
        </div>
        {outro ? (
          <div className="mt-12 flex flex-col gap-6 px-6 md:px-[5vw]">
            <p className={`m-0 max-w-[16ch] text-h2 ${display}`}>{outro.line}</p>
            {outro.cta ? (
              <a href={outro.cta.href} className="w-fit border-b border-ink pb-1 text-lead text-ink">
                {outro.cta.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
