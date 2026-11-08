"use client";
// toonstuk-scrub-connector (Struq showpiece recipe)
// Two words and one bar that joins them. The words start far apart, one high on the left, one low
// on the right, divided by a tall upright slab of ink. As you scroll the stage pins and the bar
// becomes the showpiece: the slab swings a third of a turn and runs out past both edges as one
// slash through both words (their letters turn to the ground colour where it crosses). It then
// draws back to the words' inner ends and carries them in, turning to the accent as it travels,
// and seats long and slightly rising between them. The joined pair holds, and the pin lets the
// whole picture scroll away. The pin is 300%: every key frame holds, the moves are short.
// The bar is drawn from plain numbers on every frame, never by tweening a clip-path string.
// Lead for an agency or a creative brand (or toonstuk-fill-rows instead).
//
// <ScrubConnector left="Kijken" right="Maken" leftText="Elk project begint met wat er al staat." rightText="Daarna tekenen we pas." />
//
// Reduced motion: the joined pair, the accent bar rising between the words. Phones: the words
// stacked, joined by an upright accent bar with the two lines of copy beside it.
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";

type Props = {
  left: string;
  right: string;
  leftText?: string;
  rightText?: string;
  className?: string;
};

type Tone = "base" | "ink" | "accent";

const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The landed bar rises by this angle: its ends meet the words 0.12em below and above the line (atan(0.24 / 2.44)). */
const RISE = 5.6;
/** How far each word sits below (first) or above (second) the shared line, in em of the display size. */
const STEP = 0.12;
/** The opening slab: its height as a share of the screen, its thickness in em. */
const SLAB = 0.66;
const SLAB_T = 0.3;
/** The slash: its thickness in em, and how far past the two words it runs, as a multiple of their distance. */
const SLASH_T = 0.42;
const SLASH = 2.4;

export function ScrubConnector({ left, right, leftText, rightText, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      const base = q("[data-row='base']")[0];
      const still = base?.querySelector<HTMLElement>("[data-still]");
      const wordL = base?.querySelector<HTMLElement>("[data-word='l']");
      const wordR = base?.querySelector<HTMLElement>("[data-word='r']");
      const sideL0 = base?.querySelector<HTMLElement>("[data-side='l']");
      const sideR0 = base?.querySelector<HTMLElement>("[data-side='r']");
      const gap = base?.querySelector<HTMLElement>("[data-gap]");
      if (!base || !still || !wordL || !wordR || !sideL0 || !sideR0 || !gap) return;

      // Fit: the pair never wraps or overflows, whatever the face, and a narrow face grows (up to a third) so the
      // joined pair still spans the frame. Measured at the natural size, then scaled.
      const fit = () => {
        el.style.setProperty("--fit", "1");
        const avail = base.clientWidth;
        const wide = window.matchMedia("(min-width: 768px)").matches;
        const need = wide
          ? sideL0.offsetWidth + gap.offsetWidth + sideR0.offsetWidth
          : Math.max(wordL.offsetWidth, wordR.offsetWidth);
        if (need <= 0) return;
        const k = Math.min(wide ? 1.33 : 1, avail / need);
        if (Math.abs(k - 1) > 0.005) el.style.setProperty("--fit", String(Math.floor(k * 1000) / 1000));
      };
      fit();
      document.fonts?.ready.then(fit);
      window.addEventListener("resize", fit);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        el.dataset.motion = "1";
        const sidesL = q("[data-side='l']");
        const sidesR = q("[data-side='r']");
        const inkLayer = q("[data-layer='ink']")[0];
        const accentLayer = q("[data-layer='accent']")[0];

        // Layout positions, untouched by transforms: offsets walk up to the stage.
        const box = (n: HTMLElement) => {
          let x = 0;
          let y = 0;
          let cur: HTMLElement | null = n;
          while (cur && cur !== el) {
            x += cur.offsetLeft;
            y += cur.offsetTop;
            cur = cur.offsetParent as HTMLElement | null;
          }
          return { x, y, w: n.offsetWidth, h: n.offsetHeight };
        };

        // Each word has a home point on the shared line (its centre, at its place beside the bar). The bar hangs
        // on two anchors that ride with the words: their centres while it slashes, their inner ends once seated.
        const g = {
          H: 1,
          offL: { x: 0, y: 0 }, offR: { x: 0, y: 0 },
          homeL: { x: 0, y: 0 }, homeR: { x: 0, y: 0 },
          endL: { x: 0, y: 0 }, endR: { x: 0, y: 0 },
          l0: 0, t0: 0, t1: 0, t2: 0,
        };
        const measure = () => {
          fit();
          const W = el.clientWidth;
          g.H = el.clientHeight;
          const em = parseFloat(getComputedStyle(wordL).fontSize) || 100;
          const step = STEP * em; // the sides carry this as their CSS translate, below and above the line
          const b = box(still);
          const line = b.y + b.h / 2;
          const wl = box(wordL);
          const wr = box(wordR);
          const sl = box(sideL0);
          const sr = box(sideR0);
          g.homeL = { x: wl.x + wl.w / 2, y: line + step };
          g.homeR = { x: wr.x + wr.w / 2, y: line - step };
          // The seated bar is the still bar's own box turned by RISE about its centre; its ends, relative to homes.
          const hx = (Math.cos(RISE * DEG) * b.w) / 2;
          const hy = (Math.sin(RISE * DEG) * b.w) / 2;
          const cx = b.x + b.w / 2;
          g.endL = { x: cx - hx - g.homeL.x, y: line + hy - g.homeL.y };
          g.endR = { x: cx + hx - g.homeR.x, y: line - hy - g.homeR.y };
          g.t2 = b.h;
          const m = W * 0.05;
          // The start: the first word high on the left, the second low on the right, both whole in the frame.
          g.offL = {
            x: m - sl.x,
            y: Math.max(g.H * 0.27 - g.homeL.y, g.H * 0.08 - (sl.y + step)),
          };
          g.offR = {
            x: W - m - (sr.x + sr.w),
            y: Math.min(g.H * 0.7 - g.homeR.y, g.H * 0.93 - (sr.y + sr.h - step)),
          };
          g.l0 = g.H * SLAB;
          g.t0 = SLAB_T * em;
          g.t1 = SLASH_T * em;
        };

        // Every value the scroll drives, as plain numbers.
        const s = { sweep: 0, reach: SLASH, pull: 0, anchor: 0, thin: 0, fill: 0 };

        // A bar about its centre, `from` and `to` the stretch of its length that is drawn (0 is the end the angle
        // points away from).
        const quad = (cx: number, cy: number, ang: number, len: number, t: number, from = 0, to = 1) => {
          const dx = Math.cos(ang);
          const dy = Math.sin(ang);
          const a = -len / 2 + len * from;
          const z = -len / 2 + len * to;
          const o = t / 2;
          const p = (k: number, n: number) => `${(cx + dx * k - dy * n).toFixed(2)}px ${(cy + dy * k + dx * n).toFixed(2)}px`;
          return `polygon(${p(a, -o)}, ${p(z, -o)}, ${p(z, o)}, ${p(a, o)})`;
        };

        const paint = () => {
          // The words: from their corners to their places, carried in by the bar.
          const lx = g.offL.x * (1 - s.pull);
          const ly = g.offL.y * (1 - s.pull);
          const rx = g.offR.x * (1 - s.pull);
          const ry = g.offR.y * (1 - s.pull);
          const tL = `translate3d(${lx.toFixed(2)}px, ${ly.toFixed(2)}px, 0)`;
          const tR = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
          for (const n of sidesL) n.style.transform = tL;
          for (const n of sidesR) n.style.transform = tR;

          // The rod between the two anchors. Its angle points from the second word back to the first, so the first
          // word's end is the far end of its length.
          const ax = g.homeL.x + lx + g.endL.x * s.anchor;
          const ay = g.homeL.y + ly + g.endL.y * s.anchor;
          const bx = g.homeR.x + rx + g.endR.x * s.anchor;
          const by = g.homeR.y + ry + g.endR.y * s.anchor;
          const rodAng = Math.atan2(by - ay, bx - ax) / DEG + 180;
          const rodLen = Math.hypot(bx - ax, by - ay) * s.reach;
          const rodT = lerp(g.t1, g.t2, s.thin);
          // Before the slash the bar is the upright slab between the words, swinging onto the rod.
          const ang = lerp(90, rodAng, s.sweep) * DEG;
          const len = lerp(g.l0, rodLen, s.sweep);
          const t = lerp(g.t0, rodT, s.sweep);
          const cx = (ax + bx) / 2;
          const cy = (ay + by) / 2;
          inkLayer.style.clipPath = quad(cx, cy, ang, len, t);
          // The accent runs along the bar from the first word's end while it travels.
          accentLayer.style.clipPath = s.fill > 0 ? quad(cx, cy, ang, len, t + 1, 1 - s.fill, 1) : "polygon(0 0, 0 0, 0 0)";
        };

        measure();
        paint();

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: paint,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 1,
            onRefreshInit: () => {
              for (const n of [...sidesL, ...sidesR]) n.style.transform = "";
            },
            onRefresh: () => {
              measure();
              paint();
            },
          },
        });
        // Hold: the two words apart, the slab standing between them.
        tl.to({}, { duration: 0.6 })
          // The showpiece: the slab swings a third of a turn, thickens and runs out past both edges, onto the
          // line through both words.
          .to(s, { sweep: 1, duration: 1.2, ease: "power2.inOut" })
          // Hold on the slash through both words.
          .to({}, { duration: 0.9 })
          // The join: the bar draws back to the words' inner ends and carries them in to their places, turning
          // to the accent and thinning as it goes, and seats long and rising between them.
          .to(s, { pull: 1, duration: 1.3, ease: "power3.inOut" })
          .to(s, { anchor: 1, reach: 1, duration: 0.7, ease: "power3.inOut" }, "<")
          .to(s, { thin: 1, duration: 1.3, ease: "power2.inOut" }, "<")
          .to(s, { fill: 1, duration: 1.1, ease: "power2.inOut" }, "<0.1")
          // Hold on the joined pair; the pin then lets the whole picture scroll away.
          .to({}, { duration: 1.4 });

        return () => {
          delete el.dataset.motion;
          for (const n of [...sidesL, ...sidesR]) n.style.transform = "";
          for (const n of [inkLayer, accentLayer]) n.style.clipPath = "";
        };
      });
      return () => {
        window.removeEventListener("resize", fit);
        mm.revert();
      };
    },
    { scope: stage },
  );

  // One fluid display size: 19vw on phones, about 10vw on desktop, scaled by --fit so the pair spans the frame. The
  // bar, the gap, the step between the words and the copy's clearance below the descenders all follow it in em.
  const word =
    "font-display block w-fit whitespace-nowrap text-[length:var(--cw)] leading-[0.9] tracking-[-0.035em]";

  const row = (tone: Tone) => {
    const wordTone = tone === "base" ? "text-ink" : tone === "ink" ? "text-surface-0" : "text-accent-ink";
    const copyTone = tone === "base" ? "text-ink-muted" : wordTone;
    const copy = `max-w-[26ch] text-small ${copyTone}`;
    return (
      <div
        data-row={tone}
        className="grid w-full grid-cols-[auto_1fr] gap-x-5 md:flex md:items-start md:justify-center md:gap-x-0"
      >
        <div data-side="l" className="contents md:flex md:flex-col md:items-start md:translate-y-[calc(var(--cw)*0.12)]">
          <span data-word="l" className={`${word} col-span-2 ${wordTone}`}>
            {left}
          </span>
          {leftText ? (
            <p className={`${copy} col-start-2 row-start-2 mt-[calc(var(--cw)*0.32)] self-start md:mt-[calc(var(--cw)*0.36)]`}>
              {leftText}
            </p>
          ) : null}
        </div>
        <span
          data-gap=""
          aria-hidden
          className="font-display col-start-1 row-span-2 row-start-2 my-[0.1em] ml-[0.05em] block min-h-[28svh] w-[0.1em] text-[length:var(--cw)] leading-[0.9] md:my-0 md:ml-0 md:min-h-0 md:w-[2.8em] md:shrink-0 md:px-[0.18em]"
        >
          <span
            data-still=""
            className={`block h-full w-full bg-accent md:inline-block md:h-[0.18em] md:-rotate-[5.6deg] ${
              tone === "base" ? "group-data-[motion]:invisible" : "invisible"
            }`}
            style={{ verticalAlign: "calc(0.5ex - 0.09em)" }}
          />
        </span>
        <div data-side="r" className="contents md:flex md:flex-col md:items-end md:text-right md:-translate-y-[calc(var(--cw)*0.12)]">
          <span data-word="r" className={`${word} col-span-2 row-start-4 ${wordTone}`}>
            {right}
          </span>
          {rightText ? (
            <p className={`${copy} col-start-2 row-start-3 self-end pb-1 md:mt-[calc(var(--cw)*0.36)] md:pb-0`}>{rightText}</p>
          ) : null}
        </div>
      </div>
    );
  };

  const layer = "pointer-events-none absolute inset-0 hidden items-center px-[5vw] group-data-[motion]:md:flex";
  return (
    <section
      ref={stage}
      data-showpiece="scrub-connector"
      style={{ "--cw": "calc(var(--cw-base) * var(--fit, 1))" } as React.CSSProperties}
      className={`group relative flex items-center overflow-hidden bg-surface-0 px-6 py-24 [--cw-base:19vw] md:h-svh md:px-[5vw] md:py-0 md:[--cw-base:clamp(3rem,1rem_+_10.5vw,14rem)] ${className}`}
    >
      {row("base")}
      <div data-layer="ink" aria-hidden className={`${layer} bg-ink`}>
        {row("ink")}
      </div>
      <div data-layer="accent" aria-hidden className={`${layer} bg-accent`}>
        {row("accent")}
      </div>
    </section>
  );
}
