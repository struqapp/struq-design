"use client";
// grid-assembly (Struq section recipe)
// Prints thrown on a table that lock into an editorial grid, and one of them becomes the ground
// for what follows. The stage pins on a composed scatter: nine photos of different sizes lying
// at slight angles around the middle, a few hanging past the edges of the screen. As you scroll
// they travel into a precise grid with exact gaps, each straightening and settling into its own
// cell a beat after the last, and the section's line stands up in the one cell left for type. The
// grid holds. Then the photo in the hero cell grows: its frame opens from the cell to the full
// screen, the photo inside settling with it so its crop never jumps, while the other prints are
// pushed out of the way. Full bleed, the next line of copy rises on the photo's calm side, holds,
// and as the pin lets go the photo drifts slower than the page.
//
// Every move is written from plain numbers on every frame. A tile's whole path is one number
// (`--p` from the scatter to its cell, `--q` out of the way), read by one CSS transform. The hero
// print is a window onto the full-screen photo, registered to the screen; once the grid locks, a
// full-screen plate of the same photo takes over showing the very same pixels, and the grow is a
// clip opening from the cell's pixels to the screen's, the photo never changing scale. The scatter is
// the first paint, so nothing jumps when the pin engages, and it only exists once the page runs
// scripts (blocks.css, "--- grid-assembly ---"). The pin is 250%.
// Lead for an architect, a builder, a studio with a body of work: any brief whose story is many
// pieces making one thing.
//
// <GridAssembly tiles={[...nine photos]} hero={images.hero[1]} title="Noord bouwt in lagen." text="..."
//   heading={["Van fundering", "tot dakrand."]} line="..." />
//
// Phones: the grid at rest, its tiles opening on a short entrance; then the photo full width with
// its line. Reduced motion and pages without scripts: the same still layout, nothing hidden.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances } from "../kit/photo-read";

type Props = {
  /** Eight photos for the grid around the hero cell (more are ignored). */
  tiles: StruqImage[];
  /** The photo in the hero cell, the one that grows to the full screen. */
  hero: StruqImage;
  /** The section's line, set in the grid's type cell. */
  title: string;
  /** One short line under it. */
  text?: string;
  /** The line on the full-bleed photo, one entry per line. */
  heading: string[];
  /** One sentence under it. */
  line?: string;
  className?: string;
};

type Cell = { c: number; cs: number; r: number; rs: number };
type Scatter = { x: number; y: number; rot: number; scale: number };

// The board: twelve columns, six rows, every cell filled. `t` is the type cell, `h` the hero cell.
const CELLS: Record<string, Cell> = {
  t: { c: 1, cs: 4, r: 1, rs: 2 },
  a: { c: 5, cs: 3, r: 1, rs: 3 },
  b: { c: 8, cs: 5, r: 1, rs: 2 },
  c: { c: 1, cs: 2, r: 3, rs: 2 },
  d: { c: 3, cs: 2, r: 3, rs: 4 },
  e: { c: 8, cs: 2, r: 3, rs: 2 },
  f: { c: 10, cs: 3, r: 3, rs: 4 },
  h: { c: 5, cs: 3, r: 4, rs: 3 },
  i: { c: 8, cs: 2, r: 5, rs: 2 },
  j: { c: 1, cs: 2, r: 5, rs: 2 },
};
const ORDER = ["a", "b", "c", "d", "e", "f", "i", "j"] as const;

// The scatter: where each print lies before it is placed (its centre, in vw and svh), its angle and size. One
// overlapping pile a little right of the middle, the hero print on top of it, three spilling past the edges:
// prints thrown onto a table, composed rather than random.
const SCATTER: Record<string, Scatter> = {
  a: { x: 37, y: 31, rot: -8, scale: 0.74 },
  b: { x: 64, y: 21, rot: 5, scale: 0.64 },
  c: { x: 22, y: 60, rot: 10, scale: 0.92 },
  d: { x: 46, y: 68, rot: -4, scale: 0.72 },
  e: { x: 72, y: 52, rot: 12, scale: 0.96 },
  f: { x: 94, y: 72, rot: -9, scale: 0.8 },
  h: { x: 54, y: 43, rot: 2, scale: 0.84 },
  i: { x: 12, y: 92, rot: -13, scale: 0.96 },
  j: { x: 76, y: 94, rot: 7, scale: 0.9 },
};

// The board's geometry, the same numbers the CSS grid uses: 4vw sides, 7svh top and bottom, 0.9vw gaps.
const COL = "((92vw - 11 * 0.9vw) / 12)";
const ROW = "((86svh - 5 * 0.9vw) / 6)";
const centre = (cell: Cell) => ({
  x: `(4vw + ${cell.c - 1} * (${COL} + 0.9vw) + (${cell.cs} * ${COL} + ${cell.cs - 1} * 0.9vw) / 2)`,
  y: `(7svh + ${cell.r - 1} * (${ROW} + 0.9vw) + (${cell.rs} * ${ROW} + ${cell.rs - 1} * 0.9vw) / 2)`,
});
/** The custom properties a tile's scatter is written in: the offset from its cell to its place in the pile. */
const scatterVars = (key: string): React.CSSProperties => {
  const s = SCATTER[key];
  const c = centre(CELLS[key]);
  return {
    "--sx": `calc(${s.x}vw - ${c.x})`,
    "--sy": `calc(${s.y}svh - ${c.y})`,
    "--sr": `${s.rot}deg`,
    "--sd": String(1 - s.scale),
  } as React.CSSProperties;
};

/** Until the photo is read, and without scripts: dark ink over a light veil that holds 4.5:1 over any photo (the
 * on-photo light over black, composited in sRGB, comes to about 0.21 luminance at this strength). */
const SAFE_VEIL = 0.52;
/** The share of the grow by which every other print has left the screen (and is no longer drawn). */
const OFF = 0.7;
/** How long one print takes to fly, as a share of the lock, and how far apart they leave. */
const FLY = 0.62;
/** The order the prints are placed in: the hero first, then outward. */
const PLACE_ORDER = ["h", "a", "e", "d", "b", "c", "f", "j", "i"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** power4.inOut: a hard settle, so each print lands exactly. */
const settle = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
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

/** The weakest veil that brings `under` to `ratio` against an ink, composited as the browser does: in sRGB. */
function veilFor(under: number, ink: number, veilS: number, ratio: number): number {
  if (contrast(under, ink) >= ratio) return 0;
  const s = encode(under);
  const ok = (a: number) => contrast(linear(s * (1 - a) + veilS * a), ink) >= ratio;
  if (!ok(0.85)) return 0.85;
  let lo = 0;
  let hi = 0.85;
  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * The darker and brighter ends of a photo's luminance under a box of the screen (the photo covers the screen).
 * Only read when the photo is from this page's own origin: a photo from elsewhere would taint the canvas.
 */
function readUnder(
  img: HTMLImageElement,
  W: number,
  H: number,
  box: { x: number; y: number; w: number; h: number },
  tail: number,
) {
  const ys = photoLuminances(img, { x: 0, y: 0, w: W, h: H }, box);
  if (!ys) return null;
  return { lo: ys[Math.floor(ys.length * tail)], hi: ys[Math.min(ys.length - 1, Math.floor(ys.length * (1 - tail)))] };
}

export function GridAssembly({ tiles, hero, title, text, heading, line, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  const photos = ORDER.map((key, i) => ({ key, image: tiles[i % Math.max(1, tiles.length)] })).filter((t) => t.image);
  const side = hero.negativeSpace === "right" ? "right" : "left";

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const one = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector<T>(s);
      const all = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));

      // The ink of the line on the full-bleed photo: read from the photo where it may be read, else the
      // treatment that holds over any photo.
      const tone = () => {
        const host = one("[data-bleed]")?.offsetParent ? one("[data-bleed]") : one("[data-still-bleed]");
        const img = host?.querySelector("img");
        const copy = host?.querySelector<HTMLElement>("[data-copy]");
        const veil = host?.querySelector<HTMLElement>("[data-veil]");
        const probe = (k: string) => {
          const n = el.querySelector<HTMLElement>(`[data-ink='${k}']`);
          return n ? luminanceOf(getComputedStyle(n).color) : 0;
        };
        if (!host || !img || !copy || !veil) return;
        const light = probe("light");
        const dark = probe("dark");
        const hostBox = host.getBoundingClientRect();
        const W = hostBox.width;
        const H = hostBox.height;
        // The heading (display size, 3:1, read against most of what lies under it) and the line (4.5:1, against
        // nearly all of it), each on its current side and mirrored to the other side.
        const parts = [
          { n: copy.querySelector<HTMLElement>("h3"), ratio: 3, tail: 0.1 },
          { n: copy.querySelector<HTMLElement>("p"), ratio: 4.5, tail: 0.03 },
        ].flatMap((p) => {
          if (!p.n) return [];
          const b = p.n.getBoundingClientRect();
          const box = { x: b.left - hostBox.left - 12, y: b.top - hostBox.top - 12, w: b.width + 24, h: b.height + 24 };
          return [{ ...p, here: box, there: { ...box, x: W - box.x - box.w } }];
        });
        const current = el.dataset.side === "right" ? "right" : "left";
        // The weaker veil of the two inks over every part, or null when the photo cannot be read.
        const treat = (which: "here" | "there") => {
          let d = 0;
          let l = 0;
          for (const p of parts) {
            const r = readUnder(img, W, H, p[which], p.tail);
            if (!r) return null;
            d = Math.max(d, veilFor(r.lo, dark, encode(light), p.ratio));
            l = Math.max(l, veilFor(r.hi, light, encode(dark), p.ratio));
          }
          // A light veil strong enough for a mid-tone photo reads as fog where a dark one reads as shade, so dark ink
          // only wins clearly: with no veil at all, or well under the dark veil the light ink would need.
          const darkInk = d === 0 || d < l * 0.6;
          return { dark: darkInk, veil: darkInk ? d : l };
        };
        // A photo that cannot be read: the treatment that holds over anything, for the small copy.
        const safeD = veilFor(0, dark, encode(light), 4.5);
        const safeL = veilFor(1, light, encode(dark), 4.5);
        const a = treat("here") ?? { dark: safeD <= safeL, veil: Math.min(safeD, safeL) };
        // The line stands on whichever side of the photo it reads on with the lighter touch (the photo's named calm
        // side by default); a photo that cannot be read keeps its named side.
        const b2 = treat("there");
        const flip = b2 !== null && b2.veil + 0.02 < a.veil;
        const t = flip && b2 ? b2 : a;
        if (flip) el.dataset.side = current === "left" ? "right" : "left";
        el.dataset.tone = t.dark ? "dark" : "light";
        for (const v of all("[data-veil]")) v.style.opacity = t.veil.toFixed(3);
      };
      const imgs = Array.from(el.querySelectorAll("img"));
      // Every photo decoded ahead of the section, the hidden full-screen plate included, so the grow never waits
      // on a decode in its first frame.
      const decode = (img: HTMLImageElement) => {
        if (img.complete && img.naturalWidth) img.decode?.().catch(() => {});
      };
      for (const img of imgs) {
        img.addEventListener("load", tone);
        img.addEventListener("load", () => decode(img));
        decode(img);
      }
      tone();
      document.fonts?.ready.then(tone);
      window.addEventListener("resize", tone);

      const mm = gsap.matchMedia();

      // Wide screens with motion: the pinned assembly.
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const bleed = one("[data-bleed]");
        const frame = one("[data-bleed-frame]");
        const plate = one("[data-bleed-plate]");
        const drift = one("[data-bleed-drift]");
        const heroTile = one("[data-tile='h']");
        const typeTile = one("[data-tile='t']");
        const win = one("[data-tile='h'] [data-window]");
        const veilOn = one("[data-veil-on]");
        if (!bleed || !bleed.offsetParent || !frame || !plate || !drift || !heroTile || !typeTile || !win || !veilOn) return;
        // If the script arrives after the CSS fallback has already dropped the tiles into the grid, the grid stays:
        // the flight is skipped rather than thrown back into the pile.
        const fellBack = getComputedStyle(heroTile).getPropertyValue("--p").trim() === "1";
        el.dataset.motion = "1";
        const tilesEls = all("[data-tile]");
        const copyRise = all("[data-bleed] [data-rise]");
        const stageBox = one("[data-stage]")!;

        const g = { W: 1, H: 1, cell: { x: 0, y: 0, w: 1, h: 1 } };
        const box = (n: HTMLElement) => {
          let x = 0;
          let y = 0;
          let cur: HTMLElement | null = n;
          while (cur && cur !== stageBox) {
            x += cur.offsetLeft;
            y += cur.offsetTop;
            cur = cur.offsetParent as HTMLElement | null;
          }
          return { x, y, w: n.offsetWidth, h: n.offsetHeight };
        };
        const measure = () => {
          tone();
          g.W = stageBox.clientWidth;
          g.H = stageBox.clientHeight;
          g.cell = box(heroTile);
          // Registration: the hero print is a window onto the full-screen photo, the same photo at the same size and
          // place as the plate, so when the plate takes over at the lock it shows exactly the same pixels, and the
          // grow is only a clip opening to the screen, never a change of scale.
          win.style.left = `${-g.cell.x}px`;
          win.style.top = `${-g.cell.y}px`;
          win.style.width = `${g.W}px`;
          win.style.height = `${g.H}px`;
          win.style.right = "auto";
          win.style.bottom = "auto";
          // Each other print is pushed straight away from the hero cell, by translation only, just far enough to
          // clear the nearest edge of the screen it is heading for: it is gone by OFF of the grow, then no longer
          // drawn, so the prints never weigh on the frames where the photo opens widest.
          const hx = g.cell.x + g.cell.w / 2;
          const hy = g.cell.y + g.cell.h / 2;
          for (const t of tilesEls) {
            if (t === heroTile) continue;
            const b = box(t);
            const dx = b.x + b.w / 2 - hx;
            const dy = b.y + b.h / 2 - hy;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const margin = 24;
            const needX = ux > 0.01 ? (g.W - b.x + margin) / ux : ux < -0.01 ? (b.x + b.w + margin) / -ux : Infinity;
            const needY = uy > 0.01 ? (g.H - b.y + margin) / uy : uy < -0.01 ? (b.y + b.h + margin) / -uy : Infinity;
            const reach = Math.min(needX, needY) / OFF;
            push.set(t, { x: ux * reach, y: uy * reach });
          }
        };
        const push = new Map<HTMLElement, { x: number; y: number }>();

        // The values the scroll drives: the lock (each print's own share of it), the grow, the copy.
        const s = { lock: fellBack ? 1 : 0, grow: 0 };
        const order = PLACE_ORDER.filter((k) => tilesEls.some((t) => t.dataset.tile === k));
        const paint = () => {
          const span = order.length > 1 ? (1 - FLY) / (order.length - 1) : 0;
          for (const t of tilesEls) {
            const key = t.dataset.tile ?? "";
            const at = key === "t" ? order.length - 1 : Math.max(0, order.indexOf(key));
            const p = settle(clamp((s.lock - at * span) / FLY, 0, 1));
            t.style.setProperty("--p", p.toFixed(4));
            // The push out of the way follows the grow's own ease, so every print is off screen at OFF. It is written
            // in whole pixels: a layer whose only transform is a fractional translation is re-rastered by the browser
            // each time the fraction changes, which stalled the grow while eight prints slid at once.
            const q = key === "h" ? 0 : s.grow;
            const m = push.get(t);
            if (q > 0 && m) {
              t.style.transform = `translate3d(${Math.round(q * m.x)}px, ${Math.round(q * m.y)}px, 0)`;
            } else {
              t.style.transform = "";
            }
            if (key !== "h") t.style.visibility = q >= OFF ? "hidden" : "";
          }
          // The hero's frame: a clip from its cell to the screen over the photo at full size. The plate takes over from the hero tile as soon as the grid is locked, clipped exactly to the cell, so
          // the browser has painted it through the whole hold before the grow begins.
          const e = s.grow;
          const on = s.lock >= 0.999 || e > 0.0005;
          bleed.style.visibility = on ? "visible" : "hidden";
          heroTile.style.visibility = on ? "hidden" : "";
          const L = lerp(g.cell.x, 0, e);
          const T = lerp(g.cell.y, 0, e);
          const R = lerp(g.W - (g.cell.x + g.cell.w), 0, e);
          const B = lerp(g.H - (g.cell.y + g.cell.h), 0, e);
          // The clip sits on the plate's own layer (and the veil's), never on a parent: clipped from outside, the
          // browser rasters only the part of the photo inside the clip and stalls on the rest as the clip opens.
          const cp = `inset(${T.toFixed(2)}px ${R.toFixed(2)}px ${B.toFixed(2)}px ${L.toFixed(2)}px)`;
          plate.style.clipPath = cp;
          veilOn.style.clipPath = cp;
          // The veil the line needs comes in with the grow, so the take-over at the lock shows the bare photo.
          veilOn.style.opacity = e.toFixed(4);
        };

        measure();
        paint();
        gsap.set(copyRise, { yPercent: 118 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: paint,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=250%",
            pin: true,
            scrub: 1,
            onRefresh: () => {
              measure();
              paint();
            },
          },
        });
        // Hold on the pile; the lock; hold on the grid; the grow; hold on the photo with its line.
        // Units: the moves (lock 1.3, grow 1.8) take 3.1, the holds 4.4. The grow is the longest move and eases
        // on power2.inOut, so the frame opens over about a quarter of the pin rather than snapping through its middle.
        tl.to({}, { duration: 0.7 })
          .to(s, { lock: 1, duration: 1.3, ease: "none" }, 0.7)
          .to({}, { duration: 1.3 }, 2.0)
          .to(s, { grow: 1, duration: 1.8, ease: "power2.inOut" }, 3.3)
          // The line rises once the frame is fully open.
          .to(copyRise, { yPercent: 0, duration: 0.9, stagger: 0.09, ease: "expo.out" }, 5.1)
          // The last hold: the copy is whole from about 6.1, held 1.4 more; 2.4 after the grow lands.
          .to({}, { duration: 2.4 }, 5.1);

        // The release: the photo drifts slower than the page as the stage leaves.
        const pin = tl.scrollTrigger!;
        gsap.fromTo(
          drift,
          { yPercent: 0 },
          {
            yPercent: 22,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { start: () => pin.end, end: () => pin.end + el.offsetHeight, scrub: true },
          },
        );

        return () => {
          delete el.dataset.motion;
          for (const t of tilesEls) {
            t.style.removeProperty("--p");
            t.style.transform = "";
            t.style.visibility = "";
          }
          heroTile.style.visibility = "";
          bleed.style.visibility = "";
          plate.style.clipPath = "";
          veilOn.style.clipPath = "";
          veilOn.style.opacity = "";
          for (const p of ["left", "top", "width", "height", "right", "bottom"] as const) win.style[p] = "";
        };
      });

      // Phones with motion: the grid at rest, each tile opening from its foot as the grid arrives.
      mm.add("(max-width: 767px) and (prefers-reduced-motion: no-preference)", () => {
        const tilesEls = all("[data-tile]");
        const open = tilesEls.map(() => ({ v: 0 }));
        const write = () =>
          tilesEls.forEach((t, i) => {
            t.style.clipPath = `inset(${(100 * (1 - open[i].v)).toFixed(2)}% 0% 0% 0%)`;
          });
        write();
        el.dataset.shown = "1";
        const tw = gsap.to(open, {
          v: 1,
          duration: 0.9,
          stagger: 0.07,
          ease: "expo.out",
          paused: true,
          onUpdate: write,
        });
        const st = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 80%", once: true, onEnter: () => tw.play() } });
        return () => {
          st.scrollTrigger?.kill();
          tw.kill();
          delete el.dataset.shown;
          for (const t of tilesEls) t.style.clipPath = "";
        };
      });

      return () => {
        window.removeEventListener("resize", tone);
        for (const img of imgs) img.removeEventListener("load", tone);
        mm.revert();
      };
    },
    { scope: stage, dependencies: [hero.src] },
  );

  const grade = "object-cover [filter:saturate(0.9)_contrast(1.05)]";
  const place = (cell: Cell) =>
    ({
      "--c": `${cell.c} / span ${cell.cs}`,
      "--r": `${cell.r} / span ${cell.rs}`,
    }) as React.CSSProperties;
  // Desktop: the board's cell. Phones: two columns, tall prints over two rows.
  // The type cell does not clip: its lines clip in their own masks, with room for accents and descenders.
  const tileClass = (tall: boolean, wide: boolean, clip = true) =>
    `relative ${clip ? "overflow-hidden" : ""} bg-surface-2 will-change-transform md:[grid-column:var(--c)] md:[grid-row:var(--r)] ${
      wide ? "col-span-2" : ""
    } ${tall ? "row-span-2" : ""}`;
  const ink = "text-on-photo group-data-[tone=dark]/ga:text-[var(--ga-dark)]";
  const display = "font-display leading-[0.92] tracking-[-0.035em]";

  const copy = (rise: boolean) => (
    <div
      data-copy=""
      className={`max-w-[46rem] ${ink} group-data-[side=right]/ga:ml-auto group-data-[side=right]/ga:text-right`}
    >
      <h3 className={`m-0 text-[clamp(2.75rem,1rem_+_5.4vw,8rem)] ${display}`}>
        {heading.map((h) => (
          <span key={h} className="struq-line-mask block">
            <span data-rise={rise ? "" : undefined} className="block">
              {h}
            </span>
          </span>
        ))}
      </h3>
      {line ? (
        <p className="m-0 mt-6 text-lead">
          <span className="struq-line-mask block">
            <span data-rise={rise ? "" : undefined} className="block max-w-[34ch] group-data-[side=right]/ga:ml-auto">
              {line}
            </span>
          </span>
        </p>
      ) : null}
    </div>
  );

  return (
    <section
      ref={stage}
      data-grid-assembly=""
      data-tone="dark"
      data-side={side}
      aria-label={title}
      className={`group/ga relative bg-surface-0 ${className}`}
      style={{ "--ga-dark": "oklch(from var(--surface-0) min(calc(l * 0.42), 0.19) c h)" } as React.CSSProperties}
    >
      {/* The inks as this palette resolves them, read once to measure contrast. */}
      <span aria-hidden className="pointer-events-none absolute size-0 overflow-hidden">
        <span data-ink="light" className="text-on-photo" />
        <span data-ink="dark" className="text-[var(--ga-dark)]" />
      </span>

      <div data-stage="" className="relative px-4 py-12 md:h-svh md:overflow-hidden md:p-0">
        {/* The board: twelve columns and six rows with exact gaps on wide screens, two columns on phones. */}
        <div className="grid auto-rows-[34vw] grid-cols-2 gap-2 md:absolute md:inset-x-[4vw] md:inset-y-[7svh] md:auto-rows-auto md:grid-cols-12 md:grid-rows-6 md:gap-[0.9vw]">
          {/* The type cell: the section's line, standing up as the grid locks. */}
          <div
            data-tile="t"
            className={`${tileClass(false, true, false)} flex flex-col justify-between bg-transparent py-1 md:py-0`}
            style={{ ...place(CELLS.t), ...({ "--sx": "0px", "--sy": "0px", "--sr": "0deg", "--sd": "0" } as React.CSSProperties) }}
          >
            <h2 className={`m-0 text-[clamp(2.25rem,1rem_+_2.9vw,5rem)] text-ink ${display}`}>
              <span className="struq-line-mask block">
                <span data-ga-line="" className="block">
                  {title}
                </span>
              </span>
            </h2>
            {text ? (
              <p className="m-0 text-small text-ink-muted">
                <span className="struq-line-mask block">
                  <span data-ga-line="" className="block max-w-[32ch]">
                    {text}
                  </span>
                </span>
              </p>
            ) : null}
          </div>
          {photos.map(({ key, image }) => {
            const cell = CELLS[key];
            return (
              <div
                key={key}
                data-tile={key}
                className={tileClass(cell.rs >= 3, cell.cs >= 5)}
                style={{ ...place(cell), ...scatterVars(key) }}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  loading="eager"
                  sizes={`(min-width: 768px) ${Math.round((cell.cs / 12) * 92)}vw, ${cell.cs >= 5 ? 92 : 46}vw`}
                  unoptimized={image.unoptimized}
                  className={grade}
                />
              </div>
            );
          })}
          <div
            data-tile="h"
            className={tileClass(true, true)}
            style={{ ...place(CELLS.h), ...scatterVars("h") }}
          >
            {/* A window onto the full-screen photo once the assembly runs (the script positions it); the cell's own
                crop otherwise. */}
            <div data-window="" className="absolute inset-0">
              <Image
                src={hero.src}
                alt={hero.alt}
                fill
                loading="eager"
                sizes="(min-width: 768px) 100vw, 92vw"
                unoptimized={hero.unoptimized}
                className={grade}
              />
            </div>
          </div>
        </div>

        {/* The grow: a full-screen plate of the hero photo, clipped to the hero's cell until it opens. */}
        <div
          data-bleed=""
          className="pointer-events-none invisible absolute inset-0 z-10 hidden md:motion-safe:[:is(.js,.sq-js)_&]:block"
        >
          <div data-bleed-frame="" className="absolute inset-0 overflow-hidden">
            <div data-bleed-drift="" className="absolute inset-0">
              {/* Its own layer at scale 1 for the whole sequence: rastered whole while the grid holds, so the clip
                  can open without the browser painting a full-screen photo on the first frame of the grow. */}
              <div data-bleed-plate="" className="absolute inset-0 will-change-transform [transform:translateZ(0)]">
                <Image
                  src={hero.src}
                  alt=""
                  fill
                  loading="eager"
                  sizes="100vw"
                  unoptimized={hero.unoptimized}
                  className={grade}
                />
              </div>
            </div>
            <div data-veil-on="" aria-hidden className="absolute inset-0">
              <div data-veil="" className="absolute inset-0 bg-[var(--ga-dark)] group-data-[tone=dark]/ga:bg-on-photo" style={{ opacity: SAFE_VEIL }} />
            </div>
            <div className="absolute inset-x-[5vw] bottom-[9svh]">{copy(true)}</div>
          </div>
        </div>
      </div>

      {/* The still hand-over (phones, reduced motion, pages without scripts): the photo full width with its line. */}
      <figure
        data-still-bleed=""
        className="relative m-0 h-[82svh] overflow-hidden md:h-svh md:motion-safe:[:is(.js,.sq-js)_&]:hidden"
      >
        <Image src={hero.src} alt="" fill loading="eager" sizes="100vw" unoptimized={hero.unoptimized} className={grade} />
        <div data-veil="" aria-hidden className="absolute inset-0 bg-[var(--ga-dark)] group-data-[tone=dark]/ga:bg-on-photo" style={{ opacity: SAFE_VEIL }} />
        <div className="absolute inset-x-6 bottom-[8svh] md:inset-x-[5vw]">{copy(false)}</div>
      </figure>
    </section>
  );
}
