"use client";
// cta-closing (Struq section recipe)
// The page's last screen before the footer: one line at display size in a light weight (two or three short lines) and
// one link that is plainly the action without being a button: large type, an arrow, and a line under it that draws
// when the pointer comes. Nothing else. Three compositions:
//
// - photo: a photograph opens behind the line by registration as the section arrives (a layer already at full size
//   whose clip opens from a centred window to full bleed, never a scale). The line stands on the photo's calmest corner
//   over a light veil, all chosen by reading the photo: the side (left or right), the height (top or bottom), the ink
//   (light or dark) and the veil's strength are whichever need the weakest veil that holds the line at 3:1 and the
//   link at 4.5:1, never past 0.45, on the least busy ground.
// - marquee: the line runs as one slow band across the full width, a faint backdrop in the muted ink drawn far toward
//   the ground; the reader's scroll speed nudges it faster and it settles back to its own pace when the reader stops.
//   The link stands still at the centre in front of it, in the full ink.
// - pointer: plain ground, the line large and still. The link is the event: hovering it brings a small framed project
//   below and beside the pointer, into the empty ground under the link, following it within about 0.18 s, and the
//   link's line draws. On touch the frame stands beside the link from the start; with the keyboard it opens beside the
//   link's end on focus, hanging down from its top.
//
// <CtaClosing variant="photo" lines={["Heb je een plek", "die beter kan?"]} link={{ href: "#gesprek", label: "Plan een
//   gesprek" }} image={images.hero[2]} />
//
// Every arrival is scrubbed to the scroll over a short stretch with 0.4 s of smoothing, so scrolling back runs it
// backwards. Transforms are written in whole pixels and every clip from plain numbers. Each photograph is decoded
// before it can show. The line is sized to fit its column with the display face it is read in (the fit waits for the
// fonts, capped, and runs again on resize). Start states wait behind the `.js` / `.sq-js` gate with a 3 s CSS fallback
// (blocks.css, "--- cta-closing ---"). Reduced motion: the composed screen; the band is set as still lines and the
// project frame stands beside the link without following.
import Image from "next/image";
import { useId, useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances } from "../kit/photo-read";

export const CTA_CLOSING_VARIANTS = [
  { id: "photo", title: "Foto" },
  { id: "marquee", title: "Band" },
  { id: "pointer", title: "Aanwijzer" },
] as const;

export type CtaClosingVariant = (typeof CTA_CLOSING_VARIANTS)[number]["id"];

type Props = {
  variant?: CtaClosingVariant;
  /** The line, as the two or three short lines it is set in. Plain text. */
  lines: string[];
  /** The one action. */
  link: { href: string; label: string };
  /** photo: the photograph behind the line. pointer: the project in the frame. Not used by marquee. */
  image?: StruqImage;
  /** pointer: a short caption under the project frame (its name and place). */
  caption?: string;
  className?: string;
};

/** Seconds of smoothing on every scrub: a camera settling, never a delay. */
const SMOOTH = 0.4;
/** The longest the fit waits for the display face, in ms. */
const FONT_CAP = 1200;
/** A line travels this share of its own height to its place. */
const RISE = 1.12;
/** The link's soft rise, in px. */
const SOFT = 24;
/** The photo's opening window: the share of the frame shut above and below it, and at each side (wide, narrow). */
const WINDOW = { y: 29, wide: 35, narrow: 18 };
/** The largest the line is set, in px, and the smallest. */
const SIZE = { max: 224, min: 36 };
/** Contrast: display type holds 3:1, the link holds 4.5:1; the veil never goes past 0.45. */
const HEAD_RATIO = 3;
const LINK_RATIO = 4.5;
const MAX_VEIL = 0.45;
/** The band's own pace (px/s; one whole pixel a frame at 60 Hz), the share of the scroll's speed it adds, the most
 * scroll speed it answers, and the time constant that settles it once the reader stops. */
const BAND = { pace: 60, gain: 0.45, fast: 2400, tau: 0.16 };
/** Copies of the band's line: enough to cover any screen twice. */
const COPIES = 4;
/** The project frame's follow: a time constant of 0.06 s puts it within 5% of the pointer in 0.18 s. */
const FOLLOW_TAU = 0.06;
/** How far beside the pointer the frame stands, in px. */
const GAP = 28;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Where p sits inside the window [from, to], as 0 to 1. */
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out3 = gsap.parseEase("power3.out");
const out2 = gsap.parseEase("power2.out");
const inOut3 = gsap.parseEase("power3.inOut");

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
 * The weakest veil (composited in sRGB, as the browser does) that brings `under` to `ratio` against `ink`, with a
 * score: the veil itself when it reaches the ratio, one more than the cap when even the cap falls short.
 */
function veilFor(under: number, ink: number, veilS: number, ratio: number): number {
  if (contrast(under, ink) >= ratio) return 0;
  const s = encode(under);
  const ok = (a: number) => contrast(linear(s * (1 - a) + veilS * a), ink) >= ratio;
  if (!ok(MAX_VEIL)) return 1 + MAX_VEIL;
  let lo = 0;
  let hi = MAX_VEIL;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Resolves once the photograph is loaded and decoded (or failed), never before. */
function decoded(img: HTMLImageElement) {
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise<void>((res) => {
        img.addEventListener("load", () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      });
  return loaded.then(() => img.decode()).catch(() => undefined);
}

/** The display face, waited for at most FONT_CAP ms. */
function faceReady() {
  const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
  return Promise.race([fonts ?? Promise.resolve(), new Promise((res) => window.setTimeout(res, FONT_CAP))]);
}

/** Staggered windows for n items inside 0 to 1: each runs `span`, the last one ends at 1. */
function windows(n: number, span: number) {
  if (n <= 1) return [[0, 1]];
  const step = (1 - span) / (n - 1);
  return Array.from({ length: n }, (_, i) => [i * step, i * step + span]);
}

export function CtaClosing({ variant = "photo", lines, link, image, caption, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const titleId = useId();
  const first = image?.negativeSpace === "right" ? "right" : "left";

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const kind = (el.dataset.ctaClosing ?? "photo") as CtaClosingVariant;
      const q = <T extends HTMLElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
      const masks = q("[data-cc-mask]");
      // The band's line is words for screen readers (and still lines under reduced motion); it never rises.
      const rows = kind === "marquee" ? [] : q("[data-cc-line]");
      const texts = q("[data-cc-text]");
      const softs = q("[data-cc-soft]");
      const copy = el.querySelector<HTMLElement>("[data-cc-copy]");
      const ink = el.querySelector<HTMLElement>("[data-cc-ink]");
      const frame = el.querySelector<HTMLElement>("[data-cc-frame]");
      const veil = el.querySelector<HTMLElement>("[data-cc-veil]");
      const linkEl = el.querySelector<HTMLElement>("[data-cc-link]");
      const bandRow = el.querySelector<HTMLElement>("[data-cc-bandrow]");
      const band = el.querySelector<HTMLElement>("[data-cc-band]");
      const float = el.querySelector<HTMLElement>("[data-cc-float]");
      const pics = q("[data-cc-pic]");

      // Every photograph shows only once it is decoded (the CSS holds it clear, and shows it after 3 s whatever
      // happens). The photo variant's own clip waits on the same promise.
      let gone = false;
      const ready = new Map<HTMLElement, Promise<void>>();
      for (const pic of pics) {
        const img = pic.querySelector("img");
        if (!img) continue;
        img.loading = "eager";
        const p = decoded(img).then(() => {
          if (!gone) pic.dataset.shown = "1";
        });
        ready.set(pic, p);
      }

      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 768px)",
          reduce: "(prefers-reduced-motion: reduce)",
          fine: "(hover: hover) and (pointer: fine)",
        },
        (ctx) => {
          const { wide, reduce, fine } = ctx.conditions as { wide: boolean; reduce: boolean; fine: boolean };
          let alive = true;
          const undo: (() => void)[] = [];

          // Progress of each scrubbed stretch, 0 to 1, and the photograph's decode gate (0 until it is decoded).
          const prog = { photo: 0, type: 0, soft: 0, band: 0 };
          const gate = { v: 0 };
          let heights: number[] = [];
          let bandH = 0;
          let bandW = 1;

          /** The line is set as large as its column allows with the face it is read in, and no taller than the
           * screen can hold beside the link. */
          const fit = () => {
            if (!copy || texts.length === 0) return;
            if (kind === "marquee" && !reduce) return;
            el.style.setProperty("--cc-size", "100px");
            el.dataset.fit = "1";
            const widest = Math.max(1, ...texts.map((t) => t.offsetWidth));
            const room = copy.clientWidth;
            const byWidth = (room / widest) * 100 * 0.98;
            const share = kind === "photo" ? 0.46 : kind === "pointer" ? 0.44 : 0.54;
            const byHeight = (window.innerHeight * share) / texts.length;
            const size = Math.max(SIZE.min, Math.min(byWidth, byHeight, SIZE.max));
            el.style.setProperty("--cc-size", `${Math.floor(size)}px`);
          };

          const measure = () => {
            heights = rows.map((r) => r.offsetHeight);
            bandH = bandRow?.offsetHeight ?? 0;
            const firstCopy = band?.querySelector<HTMLElement>("[data-cc-copyband]");
            bandW = Math.max(1, firstCopy?.offsetWidth ?? 1);
          };

          // ---- The photo: side, ink and veil read from the photograph. ----
          const img = frame?.querySelector("img") ?? null;
          let photoIn = false;
          let graded = false;
          const grade = () => {
            if (kind !== "photo" || !img || !veil || !ink || !frame || !photoIn) return;
            const from = frame.getBoundingClientRect();
            const fb = { x: from.left, y: from.top, w: from.width, h: from.height };
            const boxes = () => {
              const out = masks.map((m, i) => {
                const mr = m.getBoundingClientRect();
                const tr = texts[i]?.getBoundingClientRect() ?? mr;
                return { x: tr.left, y: mr.top, w: tr.width, h: mr.height };
              });
              const lr = linkEl?.getBoundingClientRect();
              return { lines: out, link: lr ? { x: lr.left, y: lr.top, w: lr.width, h: lr.height } : null };
            };
            /** The veil an ink needs where the copy stands now, and how busy the photo is under the line (the spread of
             * its middle eight tenths, perceptual): a place is chosen by both, so the line lands on calm ground and not
             * on a trunk or a stone edge that a percentile would let through. */
            const score = (inkName: string, b: ReturnType<typeof boxes>) => {
              el.dataset.ink = inkName;
              const inkL = luminanceOf(getComputedStyle(ink).color);
              const veilS = encode(luminanceOf(getComputedStyle(veil).backgroundColor));
              // Light ink fears the photo's brightest twentieth under it, dark ink its darkest.
              const at = inkName === "light" ? 0.95 : 0.05;
              const nth = (ys: number[], share: number) => ys[Math.min(ys.length - 1, Math.floor(ys.length * share))];
              const all: number[] = [];
              for (const box of b.lines) {
                const ys = photoLuminances(img, fb, box);
                if (ys) all.push(...ys);
              }
              if (all.length === 0) return null;
              all.sort((x, y) => x - y);
              let need = veilFor(nth(all, at), inkL, veilS, HEAD_RATIO);
              const ls = b.link ? photoLuminances(img, fb, b.link) : null;
              if (ls) need = Math.max(need, veilFor(nth(ls, at), inkL, veilS, LINK_RATIO));
              const spread = encode(nth(all, 0.9)) - encode(nth(all, 0.1));
              return { need, rank: need + spread * 0.6 };
            };
            const wasSide = el.dataset.side ?? first;
            const wasV = el.dataset.v ?? "bottom";
            const wasInk = el.dataset.ink ?? "light";
            if (!graded) {
              // The first read chooses the side, the height and the ink, while the line is still unseen (the copy
              // waits for it).
              const sides = wide ? [wasSide, wasSide === "left" ? "right" : "left"] : [wasSide];
              const levels = [wasV, wasV === "bottom" ? "top" : "bottom"];
              let best: { side: string; v: string; ink: string; need: number; rank: number } | null = null;
              for (const side of sides) {
                for (const v of levels) {
                  el.dataset.side = side;
                  el.dataset.v = v;
                  const b = boxes();
                  for (const inkName of ["light", "dark"]) {
                    const s = score(inkName, b);
                    if (s === null) continue;
                    // Another choice only when it is clearly better; a tie keeps the photo's own calm side, the
                    // bottom and the light ink.
                    if (!best || s.rank < best.rank - 0.02) best = { side, v, ink: inkName, ...s };
                  }
                }
              }
              el.dataset.side = best?.side ?? wasSide;
              el.dataset.v = best?.v ?? wasV;
              el.dataset.ink = best?.ink ?? wasInk;
              if (best) veil.style.opacity = Math.min(best.need, MAX_VEIL).toFixed(3);
              graded = true;
              el.dataset.graded = "1";
            } else {
              const s = score(wasInk, boxes());
              el.dataset.ink = wasInk;
              if (s !== null) veil.style.opacity = Math.min(s.need, MAX_VEIL).toFixed(3);
            }
          };

          // ---- Painting every scrubbed state. ----
          const paint = () => {
            if (!alive || reduce) return;
            const spans = windows(rows.length, 0.66);
            rows.forEach((row, i) => {
              const e = out3(within(prog.type, spans[i][0], spans[i][1]));
              row.style.transform = `translate3d(0, ${Math.round((1 - e) * (heights[i] ?? 0) * RISE)}px, 0)`;
            });
            softs.forEach((s) => {
              const e = out2(prog.soft);
              s.style.transform = `translate3d(0, ${Math.round((1 - e) * SOFT)}px, 0)`;
              s.style.opacity = e.toFixed(3);
            });
            if (frame && kind === "photo") {
              // From a centred window to full bleed, and fully shut until the photograph is decoded.
              const e = inOut3(prog.photo);
              const wy = WINDOW.y * (1 - e);
              const wx = (wide ? WINDOW.wide : WINDOW.narrow) * (1 - e);
              const y = 50 - (50 - wy) * gate.v;
              const x = 50 - (50 - wx) * gate.v;
              frame.style.clipPath = `inset(${y.toFixed(3)}% ${x.toFixed(3)}% ${y.toFixed(3)}% ${x.toFixed(3)}%)`;
            }
            if (bandRow) {
              const e = out3(prog.band);
              bandRow.style.transform = `translate3d(0, ${Math.round((1 - e) * bandH * RISE)}px, 0)`;
            }
          };

          const scrub = (key: keyof typeof prog, start: string, end: string) => {
            gsap.to(prog, {
              [key]: 1,
              ease: "none",
              onUpdate: paint,
              scrollTrigger: { trigger: el, start, end, scrub: SMOOTH },
            });
          };

          if (!reduce) {
            if (kind === "photo") {
              scrub("photo", "top 90%", "top 10%");
              scrub("type", "top 55%", "top 10%");
              scrub("soft", "top 38%", "top 4%");
            } else if (kind === "marquee") {
              scrub("band", "top 82%", "top 28%");
              scrub("soft", "top 55%", "top 10%");
            } else {
              scrub("type", "top 72%", "top 16%");
              scrub("soft", "top 46%", "top 6%");
            }
          }

          // The photograph: once decoded, the window opens over a moment (or at once under reduced motion), and the
          // first read of the photo sets the side, the ink and the veil.
          if (kind === "photo" && frame) {
            const pic = frame.closest<HTMLElement>("[data-cc-pic]") ?? frame;
            (ready.get(pic) ?? Promise.resolve()).then(() =>
              faceReady().then(() => {
                if (!alive) return;
                photoIn = true;
                fit();
                measure();
                grade();
                if (reduce) return;
                gsap.to(gate, { v: 1, duration: 0.45, ease: "power2.out", onUpdate: paint });
              }),
            );
          } else if (kind === "photo") {
            el.dataset.graded = "1";
          }

          // ---- The band: a slow run at its own pace, nudged by the scroll's speed. ----
          if (kind === "marquee" && band && !reduce) {
            let near = false;
            const watch = ScrollTrigger.create({
              trigger: el,
              start: "top bottom+=100",
              end: "bottom top-=100",
              onToggle: (self) => {
                near = self.isActive;
              },
            });
            near = watch.isActive;
            let lastY = window.scrollY;
            let v = 0;
            let x = 0;
            const place = () => {
              band.style.transform = `translate3d(${Math.round(gsap.utils.wrap(-bandW, 0, x))}px, 0, 0)`;
            };
            const tick = (_t: number, deltaMs: number) => {
              const y = window.scrollY;
              const dt = Math.max(0.001, Math.min(0.1, deltaMs / 1000));
              const raw = gsap.utils.clamp(-BAND.fast, BAND.fast, (y - lastY) / dt);
              lastY = y;
              // Smoothed on a short time constant: no jitter, and back to its own pace soon after the reader stops.
              v += (Math.abs(raw) - v) * (1 - Math.exp(-dt / BAND.tau));
              if (v < 0.5) v = 0;
              if (!near) return;
              x -= (BAND.pace + v * BAND.gain) * dt;
              place();
            };
            gsap.ticker.add(tick);
            undo.push(() => {
              gsap.ticker.remove(tick);
              watch.kill();
              band.style.transform = "";
            });
          }

          // ---- The project frame: beside the pointer while it is over the link. ----
          if (kind === "pointer" && float && linkEl && fine) {
            const pic = float.querySelector<HTMLElement>("[data-cc-pic]") ?? float;
            const open = { o: 0 };
            let tx = 0;
            let ty = 0;
            let cx = 0;
            let cy = 0;
            let over = false;
            let following = false;
            let turn = 0;
            const paintFloat = () => {
              const e = open.o;
              // Opens from the top down; to the right the clip stands well clear, so the caption runs on past the
              // frame's width instead of being cut.
              float.style.clipPath = `inset(0% -240px ${((1 - e) * 100).toFixed(3)}% 0%)`;
            };
            const put = () => {
              float.style.transform = `translate3d(${Math.round(cx)}px, ${Math.round(cy)}px, 0)`;
            };
            /** Keeps a wanted place for the frame inside the section. */
            const keep = (x: number, y: number) => {
              const r = el.getBoundingClientRect();
              tx = gsap.utils.clamp(8, Math.max(8, r.width - float.offsetWidth - 8), x);
              ty = gsap.utils.clamp(8, Math.max(8, r.height - float.offsetHeight - 8), y);
            };
            /** Where the frame stands for a pointer at (px, py) in the section: just below it and a little to its
             * right, in the empty ground under the link and never higher than the link's own foot, so it covers
             * neither the line above nor the words the pointer is reading; to its left when the right has no room. */
            const aim = (px: number, py: number) => {
              const r = el.getBoundingClientRect();
              const l = linkEl.getBoundingClientRect();
              const fw = float.offsetWidth;
              let x = px + GAP * 0.5;
              if (x + fw > r.width - 8) x = px - GAP * 0.5 - fw;
              keep(x, Math.max(py + GAP * 0.6, l.bottom - r.top + 16));
            };
            /** Beside the link's end, its top level with the link's, hanging down into the empty ground: for the
             * keyboard and for reduced motion. */
            const aimAtLink = () => {
              const r = el.getBoundingClientRect();
              const l = linkEl.getBoundingClientRect();
              keep(l.right - r.left + GAP, l.top - r.top);
            };
            const tick = (_t: number, deltaMs: number) => {
              const dt = Math.max(0.001, Math.min(0.1, deltaMs / 1000));
              const k = 1 - Math.exp(-dt / FOLLOW_TAU);
              cx += (tx - cx) * k;
              cy += (ty - cy) * k;
              put();
              if (!over && open.o === 0) stop();
            };
            const start = () => {
              if (following) return;
              following = true;
              gsap.ticker.add(tick);
            };
            const stop = () => {
              if (!following) return;
              following = false;
              gsap.ticker.remove(tick);
            };
            const show = () => {
              const id = ++turn;
              // Only a decoded photograph is ever shown; a hover that left before it landed shows nothing.
              (ready.get(pic) ?? Promise.resolve()).then(() => {
                if (!alive || id !== turn || !over) return;
                if (reduce) {
                  gsap.killTweensOf(open);
                  open.o = 1;
                  paintFloat();
                  return;
                }
                gsap.to(open, { o: 1, duration: 0.42, ease: "power3.out", onUpdate: paintFloat, overwrite: true });
              });
            };
            const hide = () => {
              turn += 1;
              if (reduce) {
                gsap.killTweensOf(open);
                open.o = 0;
                paintFloat();
                return;
              }
              // From wherever it stands: a frame still opening closes back the way it came.
              gsap.to(open, { o: 0, duration: 0.3, ease: "power2.in", onUpdate: paintFloat, overwrite: true });
            };
            const onEnter = (e: PointerEvent) => {
              if (e.pointerType !== "mouse") return;
              over = true;
              const r = el.getBoundingClientRect();
              if (reduce) aimAtLink();
              else aim(e.clientX - r.left, e.clientY - r.top);
              // A frame that is not on screen starts where it is wanted, never flying in from its last place.
              if (open.o === 0) {
                cx = tx;
                cy = ty;
                put();
              }
              if (!reduce) start();
              show();
            };
            const onMove = (e: PointerEvent) => {
              if (!over || reduce) return;
              const r = el.getBoundingClientRect();
              aim(e.clientX - r.left, e.clientY - r.top);
            };
            const onLeave = (e: PointerEvent) => {
              if (e.pointerType !== "mouse") return;
              over = false;
              hide();
            };
            let byFocus = false;
            const onFocus = () => {
              if (!linkEl.matches(":focus-visible")) return;
              byFocus = true;
              over = true;
              aimAtLink();
              cx = tx;
              cy = ty;
              put();
              show();
            };
            const onBlur = () => {
              if (!byFocus) return;
              byFocus = false;
              over = false;
              hide();
            };
            linkEl.addEventListener("pointerenter", onEnter);
            linkEl.addEventListener("pointermove", onMove, { passive: true });
            linkEl.addEventListener("pointerleave", onLeave);
            linkEl.addEventListener("focus", onFocus);
            linkEl.addEventListener("blur", onBlur);
            paintFloat();
            undo.push(() => {
              stop();
              gsap.killTweensOf(open);
              linkEl.removeEventListener("pointerenter", onEnter);
              linkEl.removeEventListener("pointermove", onMove);
              linkEl.removeEventListener("pointerleave", onLeave);
              linkEl.removeEventListener("focus", onFocus);
              linkEl.removeEventListener("blur", onBlur);
              float.style.clipPath = "";
              float.style.transform = "";
            });
          }

          const refit = () => {
            fit();
            measure();
            grade();
            paint();
          };
          const ro = new ResizeObserver(() => {
            if (alive && el.dataset.ready) refit();
          });
          ro.observe(el);
          ScrollTrigger.addEventListener("refresh", refit);

          // The fit, the measures and the first paint are taken with the face the line is read in; only then is the
          // section marked ready and the CSS gate let go.
          faceReady().then(() => {
            if (!alive) return;
            fit();
            measure();
            paint();
            el.dataset.ready = "1";
            ScrollTrigger.refresh();
          });

          return () => {
            alive = false;
            ro.disconnect();
            ScrollTrigger.removeEventListener("refresh", refit);
            gsap.killTweensOf(gate);
            for (const u of undo) u();
            for (const r of rows) r.style.transform = "";
            for (const s of softs) {
              s.style.transform = "";
              s.style.opacity = "";
            }
            if (frame) frame.style.clipPath = "";
            if (bandRow) bandRow.style.transform = "";
          };
        },
      );
      return () => {
        gone = true;
        mm.revert();
      };
    },
    { scope: root, dependencies: [variant, lines.join("|")] },
  );

  const head = (extra = "", rise = true) => (
    <h2 id={titleId} data-cc-rise={rise ? "" : undefined} data-cc-head="" className={`font-display ${extra}`}>
      {lines.map((line, i) => (
        <span key={i} data-cc-mask="" className="struq-line-mask block">
          <span data-cc-line="" className="block">
            <span data-cc-text="" className="inline-block">
              {line}
            </span>
          </span>
        </span>
      ))}
    </h2>
  );

  // The action: large type, an arrow, a faint line at rest and a full one that draws while the pointer or the focus is
  // on it (and draws back the way it came when they leave).
  const action = (
    <a
      href={link.href}
      data-cc-link=""
      className="group/cc relative inline-flex items-center gap-[0.42em] py-[0.2em] font-display text-[clamp(1.625rem,1.1rem+1.7vw,2.875rem)] leading-[1.1] tracking-[-0.01em]"
    >
      <span>{link.label}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[0.72em] w-[0.72em] shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cc:translate-x-[0.22em] group-focus-visible/cc:translate-x-[0.22em] motion-reduce:transition-none"
      >
        <path d="M3 12h17M14 5.5l6.5 6.5-6.5 6.5" />
      </svg>
      <span aria-hidden data-cc-rule="" className="absolute inset-x-0 bottom-0 h-[2px] bg-current opacity-25" />
      <span
        aria-hidden
        data-cc-rule=""
        className="absolute inset-x-0 bottom-0 h-[2px] origin-right scale-x-0 bg-current transition-transform duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cc:origin-left group-hover/cc:scale-x-100 group-focus-visible/cc:origin-left group-focus-visible/cc:scale-x-100 motion-reduce:transition-none"
      />
    </a>
  );

  if (variant === "marquee") {
    const said = lines.join(" ");
    return (
      <section
        ref={root}
        data-cta-closing="marquee"
        aria-labelledby={titleId}
        className={`relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-surface-0 px-6 py-[14svh] text-ink md:px-[4vw] ${className}`}
      >
        {/* The line as words: read by screen readers, and set as still lines under reduced motion. */}
        <div data-cc-copy="" className="w-full text-center">
          {head("sr-only motion-reduce:not-sr-only", false)}
        </div>
        {/* The band: decoration, the backdrop the link stands in front of. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center motion-reduce:hidden">
          {/* The mask carries the band's size, so its room (blocks.css) is measured in the band's em. */}
          <div className="struq-line-mask w-full text-[30vw] md:text-[min(19vw,18rem)]">
            <div data-cc-bandrow="" data-cc-rise="">
              <div data-cc-band="" className="flex w-max">
                {Array.from({ length: COPIES }, (_, c) => (
                  <span
                    key={c}
                    data-cc-copyband={c === 0 ? "" : undefined}
                    className="font-display shrink-0 whitespace-nowrap pr-[0.5em] text-[30vw] leading-[0.92] tracking-[-0.035em] md:text-[min(19vw,18rem)]"
                  >
                    {said}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div data-cc-soft="" className="relative z-[1] motion-reduce:mt-[6svh]">
          {action}
        </div>
      </section>
    );
  }

  if (variant === "pointer") {
    return (
      <section
        ref={root}
        data-cta-closing="pointer"
        aria-labelledby={titleId}
        className={`relative flex min-h-svh flex-col justify-center overflow-hidden bg-surface-0 px-6 py-[14svh] text-ink md:px-[4vw] ${className}`}
      >
        <div data-cc-copy="" className="w-full">
          {head()}
          <div data-cc-soft="" className="mt-[7svh] flex items-end gap-5">
            {action}
            {/* On touch the project stands beside the link from the start. */}
            {image ? (
              <figure className="m-0 w-[5.5rem] shrink-0 sm:w-[7rem] [@media(hover:hover)_and_(pointer:fine)]:hidden">
                <div data-cc-pic="" className="relative aspect-[4/5] overflow-hidden bg-surface-2">
                  <Image src={image.src} alt={image.alt} fill sizes="7rem" unoptimized={image.unoptimized} className="object-cover" />
                </div>
              </figure>
            ) : null}
          </div>
        </div>
        {/* With a fine pointer the project follows the pointer while it is over the link. Its width also answers the
            screen's height, so the frame and its caption fit in the ground under the link (about a quarter of it). */}
        {image ? (
          <div
            data-cc-float=""
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-[2] hidden w-[clamp(5.5rem,min(9vw,19svh_-_3.75rem),10rem)] [@media(hover:hover)_and_(pointer:fine)]:block"
          >
            <div data-cc-pic="" className="relative aspect-[4/5] overflow-hidden bg-surface-2">
              <Image src={image.src} alt="" fill sizes="10rem" unoptimized={image.unoptimized} className="object-cover" />
            </div>
            {caption ? <span className="mt-2 block whitespace-nowrap text-small text-ink-muted">{caption}</span> : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section
      ref={root}
      data-cta-closing="photo"
      data-side={first}
      data-v="bottom"
      data-ink="light"
      aria-labelledby={titleId}
      suppressHydrationWarning
      className={`relative flex min-h-svh flex-col overflow-hidden bg-surface-0 ${className}`}
    >
      {image ? (
        <div data-cc-pic="" className="absolute inset-0">
          <div data-cc-frame="" className="absolute inset-0">
            <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
            <div data-cc-veil="" aria-hidden className="absolute inset-0" />
          </div>
        </div>
      ) : null}
      {/* The stage holds the copy at the bottom, or at the top when the photo's read finds the top calmer. */}
      <div data-cc-stage="" className="relative z-[1] flex min-h-svh w-full flex-col justify-end px-6 pb-[12svh] pt-[18svh] md:px-[4vw]">
        <div data-cc-copy="" data-cc-ink="" className="w-full md:w-[56%]">
          {head()}
          <div data-cc-soft="" className="mt-[5svh]">
            {action}
          </div>
        </div>
      </div>
    </section>
  );
}
