"use client";
// hero-still (Struq hero recipe)
// A photograph with a title. One photograph edge to edge, held with a very slow push-in (six percent over twenty
// seconds); the headline rises line by line through masks at display size on the photo's calm side; under the photo,
// on the page ground, a quiet caption bar with its facts on one line: the place, an optional middle fact, one link.
// On scroll the photograph moves slower than the page and the headline leaves first, so the hero hands over with depth.
//
// <HeroStill image={images.hero[0]} lines={["Ruimte die", "blijft."]} accent="blijft" place="Noord, Rotterdam"
//   link={{ href: "/werk", label: "Bekijk het werk" }} />
//
// `accent` (optional) is the site's one accent word: where it first stands in the headline it is set in the pairing's
// italic accent face, inside its line's mask, and the Statement and the Close carry the same word. Left out, or not in
// the headline, the headline is exactly as it was.
//
// The caption's words are the client's own. `note` fills the middle with one fact from the client's trade (a scale, a
// year, a plot number); without it the caption is the place and the link, one either side. A live local clock is
// there only when asked: `clock` puts the time in `timeZone` in the middle (with `clockLabel` after it, "lokale tijd"
// by default) in place of the note. The time is never read during render: the slot holds its width empty on the server
// and the first paint, and the real time arrives after mount, renewed on the minute.
//
// The photo's box carries data-stack-target, so preloader-stack and page-transition-stack land on it exactly, and the
// entrance starts only when the cover lifts (whenUncovered), at once when there is none. The push-in never re-rasters:
// the photograph is laid out six percent larger than its box and shown scaled down to fit, so at rest it is exactly
// an object-cover of the box, and the push-in only scales that layer back up to its own size (a compositor animation,
// rastered once at the largest scale it reaches). It starts a moment after the entrance, so a preloader landing on the
// box always meets the photo at rest.
//
// Side and veil come from the photograph itself. Unless a side is given, the headline takes whichever side needs the
// weaker veil (decided while its lines are still under their masks, so the choice is never seen; the photo's
// negativeSpace sets the first paint and breaks a tie), and the veil is the weakest that gives the display-size
// headline 3:1 over what is actually under its glyphs, never past 0.45 (read from a small canvas; a photo on another
// origin cannot be read and keeps the safe veil the CSS starts with). The caption sits on the ground, in the ink.
//
// The first paint is the composed still: the photo and its veil; the headline and the caption wait below their masks
// and arrive with the entrance, or after 3 seconds if the script never runs (a script that arrives after that leaves
// them in place) (blocks.css, "--- hero-still ---"). Phones:
// the same still, the headline sized to fit, the caption on two lines. Reduced motion: no push-in, no rise, no drift.
// Without scripts: the composed still with everything in place.
//
// Three variants of the same still, picked with `variant`:
// - still (the default, above).
// - frame: the photograph held inside generous margins of page ground, the headline on the ground beside it in the
//   ink. On the first scroll (pin 100%) the frame opens by registration to the full bleed of the still while the
//   headline leaves upward; the caption strip stays. Phones: a smaller frame with the headline under it, and the
//   still's own hand-over.
// - horizon: the headline set across the photograph's horizon (found in the photo itself), its upper lines on the sky
//   or wall side and its lower lines on the ground side, each half in the ink that side measures for, over its own
//   light veil band. The upper lines rise to the horizon and the lower lines drop to it; on scroll the headline rides
//   with the photograph, so it stays on its horizon as the still hands over.
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { accentLines } from "../kit/accent";
import { ScrollTrigger, gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances, type PhotoBox } from "../kit/photo-read";
import { covered, whenUncovered } from "../preloaders/preloader-slices-uncovered";

export const HERO_STILL_VARIANTS = [
  { id: "still", title: "Still" },
  { id: "frame", title: "Kader" },
  { id: "horizon", title: "Horizon" },
] as const;

export type HeroStillVariant = (typeof HERO_STILL_VARIANTS)[number]["id"];

type Props = Inner & {
  /** The composition: the full-bleed still (default), the photo in a frame of ground, or the headline on the horizon. */
  variant?: HeroStillVariant;
};

type Inner = {
  image: StruqImage;
  /** The headline, one entry per line, display size. Two or three short lines read best. */
  lines: string[];
  /** The site's one accent word: where it first stands in the headline it is set in the pairing's italic accent face
   * (--face-accent), as the Statement and the Close set it. A word the headline does not hold changes nothing. */
  accent?: string;
  /** The studio's place, the caption's first fact. */
  place: string;
  /** The caption's middle fact, in the client's own words (a scale, a year, a plot number). Left out, the caption is
   * the place and the link alone. A clock takes its place. */
  note?: string;
  /** A live local clock in the caption's middle. Off unless asked: one clock per site at most. */
  clock?: boolean;
  /** IANA zone for the clock. */
  timeZone?: string;
  /** The words after the clock's time. */
  clockLabel?: string;
  /** The caption's last fact: one link. */
  link: { href: string; label: string };
  /** Where the headline stands. Left out, the block reads the photo and takes the side that needs the weaker veil
   * (the photo's negativeSpace breaks a tie); the first paint, and a page without scripts, use negativeSpace. */
  side?: "left" | "right";
  /** horizon only: where the photo's horizon lies, as a share of the still's height. Left out, the block looks for
   * the strongest change of brightness across the photo's middle band (a horizon of texture, such as a wall meeting
   * gravel of the same tone, is not found that way and is best given). */
  horizon?: number;
  className?: string;
};

const HEAD_RATIO = 3; // display-size type: WCAG large text
const MAX_VEIL = 0.45; // past this the photo reads as a dimmed banner, not a still

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encode = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** The relative luminance of any CSS colour, through a one-pixel canvas so every colour syntax resolves. */
function luminanceOf(color: string): number {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return 0.2126 * linear(r / 255) + 0.7152 * linear(g / 255) + 0.0722 * linear(b / 255);
}

/**
 * The brightest part (the top tenth) of the photo under a box, the box in the photo box's own coordinates, with the
 * photo shown as object-cover of that box. Null when the photo cannot be read.
 */
function brightUnder(img: HTMLImageElement, box: { w: number; h: number }, at: DOMRect, from: DOMRect): number | null {
  const ys = photoLuminances(
    img,
    { x: from.left, y: from.top, w: box.w, h: box.h },
    { x: at.left, y: at.top, w: at.width, h: at.height },
  );
  return ys ? ys[Math.floor(ys.length * 0.9)] : null;
}

/** The weakest veil (composited in sRGB, as the browser does) that brings `under` to `ratio` against `ink`. */
function veilFor(under: number, ink: number, veilS: number, ratio: number): number {
  if (contrast(under, ink) >= ratio) return 0;
  const s = encode(under);
  const ok = (a: number) => contrast(linear(s * (1 - a) + veilS * a), ink) >= ratio;
  if (!ok(MAX_VEIL)) return MAX_VEIL;
  let lo = 0;
  let hi = MAX_VEIL;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** The time in a zone as HH:MM, the same five characters at every minute. Only ever called after mount. */
function timeIn(zone: string) {
  return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(
    new Date(),
  );
}

/** The veil under a light ink: the page ground held dark (its own hue, never black), as the CSS sets it. */
const DIM_VEIL = "oklch(from var(--surface-0) min(l, 0.2) c h)";

/** The luminance of a colour as the page resolves it (custom properties, relative colours), through a probe. */
function resolvedLuminance(host: HTMLElement, css: string) {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = css;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return luminanceOf(c);
}

export type InkPick = { ink: string; tone: "dark" | "light"; veil: number };

/**
 * Of the light photo ink and the darkest ink the page has, the one that needs the weaker veil to hold 3:1 (display
 * type) over what the photo holds under `boxes` (in the coordinates of `frame`, the box the photo covers): the light
 * ink against the brightest tenth with the dark veil, the dark ink against the darkest tenth with a pale veil of the
 * light ink. A near tie, or a palette without a dark ink, keeps the light ink. Null when the photo cannot be read.
 */
export function inkOver(img: HTMLImageElement, frame: PhotoBox, boxes: PhotoBox[], host: HTMLElement): InkPick | null {
  const ys: number[] = [];
  for (const b of boxes) {
    const r = photoLuminances(img, frame, b);
    if (!r) return null;
    ys.push(...r);
  }
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  const hi = ys[Math.floor(ys.length * 0.9)];
  const lo = ys[Math.floor(ys.length * 0.1)];
  const light = resolvedLuminance(host, "var(--on-photo)");
  const dark = ["--ink", "--inverse", "--surface-0"]
    .map((v) => ({ v, y: resolvedLuminance(host, `var(${v})`) }))
    .sort((a, b) => a.y - b.y)[0];
  const forLight = veilFor(hi, light, encode(resolvedLuminance(host, DIM_VEIL)), HEAD_RATIO);
  const forDark = veilFor(lo, dark.y, encode(light), HEAD_RATIO);
  if (contrast(dark.y, light) >= HEAD_RATIO && forDark < forLight - 0.04) {
    return { ink: `var(${dark.v})`, tone: "light", veil: forDark };
  }
  return { ink: "var(--on-photo)", tone: "dark", veil: forLight };
}

export function HeroStill({ variant = "still", ...rest }: Props) {
  if (variant === "frame") return <StillFrame {...rest} />;
  if (variant === "horizon") return <StillHorizon {...rest} />;
  return <StillBleed {...rest} />;
}

function StillBleed({ image, lines, accent, side, className = "", ...caption }: Inner) {
  const root = useRef<HTMLElement>(null);
  const first = side ?? (image.negativeSpace === "right" ? "right" : "left");

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const frame = q("[data-stack-target]")[0] as HTMLElement;
      const img = frame.querySelector("img") as HTMLImageElement;
      const veil = q("[data-veil]")[0] as HTMLElement;
      const rise = q("[data-rise]");
      const head = q("[data-head]")[0] as HTMLElement;

      const h1 = head.querySelector("h1") as HTMLElement;
      // Only what is under the type: the glyphs' own width (a range; the rise moves the lines vertically only), over
      // the height of an untransformed box that holds them.
      const under = (n: HTMLElement, holder: HTMLElement = n) => {
        const range = document.createRange();
        range.selectNodeContents(n);
        const text = range.getBoundingClientRect();
        const own = holder.getBoundingClientRect();
        return new DOMRect(text.left, own.top, text.width, own.height);
      };

      /**
       * The veil from the photo itself, and (unless the side was given, and only while the headline is still under
       * its masks) the side the headline stands on: whichever needs the weaker veil. The headline holds 3:1 (display
       * size), the veil stops at MAX_VEIL; the caption sits on the page ground. The CSS's safe veil stays when the photo
       * cannot be read.
       */
      const grade = () => {
        const ink = luminanceOf(getComputedStyle(el).color);
        const veilS = encode(luminanceOf(getComputedStyle(veil).backgroundColor));
        const from = frame.getBoundingClientRect();
        const box = { w: from.width, h: from.height };
        const read = (n: HTMLElement, holder?: HTMLElement) => brightUnder(img, box, under(n, holder), from);
        const headNeed = () => {
          const r = read(h1);
          return r === null ? null : veilFor(r, ink, veilS, HEAD_RATIO);
        };
        let need = headNeed();
        if (need === null) return;
        if (!side && !shown) {
          const was = el.dataset.side;
          el.dataset.side = was === "right" ? "left" : "right";
          const other = headNeed();
          // The other side only when it is clearly better; a tie keeps the photo's own calm side.
          if (other !== null && other < need - 0.02) need = other;
          else el.dataset.side = was;
        }
        graded = need;
        if (played || !covered()) veil.style.opacity = graded.toFixed(3);
      };
      let graded: number | null = null;
      let played = false;
      // Under a preloader the photo is shown bare, the way the preloader's own print of it lands; the veil then
      // settles in with the headline, so the landing never darkens in one frame.
      if (covered()) {
        veil.style.transition = "none";
        veil.style.opacity = "0";
      }

      let cancel = () => {};
      // Strict mode runs this twice; a decode that settles after its run was torn down must do nothing.
      let gone = false;
      const decoded = img.decode().catch(() => undefined);
      // A late script: the CSS fallback (3s) may already have shown the lines. Then they stay; the script still grades
      // the veil and starts the push-in, but never hides and raises them a second time.
      // Decided once per element: strict mode's second run must not read the state its own first run left behind.
      // The answer is this element's own fallback clock, which starts when the element is first styled (at the first
      // paint, or when a client-side navigation mounts it): once it has run 2.9s the CSS has shown the lines.
      const clock = rise[0]
        .getAnimations()
        .find((a) => (a as CSSAnimation).animationName === "struq-hs-rise");
      el.dataset.shown ??= String(
        reduce || (clock ? Number(clock.currentTime ?? 0) >= 2900 : getComputedStyle(rise[0]).transform === "none"),
      );
      const shown = el.dataset.shown === "true";
      // Shown means in place, whatever state the element came back in.
      if (shown) gsap.set(rise, { y: 0, yPercent: 0 });
      // y: 0 as well: GSAP would otherwise read the CSS start state (translateY 115%) into a pixel y and keep it.
      if (!shown) gsap.set(rise, { y: 0, yPercent: 115 });
      el.dataset.ready = "";
      decoded.then(() => {
        if (gone) return;
        grade();
        const play = contextSafe(() => {
          played = true;
          veil.style.transition = "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
          veil.style.opacity = (graded ?? 0.4).toFixed(3);
          if (reduce) {
            gsap.set(rise, { yPercent: 0 });
            return;
          }
          if (!shown) gsap.to(rise, { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: 0.09, delay: 0.1 });
          // The push-in, a moment later, so a preloader landing on the box meets the photo at rest.
          el.dataset.pushing = "";
        });
        // The signal says a cover has started to leave; the headline rises once it can actually be seen (nothing of
        // a cover over its first line any more), at most 1.6s later.
        const seen = () => {
          const line = rise[0]?.parentElement?.getBoundingClientRect();
          if (!line) return true;
          const hit = document.elementFromPoint(line.left + 8, line.top + line.height / 2);
          return !hit || el.contains(hit);
        };
        let watch = 0;
        const whenSeen = () => {
          const until = performance.now() + 1600;
          const look = () => {
            if (gone) return;
            if (seen() || performance.now() > until) play();
            else watch = requestAnimationFrame(look);
          };
          look();
        };
        const stop = whenUncovered(whenSeen);
        cancel = () => {
          stop();
          cancelAnimationFrame(watch);
        };
      });

      // The hand-over: the photograph drifts down (moves slower than the page), the headline leaves first.
      if (!reduce) {
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4 } })
          .to(q("[data-drift]"), { yPercent: 22, ease: "none" }, 0)
          .to(head, { yPercent: -60, ease: "none", duration: 0.55 }, 0);
      }
      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh);
      window.addEventListener("resize", grade);
      return () => {
        gone = true;
        cancel();
        window.removeEventListener("resize", grade);
        // data-ready and data-shown stay: a remount must not bring the CSS start state (and its 3s clock) back.
        delete el.dataset.pushing;
      };
    },
    { scope: root },
  );

  const mask = (child: React.ReactNode, key?: number) => (
    <span key={key} className="struq-line-mask block">
      <span data-rise="" className="block">
        {child}
      </span>
    </span>
  );

  return (
    <section
      ref={root}
      data-hero-still=""
      data-side={first}
      suppressHydrationWarning
      className={`group/hs relative flex h-svh min-h-[32rem] flex-col overflow-hidden bg-surface-0 text-on-photo ${className}`}
    >
      {/* The still: the photograph with its headline, above the caption bar. */}
      <div data-still="" className="relative min-h-0 flex-1">
      {/* The photo's box: what a preloader lands on. Inside, the photograph sits six percent larger than the box and
          is shown scaled back to it, so the slow push-in only ever scales it up to its own raster. */}
      <div data-stack-target="" className="absolute inset-0 overflow-hidden">
        <div data-drift="" className="absolute inset-0">
          <div data-push="" className="absolute -inset-[3%]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="100vw"
              unoptimized={image.unoptimized}
              className="object-cover"
            />
          </div>
        </div>
        <div data-veil="" aria-hidden="true" className="absolute inset-0" />
      </div>

      <div
        data-head=""
        className="absolute inset-x-0 bottom-[5vh] px-sheet-margin group-data-[side=right]/hs:flex group-data-[side=right]/hs:justify-end group-data-[side=right]/hs:text-right md:bottom-[6vh]"
      >
        <h1 className="font-display text-[clamp(3rem,13.5vw,4.75rem)] leading-[0.92] tracking-[-0.035em] md:text-[clamp(3.5rem,8vw,9.5rem)]">
          {accentLines(lines, accent).map((line, i) => mask(line, i))}
        </h1>
      </div>
      </div>

      <Caption {...caption} />
    </section>
  );
}

// All three variants share what follows: the clock, the caption strip, the line masks; the frame and the horizon
// share the entrance.

/** The time in `timeZone` as HH:MM, only when `on`: empty on the server and the first paint, set after mount and
 * renewed on each minute. */
function useClock(on: boolean, timeZone: string) {
  const [time, setTime] = useState("");
  useEffect(() => {
    if (!on) return;
    let tick = 0;
    const next = () => {
      setTime(timeIn(timeZone));
      tick = window.setTimeout(next, 60_000 - (Date.now() % 60_000) + 50);
    };
    next();
    return () => window.clearTimeout(tick);
  }, [on, timeZone]);
  return time;
}

const lineMask = (child: React.ReactNode, key?: number) => (
  <span key={key} className="struq-line-mask block">
    <span data-rise="" className="block">
      {child}
    </span>
  </span>
);

type CaptionProps = Pick<Inner, "place" | "note" | "clock" | "timeZone" | "clockLabel" | "link">;

/**
 * The caption strip on the page ground: the place, a middle fact (the clock when asked, else the note), one link, on
 * one line (two on phones). The clock is in tabular figures at a fixed width, so nothing around it ever moves. With no
 * middle fact the place and the link stand at either end. On the ground its ink holds on any photograph.
 */
function Caption({ place, note, clock = false, timeZone = "Europe/Amsterdam", clockLabel = "lokale tijd", link }: CaptionProps) {
  const time = useClock(clock, timeZone);
  const middle = clock ? (
    <span className="tabular-nums lining-nums md:text-center">
      <time className="inline-block min-w-[5ch] text-right">{time}</time>
      {clockLabel ? ` ${clockLabel}` : null}
    </span>
  ) : note ? (
    <span className="md:text-center">{note}</span>
  ) : null;
  return (
    <div data-bar="" className="text-small relative bg-surface-0 px-sheet-margin pb-4 pt-3.5 text-ink md:pb-5 md:pt-4">
      <div>
        {lineMask(
          <span className={`grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 ${middle ? "md:grid-cols-[1fr_auto_1fr]" : ""}`}>
            <span>{place}</span>
            {middle}
            <a
              href={link.href}
              className={`underline decoration-1 underline-offset-4 ${middle ? "col-span-2 md:col-span-1 md:justify-self-end" : "justify-self-end"}`}
            >
              {link.label}
            </a>
          </span>,
        )}
      </div>
    </div>
  );
}

type Safe = (fn: () => void) => () => void;

/**
 * The still's entrance for the frame and the horizon: once the photo is decoded and nothing covers the headline, its
 * lines rise through their masks (lines under [data-below] drop from above instead) and the push-in starts. A script
 * that arrives after the CSS fallback (3s) leaves the lines in place. `before` runs after the decode, while the lines
 * still wait; `play` as they start. Returns whether the lines were already shown, and the cleanup.
 */
function entrance(
  el: HTMLElement,
  img: HTMLImageElement,
  safe: Safe,
  opts: { reduce: boolean; before?: () => void; play?: () => void },
) {
  const rise = Array.from(el.querySelectorAll<HTMLElement>("[data-rise]"));
  const from = (n: Element) => (n.closest("[data-below]") ? -115 : 115);
  // The element's own fallback clock, read once per element (strict mode's second run must not read its first).
  const clock = rise[0]?.getAnimations().find((a) => (a as CSSAnimation).animationName === "struq-hs-rise");
  el.dataset.shown ??= String(
    opts.reduce || (clock ? Number(clock.currentTime ?? 0) >= 2900 : getComputedStyle(rise[0]).transform === "none"),
  );
  const shown = el.dataset.shown === "true";
  // y: 0 as well: GSAP would otherwise read the CSS start state into a pixel y and keep it.
  gsap.set(rise, { y: 0, yPercent: (_: number, n: Element) => (shown ? 0 : from(n)) });
  el.dataset.ready = "";
  let gone = false;
  let cancel = () => {};
  img
    .decode()
    .catch(() => undefined)
    .then(() => {
      if (gone) return;
      opts.before?.();
      const play = safe(() => {
        opts.play?.();
        if (opts.reduce) {
          gsap.set(rise, { yPercent: 0 });
          return;
        }
        if (!shown) gsap.to(rise, { yPercent: 0, duration: 1.15, ease: "expo.out", stagger: 0.09, delay: 0.1 });
        el.dataset.pushing = "";
      });
      // The lines start once a leaving cover no longer hides the first of them, at most 1.6s after it starts to go.
      const seen = () => {
        const line = rise[0]?.parentElement?.getBoundingClientRect();
        if (!line) return true;
        const hit = document.elementFromPoint(line.left + 8, line.top + line.height / 2);
        return !hit || el.contains(hit);
      };
      let watch = 0;
      const stop = whenUncovered(() => {
        const until = performance.now() + 1600;
        const look = () => {
          if (gone) return;
          if (seen() || performance.now() > until) play();
          else watch = requestAnimationFrame(look);
        };
        look();
      });
      cancel = () => {
        stop();
        cancelAnimationFrame(watch);
      };
    });
  return {
    shown,
    stop: () => {
      gone = true;
      cancel();
      delete el.dataset.pushing;
    },
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * frame: the photograph inside margins of page ground, the headline on the ground beside it. The frame's box carries
 * data-stack-target and the photo inside it is the whole still at the still's origin (data-stack-photo), so a stack
 * preloader lands on the frame with the photo laid as the still, and opening the frame on the first scroll is a clip
 * from whole-pixel numbers to the full bleed, never a scale. The headline leaves upward ahead of the opening edge.
 */
function StillFrame({ image, lines, accent, className = "", ...caption }: Inner) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const still = el.querySelector<HTMLElement>("[data-still]");
      const slot = el.querySelector<HTMLElement>("[data-hs-slot]");
      const photo = el.querySelector<HTMLElement>("[data-hs-photo]");
      const head = el.querySelector<HTMLElement>("[data-head]");
      const img = photo?.querySelector("img");
      if (!still || !slot || !photo || !head || !img) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const run = entrance(el, img, contextSafe as Safe, { reduce });

      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          phone: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          if (!ctx.conditions?.wide) {
            // Phones: the still's own hand-over, the photo slower than the page and the headline leaving first.
            gsap
              .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4 } })
              .to(el.querySelector("[data-drift]"), { yPercent: 22, ease: "none" }, 0)
              .to(head, { yPercent: -60, ease: "none", duration: 0.55 }, 0);
            return;
          }
          el.dataset.live = "";
          const g = { W: 1, H: 1, x: 0, y: 0, w: 1, h: 1, head: 0 };
          const s = { grow: 0 };
          const measure = () => {
            g.W = still.clientWidth;
            g.H = still.clientHeight;
            const b = still.getBoundingClientRect();
            const r = slot.getBoundingClientRect();
            g.x = r.left - b.left;
            g.y = r.top - b.top;
            g.w = r.width;
            g.h = r.height;
            // The photo is the still, at the still's origin, measured (the CSS places it from the viewport units).
            Object.assign(photo.style, {
              left: `${Math.round(-g.x)}px`,
              top: `${Math.round(-g.y)}px`,
              width: `${g.W}px`,
              height: `${g.H}px`,
            });
            g.head = head.offsetTop + head.offsetHeight + 8;
          };
          const paint = () => {
            const t = Math.round(lerp(g.y, 0, s.grow));
            const r = Math.round(lerp(g.W - g.x - g.w, 0, s.grow));
            const b = Math.round(lerp(g.H - g.y - g.h, 0, s.grow));
            const l = Math.round(lerp(g.x, 0, s.grow));
            photo.style.clipPath = `inset(${t}px ${r}px ${b}px ${l}px)`;
            head.style.transform = `translate3d(0, ${Math.round(-g.head * Math.min(1, s.grow / 0.55))}px, 0)`;
          };
          const again = () => {
            measure();
            paint();
          };
          again();
          // Hold a beat on the frame, open it to the full bleed, hold on the full still, hand over.
          gsap
            .timeline({
              defaults: { ease: "none" },
              onUpdate: paint,
              scrollTrigger: { trigger: el, start: "top top", end: "+=100%", pin: true, scrub: 0.4, onRefresh: again },
            })
            .to({}, { duration: 0.15 })
            .to(s, { grow: 1, duration: 1, ease: "power3.inOut" }, 0.15)
            .to({}, { duration: 0.35 }, 1.15);
          window.addEventListener("resize", again);
          return () => {
            window.removeEventListener("resize", again);
            delete el.dataset.live;
            photo.style.clipPath = "";
            head.style.transform = "";
            for (const k of ["left", "top", "width", "height"] as const) photo.style[k] = "";
          };
        },
      );
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => {
        run.stop();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-hero-still=""
      data-hs-variant="frame"
      suppressHydrationWarning
      className={`group/hs relative flex h-svh min-h-[32rem] flex-col overflow-hidden bg-surface-0 text-ink ${className}`}
    >
      <div data-still="" className="relative min-h-0 flex-1">
        {/* The frame: what a preloader lands on. The photo inside is the whole still, registered at its origin. */}
        <div data-hs-slot="" data-stack-target="">
          <div data-hs-photo="" data-stack-photo="">
            <div data-drift="" className="absolute inset-0">
              <div data-push="" className="absolute -inset-[3%]">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority
                  sizes="100vw"
                  unoptimized={image.unoptimized}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          data-head=""
          className="absolute inset-x-sheet-margin bottom-[4svh] z-10 will-change-transform md:bottom-[3svh] md:right-auto md:max-w-[34vw]"
        >
          <h1 className="font-display text-[clamp(3rem,13.5vw,4.75rem)] leading-[0.92] tracking-[-0.035em] md:text-[clamp(3rem,5.4vw,7.5rem)]">
            {accentLines(lines, accent).map((line, i) => lineMask(line, i))}
          </h1>
        </div>
      </div>
      <Caption {...caption} />
    </section>
  );
}

/**
 * horizon: the photograph edge to edge as in the still, the headline split at its horizon. The horizon is the
 * strongest change of brightness across the photo's middle band, where both halves of the headline still fit (56%
 * when the photo cannot be read). Each half takes the ink that needs the weaker veil over what is under its own
 * glyphs, over its own veil band that ends at the horizon; the side is measured the same way unless it is given.
 */
function StillHorizon({ image, lines, accent, side, horizon, className = "", ...caption }: Inner) {
  const root = useRef<HTMLElement>(null);
  const first = side ?? (image.negativeSpace === "right" ? "right" : "left");
  // The accent is found over the whole headline, then the lines are halved: one mark, on whichever side it falls.
  const shown = accentLines(lines, accent);
  const up = shown.slice(0, Math.ceil(lines.length / 2));
  const down = shown.slice(up.length);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const still = el.querySelector<HTMLElement>("[data-still]");
      const frame = el.querySelector<HTMLElement>("[data-stack-target]");
      const img = frame?.querySelector("img");
      const above = el.querySelector<HTMLElement>("[data-above]");
      const below = el.querySelector<HTMLElement>("[data-below]");
      const bandUp = el.querySelector<HTMLElement>("[data-band='above']");
      const bandDown = el.querySelector<HTMLElement>("[data-band='below']");
      if (!still || !frame || !img || !above || !bandUp || !bandDown) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const bands = [bandUp, bandDown];
      const graded: number[] = [];
      let played = false;
      // Under a preloader the photo is shown bare, the way the preloader's print lands; the bands settle in later.
      if (covered()) {
        for (const b of bands) {
          b.style.transition = "none";
          b.style.opacity = "0";
        }
      }

      const grade = () => {
        const from = frame.getBoundingClientRect();
        const box = { x: 0, y: 0, w: from.width, h: from.height };
        // The horizon: the one given, else the place where the brightness of the four fiftieths above and the four
        // below differ most; either way within the band where both halves of the headline fit.
        const lineH = parseFloat(getComputedStyle(above).fontSize) * 0.92;
        const lo = Math.max(0.3, (box.h * 0.07 + up.length * lineH) / box.h);
        const hi = Math.max(lo, Math.min(0.8, 1 - (box.h * 0.06 + down.length * lineH) / box.h));
        let at = Math.min(hi, Math.max(lo, horizon ?? 0.56));
        if (horizon === undefined) {
          const rows: number[] = [];
          for (let k = 0; k < 50; k += 1) {
            const ys = photoLuminances(img, box, { x: 0, y: (k * box.h) / 50, w: box.w, h: box.h / 50 });
            if (!ys) return;
            rows.push(ys.reduce((a, b) => a + b, 0) / ys.length);
          }
          const mean = (a: number, b: number) => rows.slice(a, b).reduce((s, v) => s + v, 0) / (b - a);
          let edge = -1;
          for (let k = 4; k <= 46; k += 1) {
            const t = k / 50;
            if (t < lo || t > hi) continue;
            const e = Math.abs(mean(k - 4, k) - mean(k, k + 4));
            if (e > edge) {
              edge = e;
              at = t;
            }
          }
        }
        still.style.setProperty("--hs-hz", `${(at * 100).toFixed(2)}%`);

        // Each half's ink over what is under its own glyphs (the range's width, its untransformed box's height).
        const under = (n: HTMLElement): PhotoBox => {
          const range = document.createRange();
          range.selectNodeContents(n);
          const t = range.getBoundingClientRect();
          const o = n.getBoundingClientRect();
          return { x: t.left - from.left, y: o.top - from.top, w: t.width, h: o.height };
        };
        const read = () => {
          const a = inkOver(img, box, [under(above)], el);
          const b = below ? inkOver(img, box, [under(below)], el) : a;
          return a && b ? { a, b, need: a.veil + b.veil } : null;
        };
        let pick = read();
        if (!pick) return;
        if (!side && !run.shown) {
          const was = el.dataset.side;
          el.dataset.side = was === "right" ? "left" : "right";
          const other = read();
          if (other && other.need < pick.need - 0.04) pick = other;
          else el.dataset.side = was;
        }
        above.style.color = pick.a.ink;
        if (below) below.style.color = pick.b.ink;
        bandUp.dataset.tone = pick.a.tone;
        bandDown.dataset.tone = pick.b.tone;
        graded[0] = pick.a.veil;
        graded[1] = pick.b.veil;
        if (played || !covered()) bands.forEach((b, i) => (b.style.opacity = graded[i].toFixed(3)));
      };

      const run = entrance(el, img, contextSafe as Safe, {
        reduce,
        before: grade,
        play: () => {
          played = true;
          bands.forEach((b, i) => {
            b.style.transition = "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
            b.style.opacity = (graded[i] ?? 0.4).toFixed(3);
          });
        },
      });

      // The hand-over: the photograph moves slower than the page, and the headline rides with it on its horizon.
      if (!reduce) {
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.4, invalidateOnRefresh: true } })
          .to(el.querySelector("[data-drift]"), { yPercent: 22, ease: "none" }, 0)
          .to(el.querySelector("[data-ride]"), { y: () => Math.round(still.clientHeight * 0.22), ease: "none" }, 0);
      }
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      window.addEventListener("resize", grade);
      return () => {
        run.stop();
        window.removeEventListener("resize", grade);
      };
    },
    { scope: root },
  );

  const head =
    "absolute inset-x-sheet-margin font-display text-[clamp(3rem,13.5vw,4.75rem)] leading-[0.92] tracking-[-0.035em] group-data-[side=right]/hs:text-right md:text-[clamp(3.5rem,8vw,9.5rem)]";

  return (
    <section
      ref={root}
      data-hero-still=""
      data-hs-variant="horizon"
      data-side={first}
      suppressHydrationWarning
      className={`group/hs relative flex h-svh min-h-[32rem] flex-col overflow-hidden bg-surface-0 text-on-photo ${className}`}
    >
      <div
        data-still=""
        className="relative min-h-0 flex-1"
        style={{ "--hs-hz": `${((horizon ?? 0.56) * 100).toFixed(2)}%` } as React.CSSProperties}
      >
        <div data-stack-target="" className="absolute inset-0 overflow-hidden">
          <div data-drift="" className="absolute inset-0">
            <div data-push="" className="absolute -inset-[3%]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                sizes="100vw"
                unoptimized={image.unoptimized}
                className="object-cover"
              />
            </div>
            {/* One light veil band per half, meeting at the horizon. */}
            <div data-veil="" data-band="above" aria-hidden="true" className="absolute inset-x-0 top-0 h-[var(--hs-hz)]" />
            <div data-veil="" data-band="below" aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[var(--hs-hz)]" />
          </div>
        </div>
        <div data-ride="" data-head="" className="absolute inset-0 will-change-transform">
          <h1 className="sr-only">{lines.join(" ")}</h1>
          <div data-above="" aria-hidden className={`${head} bottom-[calc(100%_-_var(--hs-hz))] pb-[0.03em]`}>
            {up.map((line, i) => lineMask(line, i))}
          </div>
          {down.length ? (
            <div data-below="" aria-hidden className={`${head} top-[var(--hs-hz)] pt-[0.03em]`}>
              {down.map((line, i) => lineMask(line, i))}
            </div>
          ) : null}
        </div>
      </div>
      <Caption {...caption} />
    </section>
  );
}
