"use client";
// hero-split (Struq hero recipe)
// The first screen in two halves, and one headline that crosses them. A little under half is the page ground with the
// studio's name small at the top and a line and a link at the foot; the rest is a tall photograph edge to edge to the
// top, the outer side and the bottom. Across both runs the headline, fitted to about seventy percent of the screen:
// "Wij bouwen" and a last word that cycles through the studio's disciplines ("huizen.", "interieurs.", "tuinen."),
// one word rising out of its mask as the next rises in. It is set twice in the same place: in the ink where it stands
// on the ground, in the photo ink where it runs over the photograph, each copy clipped to its half in whole pixels, so
// the line reads as one and changes on both halves at once. Each discipline has its own photograph; the next is
// uncovered from the bottom edge over the last, at full size (registration), in step with the word, and each carries
// its own light veil, the weakest that gives the headline 3:1 over that photo. On scroll the photograph runs at its
// own speed and the type leaves first.
//
// <HeroSplit name="Noord" lead="Wij bouwen" items={[{ word: "huizen.", image }, { word: "interieurs.", image }, ...]}
//   line="Aan de Maashaven in Rotterdam." link={{ href: "/werk", label: "Bekijk het werk" }} />
//
// One clock: the words (in every copy) and the photos are tweens in one looping timeline, so they can never drift; it
// starts once every photograph is decoded and pauses off screen or in a hidden tab. The cycling words share one grid
// cell, so a change of word never moves anything; the headline is fitted with the loaded face and refit when it lands
// (a late refit eases to the new size instead of jumping). The photo box carries data-stack-target and the enlarged
// layer data-stack-photo, for the stack preloader and page transition; the entrance waits for whenUncovered and reads
// its own fallback clock (blocks.css, "--- hero-split ---"). Phones: the photo on top at about 60svh, the headline
// under it on the ground, the cycle kept. Reduced motion: no cycle, the first word and its photo. Without scripts: the
// same still, the seam at its share of the width.
//
// Three variants of the one idea, the headline set twice across a seam:
// - naad (default): as above, the seam upright, the ground on one side and the photograph on the other.
// - liggend: the seam lies down. The photograph takes the top of the screen edge to edge, the ground the foot with the
//   name, the line and the link in one row, and the headline stands on the seam so that it cuts through the cycling
//   word: each new word rises out of the ground ink into the photo ink. The type leaves on scroll, the headline and
//   the seam stay together.
// - opening: at rest the ground holds nearly the whole screen and the photograph is a strip at the outer edge, the
//   headline almost wholly in the ink. The hero holds for the first scroll, which opens the photograph's window toward
//   the split (the photo stays at full size behind it, so nothing scales), and the headline turns to the photo ink as
//   the edge passes under it; scrolling back closes it. Phones, reduced motion and no scripts: the split.
import Image from "next/image";
import { useRef } from "react";
import { ScrollTrigger, gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances } from "../kit/photo-read";
import { covered, whenUncovered } from "../preloaders/preloader-slices-uncovered";

type Item = {
  word: string;
  image: StruqImage;
  /** Where the photo sits in its box (CSS object-position), so a calm part can run under the headline. */
  focus?: string;
};

type Props = {
  /** The studio's name, small at the top of the type side. */
  name: string;
  /** The headline's first line; the cycling word completes it. */
  lead: string;
  /** Two to five disciplines, each with its photograph. */
  items: Item[];
  /** One short line at the foot of the type side. */
  line?: string;
  link: { href: string; label: string };
  /** Which side the photograph takes on wide screens. */
  photo?: "left" | "right";
  /** The composition; the first is the default. */
  variant?: HeroSplitVariant;
  className?: string;
};

export const HERO_SPLIT_VARIANTS = [
  { id: "naad", title: "Staande naad" },
  { id: "liggend", title: "Liggende naad" },
  { id: "opening", title: "Opening" },
] as const;

export type HeroSplitVariant = (typeof HERO_SPLIT_VARIANTS)[number]["id"];

/** Opening: the strip at rest, as a share of the photograph's full width (16% of the screen out of 58%). */
const CLOSED = 16 / 58;

const T = {
  hold: 2.6, // how long a word and its photo stay
  change: 0.95, // the word swap and the photo wipe, together
  span: 0.7, // the headline's widest line, as a share of the screen width
  maxSize: 190, // the headline never grows past this (px)
} as const;

/** Where a waiting word sits (yPercent): past the mask's descender padding, so not a sliver of it shows. */
const AWAY = 140;
const RATIO = 3; // display-size type over the photograph
const MAX_VEIL = 0.3; // past this a photo reads dulled: pick a calmer photo or focus instead

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

/** The weakest veil (composited in sRGB, as the browser does) that brings `under` to RATIO against `ink`. */
function veilFor(under: number, ink: number, veilS: number): number {
  if (contrast(under, ink) >= RATIO) return 0;
  const s = encode(under);
  const ok = (a: number) => contrast(linear(s * (1 - a) + veilS * a), ink) >= RATIO;
  if (!ok(1)) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function HeroSplit({ name, lead, items, line, link, photo = "right", variant = "naad", className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const left = photo === "left";
  const flat = variant === "liggend";
  const opening = variant === "opening";

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const wide = window.matchMedia("(min-width: 768px)");
      const column = q("[data-type]")[0] as HTMLElement;
      const box = q("[data-photo-box]")[0] as HTMLElement;
      // The photograph's grid cell: the box itself, except in the opening, where the box is a window inside it.
      const cell = q("[data-photo-cell]")[0] as HTMLElement;
      const drift = q("[data-drift]")[0] as HTMLElement;
      const ground = q('[data-copy="ground"]')[0] as HTMLElement;
      const over = q('[data-copy="photo"]')[0] as HTMLElement;
      const mobile = q('[data-copy="phone"]')[0] as HTMLElement;
      const layers = q("[data-layer]") as HTMLElement[];
      const veils = q("[data-veil]") as HTMLElement[];
      const rise = q("[data-rise]");
      const n = items.length;
      const wordsAt = (i: number) => q(`[data-word="${i}"]`) as HTMLElement[];

      // The seam, and the two copies clipped to their halves in whole pixels.
      const seam = () => {
        const s = el.getBoundingClientRect();
        const p = box.getBoundingClientRect();
        if (flat) {
          // Lying down: the ground copy below the photograph's foot, the photo copy above it.
          const y = Math.round(p.bottom - s.top);
          const h = Math.round(s.height);
          ground.style.clipPath = `inset(${y}px 0px 0px 0px)`;
          over.style.clipPath = `inset(0px 0px ${h - y}px 0px)`;
          return;
        }
        const x = Math.round((left ? p.right : p.left) - s.left);
        const w = Math.round(s.width);
        ground.style.clipPath = left ? `inset(0px 0px 0px ${x}px)` : `inset(0px ${w - x}px 0px 0px)`;
        over.style.clipPath = left ? `inset(0px ${w - x}px 0px 0px)` : `inset(0px 0px 0px ${x}px)`;
      };

      // The opening: the window's width in whole pixels, from the strip (0) to the whole cell (1); the photograph
      // behind it keeps the cell's full width, anchored to the outer edge, so it is uncovered, never scaled. Phones
      // and reduced motion show the split.
      const open = { p: opening && !reduce ? 0 : 1 };
      const openUp = () => {
        if (opening && wide.matches) {
          const full = cell.clientWidth;
          box.style.width = `${Math.round(full * (CLOSED + (1 - CLOSED) * open.p))}px`;
          drift.style.width = `${full}px`;
        } else if (opening) {
          box.style.width = "";
          drift.style.width = "";
        }
        seam();
      };

      // The headline fitted with the face in use: on wide screens its widest line spans T.span of the screen, on
      // phones it fills the type column. A refit after the type has been seen eases to the new size.
      let shownOnce = false;
      const fitTo = (stage: HTMLElement, avail: number) => {
        const h = stage.querySelector("h1, [data-head]") as HTMLElement;
        const lines = Array.from(stage.querySelectorAll<HTMLElement>("[data-fit]"));
        const was = h.style.fontSize;
        h.style.fontSize = "100px";
        const widest = Math.max(0, ...lines.map((f) => f.scrollWidth));
        h.style.fontSize = was;
        if (widest <= 0) return T.maxSize; // hidden at this width: the other copy is the one in use
        return Math.max(24, Math.min(T.maxSize, Math.floor((avail / widest) * 100 * 0.99)));
      };
      const sizes = { wide: 0, phone: 0 };
      const fit = (ease = false) => {
        const cs = getComputedStyle(column);
        // Lying down, the two lines (0.92 each) also stay within about half the screen's height.
        const wideSize = Math.min(
          fitTo(ground, el.clientWidth * T.span),
          flat ? Math.floor((el.clientHeight * 0.48) / 1.84) : T.maxSize,
        );
        const phoneSize = fitTo(mobile, column.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
        const apply = () => {
          el.style.setProperty("--hsp-size", `${sizes.wide}px`);
          el.style.setProperty("--hsp-phone", `${sizes.phone}px`);
          openUp();
        };
        if (ease && shownOnce && sizes.wide && !reduce) {
          gsap.to(sizes, {
            wide: wideSize,
            phone: phoneSize,
            duration: 0.65,
            ease: "power3.inOut",
            onUpdate: apply,
          });
        } else {
          sizes.wide = wideSize;
          sizes.phone = phoneSize;
          apply();
        }
      };

      // The entrance, decided by this element's own fallback clock (it starts when the element is styled).
      const clock = rise[0]?.getAnimations().find((a) => (a as CSSAnimation).animationName === "struq-hsp-rise");
      el.dataset.shown ??= String(
        reduce || (clock ? Number(clock.currentTime ?? 0) >= 2900 : getComputedStyle(rise[0]).transform === "none"),
      );
      const shown = el.dataset.shown === "true";
      shownOnce = shown;
      // A late script meets type already shown at the safe size: it eases to the fitted size.
      if (shown) {
        const cs = getComputedStyle(ground.querySelector("[data-head]") as HTMLElement);
        sizes.wide = parseFloat(cs.fontSize);
        const pcs = getComputedStyle(mobile.querySelector("h1") as HTMLElement);
        sizes.phone = parseFloat(pcs.fontSize);
      }
      fit(shown);
      gsap.set(rise, { y: 0, yPercent: shown ? 0 : 115 });
      el.dataset.ready = "";
      const refit = () => fit(true);
      document.fonts?.ready.then(() => {
        refit();
        ScrollTrigger.refresh();
      });
      document.fonts?.addEventListener?.("loadingdone", refit);
      const resize = new ResizeObserver(() => fit(false));
      resize.observe(el);

      // Each photograph's own ink and veil. Two ways to give the headline 3:1 where it runs over a photo: the photo ink
      // (light) over a veil of the ground held dark, or the palette's dark (the ink on a light palette, the ground on a
      // dark one) over a veil of its light. Per photo the weaker veil wins, never past MAX_VEIL; a photo that needs
      // more is reported in development, not hidden under a grey. Phones carry no veil: the headline is not on the photo.
      const inks: string[] = [];
      let darkVeil = "";
      const grade = () => {
        if (!wide.matches) {
          veils.forEach((v) => (v.style.opacity = "0"));
          return;
        }
        const css = getComputedStyle(el);
        const photoInk = css.getPropertyValue("--on-photo").trim() || getComputedStyle(over).color;
        const inkToken = css.getPropertyValue("--ink").trim() || css.color;
        const groundToken = css.getPropertyValue("--surface-0").trim() || css.backgroundColor;
        const inkIsDark = luminanceOf(inkToken) < luminanceOf(groundToken);
        const groundInk = inkIsDark ? inkToken : groundToken;
        const groundColor = inkIsDark ? groundToken : inkToken;
        darkVeil ||= getComputedStyle(veils[0]).backgroundColor;
        // The whole cell: in the opening the headline runs over all of it once the window is open.
        const pr = cell.getBoundingClientRect();
        const lines = Array.from(over.querySelectorAll<HTMLElement>("[data-fit]"));
        const frame = drift.getBoundingClientRect();
        const ways = [
          { ink: photoInk, veil: darkVeil },
          { ink: groundInk, veil: groundColor },
        ].map((w) => ({ ...w, inkY: luminanceOf(w.ink), veilS: encode(luminanceOf(w.veil)) }));
        layers.forEach((layer, i) => {
          const img = layer.querySelector("img") as HTMLImageElement;
          const ys: number[] = [];
          for (const ln of lines) {
            const r = ln.getBoundingClientRect();
            // The line's mask is untransformed (the rise moves what is inside it), so it gives the true height.
            const m = (ln.parentElement?.parentElement ?? ln).getBoundingClientRect();
            const x0 = Math.max(r.left, pr.left);
            const x1 = Math.min(r.right, pr.right);
            // Lying down, only the part of a line above the seam is on the photograph.
            const y0 = Math.max(m.top, pr.top);
            const y1 = Math.min(m.bottom, pr.bottom);
            if (x1 <= x0 || y1 <= y0) continue;
            const read = photoLuminances(
              img,
              { x: frame.left, y: frame.top, w: frame.width, h: frame.height },
              { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
            );
            if (!read) return; // cannot be read: the safe CSS veil and ink stay
            ys.push(...read);
          }
          if (!ys.length) return;
          ys.sort((a, b) => a - b);
          const hi = ys[Math.floor(ys.length * 0.9)];
          const lo = ys[Math.floor(ys.length * 0.1)];
          // A light ink must hold over the photo's bright end, a dark ink over its dark end.
          const needs = ways.map((w) => veilFor(w.inkY > 0.18 ? hi : lo, w.inkY, w.veilS));
          const k = needs[0] <= needs[1] ? 0 : 1;
          if (needs[k] > MAX_VEIL && process.env.NODE_ENV !== "production") {
            console.warn(
              `hero-split: ${img.currentSrc || img.src} needs a veil of ${needs[k].toFixed(2)} (photo ink ${needs[0].toFixed(2)}, ground ink ${needs[1].toFixed(2)}); held at ${MAX_VEIL}. Pick a calmer photo or a focus.`,
            );
          }
          graded[i] = Math.min(MAX_VEIL, needs[k]);
          // What each way needed, on the veil itself, for whoever picks this photo to check.
          veils[i].dataset.need = needs.map((v) => v.toFixed(2)).join(" ");
          inks[i] = ways[k].ink;
          veils[i].style.backgroundColor = ways[k].veil;
        });
        if (inks[0]) gsap.set(over, { color: inks[0] });
        cycle.invalidate();
        if (!held) veils.forEach((v, i) => graded[i] !== undefined && (v.style.opacity = graded[i]!.toFixed(3)));
      };
      // Under a preloader the photograph shows bare, as the preloader's own print of it lands; the veils settle in once
      // the cover has really gone, so the landing never darkens in one frame.
      const graded: (number | undefined)[] = [];
      let held = covered();
      if (held) veils.forEach((v) => Object.assign(v.style, { transition: "none", opacity: "0" }));
      const settle = () => {
        if (!held) return;
        held = false;
        veils.forEach((v, i) => {
          v.style.transition = "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)";
          v.style.opacity = graded[i] !== undefined ? graded[i]!.toFixed(3) : "";
        });
      };

      // The photo windows, written from numbers in whole pixels: each layer's hidden share from the top.
      const hidden = layers.map((_, i) => ({ v: i === 0 ? 0 : 1 }));
      const paint = () => {
        const h = layers[0].clientHeight;
        layers.forEach((l, i) => {
          l.style.clipPath = `inset(${Math.round(hidden[i].v * h)}px 0px 0px 0px)`;
        });
      };
      paint();
      for (let i = 0; i < n; i += 1) gsap.set(wordsAt(i), { y: 0, yPercent: i === 0 ? 0 : AWAY });

      // One clock for words and photos. Change k runs from item k to item k+1 at k * period + hold.
      const period = T.hold + T.change;
      const cycle = gsap.timeline({ paused: true, repeat: -1 });
      for (let k = 0; k < n; k += 1) {
        const cur = k;
        const next = (k + 1) % n;
        const at = k * period + T.hold;
        cycle
          .set(layers, { zIndex: (i: number) => (i === next ? 2 : i === cur ? 1 : 0) }, at)
          .set(hidden[next], { v: 1, onComplete: paint }, at)
          .to(hidden[next], { v: 0, duration: T.change, ease: "power3.inOut", onUpdate: paint }, at)
          // The photo copy takes the next photo's ink on the same clock as its wipe.
          .to(over, { color: () => inks[next] ?? inks[cur] ?? "", duration: T.change, ease: "power3.inOut" }, at)
          .to(
            wordsAt(cur),
            {
              yPercent: -AWAY,
              duration: T.change * 0.85,
              ease: "power3.inOut",
            },
            at,
          )
          .fromTo(
            wordsAt(next),
            { yPercent: AWAY },
            {
              yPercent: 0,
              duration: T.change * 0.85,
              ease: "power3.inOut",
              immediateRender: false,
            },
            at + T.change * 0.15,
          );
      }
      cycle.set({}, {}, n * period); // the loop's length, exactly n periods

      // Runs only while the hero is on screen and the tab visible, and only once every photograph is decoded.
      let decoded = false;
      let entered = shown || reduce;
      let onScreen = true;
      const sync = () => {
        const go = decoded && entered && onScreen && !document.hidden && !reduce && n > 1;
        if (go) cycle.play();
        else cycle.pause();
      };
      let gone = false;
      Promise.all(
        layers.map((l) =>
          l
            .querySelector("img")
            ?.decode()
            .catch(() => undefined),
        ),
      ).then(() => {
        if (gone) return;
        decoded = true;
        grade();
        sync();
      });
      const io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        sync();
      });
      io.observe(el);
      const onVis = () => sync();
      document.addEventListener("visibilitychange", onVis);
      const onWide = () => {
        fit(false);
        grade();
      };
      wide.addEventListener("change", onWide);

      let cancel = () => {};
      if (!shown) {
        // The cover has started to leave; the type rises (and the veils settle) once nothing covers the photo any more,
        // at most 1.6s later.
        let watch = 0;
        const free = () => {
          const p = box.getBoundingClientRect();
          const hit = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2);
          return !hit || el.contains(hit);
        };
        const play = contextSafe(() => {
          shownOnce = true;
          gsap.to(rise, {
            yPercent: 0,
            duration: 1.1,
            ease: "expo.out",
            stagger: 0.06,
            delay: 0.1,
            onComplete: () => {
              entered = true;
              sync();
            },
          });
        });
        const stop = whenUncovered(() => {
          const until = performance.now() + 1600;
          const look = () => {
            if (gone) return;
            if (free() || performance.now() > until) {
              settle();
              play();
            } else watch = requestAnimationFrame(look);
          };
          look();
        });
        cancel = () => {
          stop();
          cancelAnimationFrame(watch);
        };
      } else {
        settle();
        sync();
      }

      // The opening: the hero holds while the first scroll opens the window, scrubbed, so scrolling back closes it.
      if (opening && !reduce && wide.matches) {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: () => `+=${Math.round(window.innerHeight * 0.9)}`,
              pin: true,
              scrub: 0.3,
              invalidateOnRefresh: true,
            },
          })
          .to(open, { p: 1, ease: "power2.inOut", duration: 1, onUpdate: openUp });
      } else if (flat && !reduce) {
        // Lying down the headline stands on the seam, so it travels with the photograph's edge; the photo runs slower
        // inside its box and the foot row leaves first.
        gsap
          .timeline({
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom top",
              scrub: 0.4,
            },
          })
          .to(drift, { yPercent: 10, ease: "none" }, 0)
          .to(column, { yPercent: -16, ease: "none", duration: 0.6 }, 0);
      } else if (!reduce) {
        // The hand-over: the photograph runs slower than the page, the type and the headline leave first.
        gsap
          .timeline({
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom top",
              scrub: 0.4,
            },
          })
          .to(drift, { yPercent: 10, ease: "none" }, 0)
          .to([column, q("[data-stage]")[0]], { yPercent: -16, ease: "none", duration: 0.6 }, 0);
      }

      return () => {
        gone = true;
        cancel();
        io.disconnect();
        resize.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        document.fonts?.removeEventListener?.("loadingdone", refit);
        wide.removeEventListener("change", onWide);
      };
    },
    { scope: root, dependencies: [variant] },
  );

  const mask = (child: React.ReactNode, key?: number | string) => (
    <span key={key} className="struq-line-mask block overflow-hidden">
      <span data-rise="" className="block">
        {child}
      </span>
    </span>
  );

  // The headline's two lines; the cycling words share one grid cell, so the line is as wide as the widest.
  const headline = (copy: string) => (
    <>
      {mask(
        <span data-fit="" className="inline-block whitespace-nowrap">
          {lead}
        </span>,
        `${copy}-lead`,
      )}
      {mask(
        <span data-fit="" className="struq-line-mask inline-grid overflow-hidden whitespace-nowrap align-top">
          {items.map((item, i) => (
            <span
              key={item.word}
              data-word={i}
              aria-hidden={i === 0 ? undefined : true}
              className="[grid-area:1/1]"
              style={i === 0 ? undefined : { transform: `translateY(${AWAY}%)` }}
            >
              {item.word}
            </span>
          ))}
        </span>,
        `${copy}-words`,
      )}
    </>
  );

  // Lying down the headline stands on the seam (58% down) and the seam cuts the cycling word through its middle.
  const headClass = `font-display absolute ${
    flat ? "top-[calc(58%-1.45em)]" : "bottom-[calc(5vh+5.5rem)]"
  } leading-[0.92] tracking-[-0.035em] text-[length:var(--hsp-size,9vw)] px-[4vw] left-0`;

  const grid = flat
    ? "md:grid-cols-1 md:grid-rows-[58fr_42fr]"
    : `md:grid-rows-1 ${left ? "md:grid-cols-[58fr_42fr]" : "md:grid-cols-[42fr_58fr]"}`;
  const photoPlace = flat ? "md:col-start-1 md:row-start-1" : left ? "md:col-start-1" : "md:col-start-2";

  // The photograph's layers: each discipline's photo at full size with its own veil; the next is uncovered over the
  // last from the bottom edge. In the opening the layer is anchored to the outer edge at the cell's width.
  const photos = (
    <div
      data-drift=""
      data-stack-photo=""
      className={`absolute -bottom-[6%] -top-[6%] ${opening ? (left ? "left-0 w-full" : "right-0 w-full") : "inset-x-0"}`}
    >
      {items.map((item, i) => (
        <div
          key={item.word}
          data-layer=""
          className="absolute inset-0"
          style={i === 0 ? { zIndex: 2 } : { clipPath: "inset(100% 0px 0px 0px)", zIndex: 0 }}
        >
          <Image
            src={item.image.src}
            alt={i === 0 ? item.image.alt : ""}
            fill
            priority={i === 0}
            loading={i === 0 ? undefined : "eager"}
            sizes={flat ? "100vw" : "(min-width: 768px) 58vw, 100vw"}
            unoptimized={item.image.unoptimized}
            className="object-cover"
            style={item.focus ? { objectPosition: item.focus } : undefined}
          />
          <div data-veil="" aria-hidden="true" className="absolute inset-0" />
        </div>
      ))}
    </div>
  );

  // The two copies' first clips, before the script writes the seam in whole pixels.
  const groundClip = flat ? "inset(58% 0 0 0)" : left ? "inset(0 0 0 58%)" : "inset(0 58% 0 0)";
  const photoClip = flat ? "inset(0 0 42% 0)" : left ? "inset(0 42% 0 0)" : "inset(0 0 0 42%)";

  return (
    <section
      ref={root}
      data-hero-split=""
      data-variant={variant}
      data-photo={photo}
      suppressHydrationWarning
      className={`relative grid min-h-svh grid-rows-[60svh_auto] overflow-hidden bg-surface-0 text-ink md:h-svh md:min-h-[34rem] ${grid} ${className}`}
    >
      {/* The type side: the name at the top, the line and link at the foot; on phones the headline between them.
          Lying down, the name, the line and the link share one row at the foot. */}
      <div
        data-type=""
        className={`row-start-2 flex flex-col justify-between gap-8 px-6 pb-8 pt-7 md:px-[4vw] md:pb-[5vh] md:pt-[4vh] ${
          flat ? "md:col-start-1 md:row-start-2 md:flex-row md:items-end" : `md:row-start-1 ${left ? "md:col-start-2" : "md:col-start-1"}`
        }`}
      >
        <div className="text-small">{mask(name, "name")}</div>
        <div data-copy="phone" className="md:hidden">
          <h1 className="font-display text-[length:var(--hsp-phone,13vw)] leading-[0.92] tracking-[-0.035em]">
            {headline("phone")}
          </h1>
        </div>
        <div className="text-small flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          {line ? mask(<span className="text-ink-muted">{line}</span>, "line") : null}
          {mask(
            <a href={link.href} className="underline decoration-1 underline-offset-4">
              {link.label}
            </a>,
            "link",
          )}
        </div>
      </div>

      {/* The photograph: edge to edge to the top, the outer side and the bottom (lying down: the top and both
          sides). In the opening the box is a window inside the cell, as wide as the script opens it; the preloader
          lands on the window. */}
      {opening ? (
        <div data-photo-cell="" className={`relative row-start-1 ${photoPlace}`}>
          <div
            data-photo-box=""
            data-stack-target=""
            className={`absolute inset-y-0 w-full overflow-hidden ${left ? "left-0" : "right-0"}`}
          >
            {photos}
          </div>
        </div>
      ) : (
        <div
          data-photo-cell=""
          data-photo-box=""
          data-stack-target=""
          className={`relative row-start-1 overflow-hidden ${photoPlace}`}
        >
          {photos}
        </div>
      )}

      {/* The headline across the seam, wide screens: one copy in the ink, clipped to the ground; one in the photo ink,
          clipped to the photograph. Only the first is read. */}
      <div data-stage="" className="pointer-events-none absolute inset-0 z-10 hidden md:block">
        <div
          data-copy="ground"
          className="absolute inset-0 text-ink"
          style={{ clipPath: groundClip }}
        >
          <h1 data-head="" className={headClass}>
            {headline("ground")}
          </h1>
        </div>
        <div
          data-copy="photo"
          aria-hidden="true"
          className="absolute inset-0 text-on-photo"
          style={{ clipPath: photoClip }}
        >
          <div data-head="" className={headClass}>
            {headline("photo")}
          </div>
        </div>
      </div>
    </section>
  );
}
