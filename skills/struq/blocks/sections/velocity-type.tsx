"use client";
// velocity-type (Struq section recipe)
// Two lines of display type on a moving belt. At rest they turn over slowly on their own, the first one way
// and the second the other; as you scroll they travel with it and answer its speed: the faster you go, the
// faster they run, the more they lean and the more they stretch; when you stop they settle back upright within about
// 0.4 seconds. Between the phrases small photographs can sit in the line as their own frames at cap height,
// travelling with the type; they are never masked into the letters.
//
// The travel is a running drift (following the way you last scrolled, gathering a flick) plus the scroll. The velocity is read on the GSAP ticker from the
// scroll position itself (so it falls to zero when the page stops, unlike a velocity that only updates on
// scroll events), clamped, and smoothed on a short time constant so it never jitters. One loop, transforms
// only, nothing pinned. Each line repeats its copy enough times to fill the screen twice and wraps by
// exactly one copy's width, measured after the fonts land and on every resize, so the loop has no seam.
//
// <VelocityType lines={[
//   ["Huizen", images.card[0], "Interieurs", images.card[1], "Tuinen"],
//   ["Licht eerst", images.column[0], "dan pas muren"],
// ]} />
//
// A hidden plain copy of each line is read by screen readers; the belt is aria-hidden. Reduced motion and pages
// without scripts: the lines stand still, set as composed type. Phones: the same travel with half the lean.
import Image from "next/image";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Piece = string | StruqImage;

type Props = {
  /** Two lines (one works too): phrases, with photographs between them where wanted. */
  lines: Piece[][];
  className?: string;
};

/** Sideways travel per pixel scrolled: a normal pass carries two or three phrases by. */
const RATE = 1.1;
/** The belt turns over on its own at this speed (px/s), and runs faster by this share of the scroll speed.
 * Both accumulate into the drift, so a fast flick carries the belt on and nothing ever slides back. */
const DRIFT = 75;
const BOOST = 0.25;
/** Scroll speed (px/s) at which the lean and the stretch are full; anything faster is clamped. */
const FAST = 600;
/** The most the type leans (degrees) and stretches (share of its width), desktop and phone. */
const LEAN = { wide: 12, narrow: 6 };
const STRETCH = 0.06;
/** The time constant of the smoothing (s): settled to under 5% within 0.4s of stopping. */
const TAU = 0.12;
/** Copies of each line: enough to cover the screen twice whatever the copy's length. */
const COPIES = 4;

const isImage = (p: Piece): p is StruqImage => typeof p !== "string";

export function VelocityType({ lines, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const belts = Array.from(el.querySelectorAll<HTMLElement>("[data-belt]"));
      const lenses = belts.map((b) => b.parentElement);
      if (belts.length === 0) return;

      // Each inline frame stays unseen until its photograph is decoded, so an empty box never reaches the
      // screen (the pre-paint gate hides it, and shows it after 3s whatever happens).
      for (const frame of Array.from(
        el.querySelectorAll<HTMLElement>("[data-inline]"),
      )) {
        const img = frame.querySelector("img");
        if (!img) continue;
        const loaded = img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            });
        loaded
          .then(() => img.decode())
          .catch(() => undefined)
          .then(() => {
            frame.style.visibility = "visible";
          });
      }

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          wide: "(min-width: 768px)",
        },
        (ctx) => {
          const { motion, wide } = ctx.conditions as {
            motion: boolean;
            wide: boolean;
          };
          // The belt is held unseen until it stands where the loop puts it (see the gate on it below).
          const release = () => {
            for (const b of belts) b.style.visibility = "visible";
          };
          if (!motion) {
            release();
            return;
          }
          const lean = wide ? LEAN.wide : LEAN.narrow;

          // One copy's width, the distance the belt wraps by. Measured after the fonts land and on resize.
          const widths = belts.map(() => 1);
          const measure = () => {
            belts.forEach((b, i) => {
              const first = b.querySelector<HTMLElement>("[data-copy]");
              widths[i] = Math.max(1, first?.offsetWidth ?? 1);
            });
          };
          measure();
          document.fonts?.ready.then(measure);
          const ro = new ResizeObserver(measure);
          belts.forEach((b) => {
            const first = b.querySelector<HTMLElement>("[data-copy]");
            if (first) ro.observe(first);
          });

          // Only while the section is near the screen does the loop do any work.
          let near = false;
          const watch = ScrollTrigger.create({
            trigger: el,
            start: "top bottom+=200",
            end: "bottom top-=200",
            onToggle: (self) => {
              near = self.isActive;
            },
          });
          near = watch.isActive;

          let lastY = window.scrollY;
          let v = 0;
          let drift = 0;
          let sense = 1;
          const tick = (_time: number, deltaMs: number) => {
            const y = window.scrollY;
            const dt = Math.max(0.001, Math.min(0.1, deltaMs / 1000));
            const raw = gsap.utils.clamp(-FAST * 2, FAST * 2, (y - lastY) / dt);
            lastY = y;
            // Smoothed on a short time constant: no jitter, and back to zero soon after the page stops.
            v += (raw - v) * (1 - Math.exp(-dt / TAU));
            if (Math.abs(v) < 0.5) v = 0;
            if (!near) return;
            // The drift follows the way the reader last scrolled, as a velocity marquee does, and gathers the
            // extra speed of a flick, so the belt keeps turning at rest and never runs back after a flick.
            if (Math.abs(raw) > 1) sense = raw > 0 ? 1 : -1;
            drift += sense * (DRIFT + Math.abs(v) * BOOST) * dt;
            place(y);
          };

          // Where each belt stands for the current scroll and drift, with its lean and stretch.
          const place = (y: number) => {
            const top = el.getBoundingClientRect().top + y;
            const travel = (y - top) * RATE + drift;
            const k = gsap.utils.clamp(-1, 1, v / FAST);
            belts.forEach((b, i) => {
              const dir = i % 2 === 0 ? -1 : 1;
              const w = widths[i];
              // Wrapped by exactly one copy, so the loop never shows a seam.
              const x = gsap.utils.wrap(-w, 0, dir * travel);
              // The type leans back against the way it is dragged (its top lags), and stretches with the speed.
              const skew = k * lean * dir;
              const sx = 1 + Math.abs(k) * STRETCH;
              b.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
              // The lean and the stretch sit on a screen-wide lens around the belt, pivoting on the screen's
              // centre, so the stretch never slides the visible type sideways.
              const lens = lenses[i];
              if (lens)
                lens.style.transform = `skewX(${skew.toFixed(3)}deg) scaleX(${sx.toFixed(4)})`;
            });
          };
          gsap.ticker.add(tick);

          // Released only once the display face has landed and the belt is measured and placed with it, so the
          // first frame anyone sees is already the loop's own; never a jump from the resting layout, never a
          // fallback face's widths. The pre-paint gate shows it after 3s whatever happens.
          let live = true;
          Promise.race([
            document.fonts?.ready ?? Promise.resolve(),
            new Promise((r) => setTimeout(r, 1500)),
          ]).then(() => {
            if (!live) return;
            measure();
            place(window.scrollY);
            release();
          });

          return () => {
            live = false;
            gsap.ticker.remove(tick);
            watch.kill();
            ro.disconnect();
            for (const b of belts) b.style.transform = "";
            for (const l of lenses) if (l) l.style.transform = "";
          };
        },
      );
      return () => mm.revert();
    },
    { scope: stage, dependencies: [lines.length] },
  );

  return (
    <section
      ref={stage}
      data-section="velocity-type"
      className={`relative overflow-hidden bg-surface-0 py-[18vw] md:py-[20svh] ${className}`}
    >
      {lines.map((line, li) => (
        // One readable copy per row, for screen readers only; every copy on the belt is decoration and hidden.
        // The row clips sideways only, so descenders below the tight leading are never cut.
        <p
          key={li}
          className={`[overflow-x:clip] ${li > 0 ? "mt-[1.4vw]" : ""} ${li % 2 === 1 ? "pl-[18vw] motion-safe:pl-0" : "pl-[4vw] motion-safe:pl-0"}`}
        >
          <span className="sr-only">
            {line.filter((p): p is string => !isImage(p)).join(", ")}
          </span>
          <span data-lens="" className="block origin-center">
            <span
              data-belt=""
              className="flex w-max motion-safe:[.js_&]:invisible motion-safe:[.sq-js_&]:invisible motion-safe:[.js_&]:animate-[struq-show_0s_3s_forwards] motion-safe:[.sq-js_&]:animate-[struq-show_0s_3s_forwards]"
            >
              {Array.from({ length: COPIES }, (_, c) => (
                <span
                  key={c}
                  data-copy={c === 0 ? "" : undefined}
                  aria-hidden
                  className={`flex shrink-0 items-center whitespace-nowrap pr-[0.32em] font-display text-[22vw] leading-[0.92] tracking-[-0.04em] text-ink md:text-[15vw] ${
                    li % 2 === 1
                      ? "font-accent font-light italic tracking-[-0.03em]"
                      : ""
                  }`}
                >
                  {line.map((piece, pi) =>
                    isImage(piece) ? (
                      <span
                        key={pi}
                        data-inline=""
                        className="relative mx-[0.32em] inline-block aspect-[4/3] h-[0.62em] shrink-0 overflow-hidden rounded-[0.06em] not-italic [.js_&]:invisible [.sq-js_&]:invisible [.js_&]:animate-[struq-show_0s_3s_forwards] [.sq-js_&]:animate-[struq-show_0s_3s_forwards]"
                      >
                        <Image
                          src={piece.src}
                          alt=""
                          fill
                          loading="eager"
                          sizes="(min-width: 768px) 13vw, 18vw"
                          unoptimized={piece.unoptimized}
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span key={pi} className="px-[0.12em]">
                        {piece}
                      </span>
                    ),
                  )}
                </span>
              ))}
            </span>
          </span>
        </p>
      ))}
    </section>
  );
}
