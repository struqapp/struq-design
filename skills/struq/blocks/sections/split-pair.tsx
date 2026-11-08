"use client";
// split-pair (Struq section recipe)
// Two tall photos in tension, meeting at a hard seam, with one oversized word set across both so
// the seam cuts through its letters. The stage pins on the ground: the word whole in the accent, a
// hard line standing through it where the seam will be. Then the first photo rises in from below on
// the left. Its half of the word rides with it, a step behind the ground's copy, so the letters
// break along the rising edge and turn from the accent to the photo's own ink; as the photo lands
// they lock into register. The stage holds on that half-and-half frame: one half of the word on the
// photo, the other still in the accent on the ground, the seam the line where they part. The second
// photo comes down from above on the right, against the first, its half breaking and locking the
// same way, and the pair holds whole. While it holds the two photos run against each other inside
// their frames, the left up and the right down at half its speed, and each half of the word rides
// with its photo, so the letters shear apart along the seam the longer the reader stays. When the
// pin lets go the halves leave at their own speeds, the left ahead of the page and the right behind
// it, and the shear runs on as they part.
//
// The word, the line and the captions exist once on the ground and once inside each photo's frame.
// Each frame's clip cuts its copy exactly, so the colour changes on the frame's edge, letter by
// letter, with no blend mode guessing at the photo. The block reads the photos once they load: it
// stands the word at the height where both halves read without any veil (on the photos' calm side
// when they name one, and preferring a height where the two halves take opposite inks), gives each
// half the ink that reads best there (a dark derived from the ground, or the palette's light
// on-photo ink), and sets the line under the word on whichever photo it reads on. A photo is never
// veiled when a placement reads without it. Only when no height reads, or a photo cannot be read at
// all (one on another origin taints the canvas), does a photo take a veil, computed in sRGB just as
// strong as 3:1 for the word and 4.5:1 for the small copy need; both photos then share it when they
// share an ink, so the pair keeps one grade.
//
// Every clip and every move is written from plain numbers on every frame, never tweened as a
// string. The pin is 300%: three key frames, each held, the moves between them short.
// Lead for an architect, a photographer, a fashion or interior studio: any brief with two pictures
// that answer each other (inside and outside, shade and light, before and after).
//
// <SplitPair images={[images.column[3], images.column[2]]} word="Tegenlicht"
//   line="Elk huis begint bij de plek waar de zon valt." captions={["Trap, Huis Ostuni", "Dakterras, Huis Ostuni"]} />
//
// Phones and reduced motion: the composed still. The two photos side by side as tall slices, one
// set lower than the other, the word across both and the seam between them; on phones the line
// follows on the ground below the pair.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances } from "../kit/photo-read";

type Place = "top" | "center" | "bottom";
type Side = "l" | "r";

type Props = {
  /** The pair: the first rises in on the left, the second comes down on the right. */
  images: [StruqImage, StruqImage];
  /** One word (or a short phrase on one line), set across both photos. */
  word: string;
  /** One short line of copy, set under the word on whichever photo it reads on (the first by default). */
  line?: string;
  /** Metadata for each photo: place, client, year. */
  captions?: [string, string];
  /** Where the word stands. Left out, the block reads the photos and finds the height, near their calm side. */
  place?: Place;
  className?: string;
};

/** The word's centre line, as a share of the stage's height, for each named side. */
const PLACE_Y: Record<Place, number> = { top: 0.32, center: 0.47, bottom: 0.6 };
/** How far each photo travels with its frame as it arrives, as a share of the stage (the frame travels 1). */
const TRAVEL = 0.4;
/** How far each photo runs inside its frame while the pair holds, as a share of the stage: the first up, the
 * second down at half its speed. */
const RUN_L = -0.22;
const RUN_R = 0.11;
/** How much of its photo's travel and run each half of the word rides along with. */
const RIDE = 0.35;
/** The push-in each photo settles out of as it arrives. */
const PUSH = 1.22;
/** A photo that names a calm top or bottom is framed toward it: zoomed this much about that edge, so its calm band
 * grows to hold the word. */
const CALM_ZOOM = 1.22;
/** How far each half leaves ahead of (left) or behind (right) the page when the pin lets go, per stage height. */
const LEAVE_L = -0.42;
const LEAVE_R = 0.22;
/** Contrast the word (display size) and the small copy must hold. */
const WORD_RATIO = 3;
const SMALL_RATIO = 4.5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encode = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

type Box = { x: number; y: number; w: number; h: number };
type Read = { lo: number; hi: number };
type Inks = { dark: number; light: number; darkS: number; lightS: number };

/** Layout position relative to `top`, untouched by transforms: offsets walk up the positioned parents. */
function boxOf(n: HTMLElement, top: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = n;
  while (cur && cur !== top) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y, w: n.offsetWidth, h: n.offsetHeight };
}

/** Two boxes' overlap, or null. */
function overlap(a: Box, b: Box): Box | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w);
  const btm = Math.min(a.y + a.h, b.y + b.h);
  return r > x && btm > y ? { x, y, w: r - x, h: btm - y } : null;
}

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
 * The luminance of a photo under a box, read from a small canvas: its darker and brighter ends (`tail` from
 * each end). `frame` is the image element's own layout box (object-fit: cover inside it). Null when the
 * photo cannot be read.
 */
function sample(img: HTMLImageElement, frame: Box, at: Box, tail: number): Read | null {
  const ys = photoLuminances(img, frame, at);
  if (!ys) return null;
  return { lo: ys[Math.floor(ys.length * tail)], hi: ys[Math.min(ys.length - 1, Math.floor(ys.length * (1 - tail)))] };
}

/**
 * The weakest veil that brings `under` (a photo luminance) to `ratio` against an ink, with the veil composited the
 * way the browser does it: in sRGB, channel by channel, not in linear light. `veilS` is the veil's colour as an
 * sRGB grey. Dark ink takes a light veil over the photo's darkest parts; light ink a dark veil over its brightest.
 */
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

// Film grain, the same tile over both photos so the pair reads as one grade.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function SplitPair({ images, word, line, captions, place, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  const [first, second] = images;
  // The named calm side: the side both photos share, or the one either names (top or bottom).
  const rows = [first.negativeSpace, second.negativeSpace].filter((n): n is Place => n === "top" || n === "bottom");
  const named: Place = place ?? (rows.length === 2 && rows[0] !== rows[1] ? "center" : rows[0] ?? "center");
  // The captions go to the edge away from the word's named side.
  const capsLow = named === "top";

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const one = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector<T>(s);
      const all = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      const groundWord = one("[data-layer='ground'] [data-word]");
      const seam = one("[data-seam]");
      const colL = one("[data-col='l']");
      const colR = one("[data-col='r']");
      if (!groundWord || !seam || !colL || !colR) return;
      const cols: Record<Side, HTMLElement> = { l: colL, r: colR };

      // Fit: the word spans the frame whatever the face, never wider than nine tenths of it; a short word may
      // grow by a quarter. Measured at the natural size, then scaled; the height cap lives in the CSS.
      const fit = () => {
        el.style.setProperty("--sp-fit", "1");
        const need = groundWord.offsetWidth;
        if (need <= 0) return;
        const k = Math.min(1.25, (el.clientWidth * 0.9) / need);
        el.style.setProperty("--sp-fit", String(Math.floor(k * 1000) / 1000));
      };

      // The inks as they resolve in this palette, and whether the accent stands on the ground at 3:1.
      // Read from two fixed probes, never by toggling a tone (a colour caught mid-change reads wrong).
      const inks = (): Inks => {
        const probe = (k: string) => {
          const n = el.querySelector<HTMLElement>(`[data-ink='${k}']`);
          return n ? getComputedStyle(n).color : "#000";
        };
        delete el.dataset.ground;
        const ground = luminanceOf(getComputedStyle(el).backgroundColor);
        if (contrast(luminanceOf(probe("accent")), ground) < WORD_RATIO) el.dataset.ground = "ink";
        const dark = luminanceOf(probe("dark"));
        const light = luminanceOf(probe("light"));
        // A veil takes the opposite ink's colour: the on-photo light under dark ink, the derived dark under light.
        return { dark, light, darkS: encode(dark), lightS: encode(light) };
      };

      const apply = (tone: Record<Side, { dark: boolean; veil: number }>) => {
        // One grade: photos that share an ink share the veil, the stronger of the two.
        if (tone.l.dark === tone.r.dark) tone.l.veil = tone.r.veil = Math.max(tone.l.veil, tone.r.veil);
        for (const side of ["l", "r"] as const) {
          const col = cols[side];
          col.dataset.tone = tone[side].dark ? "dark" : "light";
          const v = col.querySelector<HTMLElement>("[data-veil]");
          if (v) v.style.opacity = tone[side].veil.toFixed(3);
        }
      };

      // Read the photos, then stand the word, choose each half's ink and the line's side.
      const settle = () => {
        fit();
        const ink = inks();
        const W = el.clientWidth;
        const H = el.querySelector<HTMLElement>("[data-stage]")?.clientHeight ?? el.clientHeight;
        const S = seam.offsetWidth;
        const wide = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)").matches;
        const halves: Record<Side, Box> = {
          l: { x: 0, y: 0, w: (W - S) / 2, h: H },
          r: { x: (W + S) / 2, y: 0, w: (W - S) / 2, h: H },
        };
        // How far each photo moves under its copy while the pair holds (the copy rides along with part of it).
        const slip: Record<Side, number> = wide
          ? { l: Math.abs(RUN_L) * (1 - RIDE) * H, r: Math.abs(RUN_R) * (1 - RIDE) * H }
          : { l: 0, r: 0 };
        const pad = 12;
        const span = (b: Box, side: Side, dy: number): Box => ({
          x: b.x - pad,
          y: b.y + dy - pad - (side === "r" ? slip.r : 0),
          w: b.w + pad * 2,
          h: b.h + pad * 2 + (side === "l" ? slip.l : slip.r),
        });
        const photo = (side: Side) => {
          const img = cols[side].querySelector<HTMLImageElement>("[data-photo] img");
          const frame = cols[side].querySelector<HTMLElement>("[data-photo]");
          if (!img || !frame || !img.complete) return null;
          // The layout box, then the calm-side zoom the photo carries (scaled about its calm edge).
          const f = boxOf(frame, el);
          const edge = frame.dataset.calm === "top" ? 0 : frame.dataset.calm === "bottom" ? 1 : null;
          if (edge === null) return { img, f };
          const k = CALM_ZOOM;
          return { img, f: { x: f.x - ((k - 1) * f.w) / 2, y: f.y - (k - 1) * f.h * edge, w: f.w * k, h: f.h * k } };
        };
        const read = (side: Side, b: Box | null, dy: number, tail: number) => {
          const p = photo(side);
          if (!p || !b) return null;
          const at = overlap(span(b, side, dy), halves[side]);
          return at ? sample(p.img, p.f, at, tail) : null;
        };
        // The best ink for a reading, and the contrast it holds.
        const best = (r: Read) => {
          const d = contrast(r.lo, ink.dark);
          const l = contrast(r.hi, ink.light);
          return d >= l ? { dark: true, c: d } : { dark: false, c: l };
        };

        // The word's box (its letters' height), the line under it on each side, the captions, all where they are now.
        const word = colL.querySelector<HTMLElement>("[data-word]");
        if (!word) return;
        const wb0 = boxOf(word, el);
        const wb: Box = { x: wb0.x, y: wb0.y + wb0.h * 0.08, w: wb0.w, h: wb0.h * 0.84 };
        // The line on each side, as it would stand under the word and over it (it may go either way).
        const above = el.dataset.linePos === "above";
        const lineOf = (side: Side) => {
          const n = cols[side].querySelector<HTMLElement>(`[data-line-at='${side}']`);
          if (!n || n.offsetWidth <= 0) return null;
          const b = boxOf(n, el);
          const gap = above ? wb0.y - (b.y + b.h) : b.y - (wb0.y + wb0.h);
          return { below: { ...b, y: wb0.y + wb0.h + gap }, above: { ...b, y: wb0.y - gap - b.h }, reach: gap + b.h };
        };
        const lineBoxes = { l: lineOf("l"), r: lineOf("r") };
        const reach = Math.max(0, lineBoxes.l?.reach ?? 0, lineBoxes.r?.reach ?? 0);
        const capsOf = (side: Side) =>
          all(`[data-col='${side}'] [data-cap]`)
            .filter((n) => n.offsetWidth > 0)
            .map((n) => boxOf(n, el));
        const caps: Record<Side, Box[]> = { l: capsOf("l"), r: capsOf("r") };

        const readable = !!(photo("l") && photo("r") && read("l", wb, 0, 0.2) && read("r", wb, 0, 0.2));
        if (!readable) {
          // Nothing to read: the treatment that holds over any photo, for the small copy, at the lightest touch.
          const darkVeil = veilFor(0, ink.dark, ink.lightS, SMALL_RATIO);
          const lightVeil = veilFor(1, ink.light, ink.darkS, SMALL_RATIO);
          const t = darkVeil <= lightVeil ? { dark: true, veil: darkVeil } : { dark: false, veil: lightVeil };
          apply({ l: { ...t }, r: { ...t } });
          return;
        }

        // The heights the word may stand at: clear of the captions and the frames' stagger in the still, with room
        // for the line under it or, when the word stands low, over it.
        const cur = wb0.y + wb0.h / 2;
        const capTop = Math.min(H, ...caps.l.concat(caps.r).map((b) => b.y));
        const capBottom = Math.max(0, ...caps.l.concat(caps.r).map((b) => b.y + b.h));
        const top = (capsLow ? H * 0.07 : Math.max(H * 0.07, capBottom)) + 16;
        const bottom = (capsLow ? Math.min(H * 0.93, capTop) : H * 0.93) - 16;
        const posFor = (y: number): "below" | "above" | null =>
          y + wb0.h / 2 + reach <= bottom ? "below" : y - wb0.h / 2 - reach >= top ? "above" : null;
        const minY = top + wb0.h / 2;
        const maxY = bottom - wb0.h / 2;
        const prefer = (place ? PLACE_Y[place] : PLACE_Y[named]) * H;
        const heights = (
          place || maxY <= minY ? [clamp(prefer, minY, Math.max(minY, maxY))] : Array.from({ length: 11 }, (_, i) => lerp(minY, maxY, i / 10))
        ).filter((y, i, a) => posFor(y) !== null || a.length === 1);

        let pick = { y: heights[0], score: -Infinity, ok: false, tone: { l: { dark: true, c: 1 }, r: { dark: true, c: 1 } } };
        for (const y of heights) {
          const dy = y - cur;
          const rl = read("l", wb, dy, 0.2);
          const rr = read("r", wb, dy, 0.2);
          if (!rl || !rr) continue;
          const tl = best(rl);
          const tr = best(rr);
          const ok = Math.min(tl.c, tr.c) >= WORD_RATIO;
          // Ranked on the strictest read, so a narrow subject under the letters (a tree, a handrail, a lamp) pulls
          // the height down even where the word would still pass.
          const strict = (side: Side, dark: boolean) => {
            const r = read(side, wb, dy, 0.06);
            return r ? contrast(dark ? r.lo : r.hi, dark ? ink.dark : ink.light) : 1;
          };
          // Both halves count: one busy photo must not let the word land on the other one's subject.
          const sl = Math.min(strict("l", tl.dark), 7);
          const sr = Math.min(strict("r", tr.dark), 7);
          const calm = (Math.min(sl, sr) + (sl + sr) / 2) / 2;
          const score = calm + (tl.dark !== tr.dark ? 2 : 0) - (6 * Math.abs(y - prefer)) / H + (ok ? 100 : 0);
          if (score > pick.score) pick = { y, score, ok, tone: { l: tl, r: tr } };
        }
        el.style.setProperty("--sp-y", String((pick.y / H).toFixed(4)));
        const dy = pick.y - cur;
        const pos = posFor(pick.y) ?? "below";
        el.dataset.linePos = pos;
        const lines: Record<Side, Box | null> = { l: lineBoxes.l?.[pos] ?? null, r: lineBoxes.r?.[pos] ?? null };

        // The line stands on whichever photo it reads on with that photo's ink; captions read with their photo's.
        const smallC = (side: Side, b: Box | null, dark: boolean) => {
          const r = read(side, b, dy, 0.15);
          return r ? contrast(dark ? r.lo : r.hi, dark ? ink.dark : ink.light) : 0;
        };
        const lineC = (side: Side) => (lines[side] ? smallC(side, lines[side], pick.tone[side].dark) : 0);
        const lineAt: Side = lineC("r") > lineC("l") + 0.3 && lineC("l") < SMALL_RATIO ? "r" : "l";
        el.dataset.lineAt = lineAt;

        // A veil only where nothing else reads: the weakest that brings every piece of copy on the photo to its ratio.
        const veilOf = (side: Side) => {
          const dark = pick.tone[side].dark;
          const v = (b: Box | null, tail: number, ratio: number, moveWithWord: boolean) => {
            const r = read(side, b, moveWithWord ? dy : 0, tail);
            if (!r) return 0;
            return dark ? veilFor(r.lo, ink.dark, ink.lightS, ratio) : veilFor(r.hi, ink.light, ink.darkS, ratio);
          };
          return Math.max(
            v(wb, 0.2, WORD_RATIO, true),
            lineAt === side ? v(lines[side], 0.15, SMALL_RATIO, true) : 0,
            ...caps[side].map((b) => v(b, 0.15, SMALL_RATIO, false)),
          );
        };
        apply({ l: { dark: pick.tone.l.dark, veil: veilOf("l") }, r: { dark: pick.tone.r.dark, veil: veilOf("r") } });
      };

      const imgs = Array.from(el.querySelectorAll("img"));
      for (const img of imgs) img.addEventListener("load", settle);
      settle();
      document.fonts?.ready.then(settle);
      window.addEventListener("resize", settle);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const run = { l: one("[data-col='l'] [data-run]"), r: one("[data-col='r'] [data-run]") };
        const push = { l: one("[data-col='l'] [data-push]"), r: one("[data-col='r'] [data-push]") };
        const ride = { l: one("[data-col='l'] [data-ride]"), r: one("[data-col='r'] [data-ride]") };
        if (!run.l || !run.r || !push.l || !push.r || !ride.l || !ride.r) return;
        const moving = [run.l, run.r, push.l, push.r, ride.l, ride.r];

        const g = { W: 1, H: 1, S: 2 };
        const measure = () => {
          settle();
          g.W = el.clientWidth;
          g.H = el.clientHeight;
          g.S = seam.offsetWidth || 2;
        };

        // Every value the scroll drives, as plain numbers: each frame's arrival, each photo's push-in, and the
        // run of the two photos against each other while the pair holds.
        const s = { l: 0, r: 0, pl: 0, pr: 0, run: 0 };
        const paint = () => {
          const { W, H, S } = g;
          const inner = (W + S) / 2;
          // The first frame's top edge rises from the bottom; the second's bottom edge comes down from the top.
          colL.style.clipPath = `inset(${(H * (1 - s.l)).toFixed(2)}px ${inner.toFixed(2)}px 0px 0px)`;
          colR.style.clipPath = `inset(0px 0px ${(H * (1 - s.r)).toFixed(2)}px ${inner.toFixed(2)}px)`;
          // Each photo travels with its frame at a fraction of the frame's speed, so it sits deeper than the
          // frame; once the pair stands, the two run inside their frames against each other. Each half of the
          // word rides with part of its photo's movement: out of register while it arrives, in register as it
          // lands, sheared at the seam as the photos run.
          const yl = H * (TRAVEL * (1 - s.l) + RUN_L * s.run);
          const yr = H * (-TRAVEL * (1 - s.r) + RUN_R * s.run);
          run.l!.style.transform = `translate3d(0, ${yl.toFixed(2)}px, 0)`;
          run.r!.style.transform = `translate3d(0, ${yr.toFixed(2)}px, 0)`;
          ride.l!.style.transform = `translate3d(0, ${(yl * RIDE).toFixed(2)}px, 0)`;
          ride.r!.style.transform = `translate3d(0, ${(yr * RIDE).toFixed(2)}px, 0)`;
          push.l!.style.transform = `scale(${lerp(PUSH, 1, s.pl).toFixed(4)})`;
          push.r!.style.transform = `scale(${lerp(PUSH, 1, s.pr).toFixed(4)})`;
        };

        measure();
        paint();

        const riseL = all("[data-col='l'] [data-rise]");
        const riseR = all("[data-col='r'] [data-rise]");
        gsap.set([...riseL, ...riseR], { yPercent: 118 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: paint,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 1,
            onRefresh: () => {
              measure();
              paint();
            },
          },
        });
        // Hold on the ground: the word whole in the accent, the seam standing through it (0.64 of the move after).
        tl.to({}, { duration: 0.8 })
          // The first photo rises in on the left, its half of the word breaking along the edge and locking into
          // register as it lands, the photo settling out of its push-in on the same ease.
          .to(s, { l: 1, duration: 1.25, ease: "power3.inOut" }, 0.8)
          .to(s, { pl: 1, duration: 1.5, ease: "power3.inOut" }, 0.8)
          // Its line and caption stand up out of their masks.
          .to(riseL, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: "expo.out" }, 1.85)
          // Hold on the half-and-half frame. Then the second photo comes down on the right, against the first.
          .to(s, { r: 1, duration: 1.25, ease: "power3.inOut" }, 3.25)
          .to(s, { pr: 1, duration: 1.5, ease: "power3.inOut" }, 3.25)
          .to(riseR, { yPercent: 0, duration: 0.9, ease: "expo.out" }, 4.3)
          // Covered from here on; put away so it never shows when the halves part.
          .set(groundWord, { autoAlpha: 0 }, 4.5)
          // Hold on the pair, the photos running against each other and the halves of the word shearing with
          // them: a steady pull tied to the scroll, so wherever the reader stops the pair stands composed.
          .to(s, { run: 1, duration: 2.3, ease: "none" }, 4.5)
          .to({}, { duration: 2.3 }, 4.5);

        // The approach, when the stage arrives from below the fold: the seam drops through the frame and the
        // word stands up out of its mask, both tied to the scroll and finished before the pin, so the first
        // pinned frame is the composed one. Skipped when the stage is already in view on the first paint.
        if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
          const approach = { trigger: el, start: "top 90%", end: "top 15%", scrub: true };
          gsap.fromTo(seam, { scaleY: 0 }, { scaleY: 1, transformOrigin: "50% 0%", ease: "power2.inOut", scrollTrigger: approach });
          gsap.fromTo(groundWord, { yPercent: 108 }, { yPercent: 0, ease: "power3.out", scrollTrigger: { ...approach, start: "top 75%" } });
        }

        // The release is the idea once more: the two halves leave at their own speeds.
        const pin = tl.scrollTrigger!;
        const leave = (n: HTMLElement, k: number) =>
          gsap.fromTo(
            n,
            { y: 0 },
            {
              y: () => k * el.offsetHeight,
              ease: "none",
              immediateRender: false,
              scrollTrigger: { start: () => pin.end, end: () => pin.end + el.offsetHeight, scrub: true, invalidateOnRefresh: true },
            },
          );
        leave(colL, LEAVE_L);
        leave(colR, LEAVE_R);

        return () => {
          for (const n of [colL, colR]) {
            n.style.clipPath = "";
            n.style.transform = "";
          }
          for (const n of moving) n.style.transform = "";
        };
      });

      return () => {
        window.removeEventListener("resize", settle);
        for (const img of imgs) img.removeEventListener("load", settle);
        mm.revert();
      };
    },
    { scope: stage, dependencies: [named, place] },
  );

  const mask = "block overflow-hidden pb-[0.15em] -mb-[0.15em]";

  // The word and the line under it, laid out once and rendered on the ground and on each photo. Only the ground
  // copy is the real text; the copies on the photos are pictures of it.
  const words = (layer: "ground" | Side) => (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-x-0 top-[calc(var(--sp-y)*100%)] flex -translate-y-1/2 justify-center text-[length:min(calc(var(--sp-base)*var(--sp-fit,1)),34svh)]"
      >
        {/* The mask the word rises out of, with room for accents above and descenders below. */}
        <span className="-mx-[0.1em] -mb-[0.24em] -mt-[0.08em] block overflow-hidden px-[0.1em] pb-[0.24em] pt-[0.08em]">
          <span
            data-word=""
            className="font-display block w-fit whitespace-nowrap leading-[0.82] tracking-[-0.045em] [word-spacing:0.08em]"
          >
            {word}
          </span>
        </span>
        {/* The line under the word, on the first photo or the second: the block reads which one it reads on. */}
        {line && layer !== "ground"
          ? (["l", "r"] as const).map((at) => (
              <span
                key={at}
                className={`absolute top-full mt-[0.3em] max-md:hidden group-data-[line-pos=above]/sp:bottom-full group-data-[line-pos=above]/sp:top-auto group-data-[line-pos=above]/sp:mb-[0.3em] group-data-[line-pos=above]/sp:mt-0 ${
                  at === "l"
                    ? "left-6 md:left-[4vw] group-data-[line-at=r]/sp:invisible"
                    : "right-6 text-right md:right-[4vw] invisible group-data-[line-at=r]/sp:visible"
                }`}
              >
                <span className={mask}>
                  <span data-rise="" data-line-at={at} className="block max-w-[min(30ch,40vw)] text-lead">
                    {line}
                  </span>
                </span>
              </span>
            ))
          : null}
      </div>
    </div>
  );

  // The captions stand still on their photos while the word rides.
  const caps = (side: Side) =>
    captions ? (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 flex justify-between px-6 text-small md:px-[4vw] ${
          // In the still the pair is staggered by 7%, so the captions stand clear of both frames' edges.
          capsLow ? "bottom-[calc(7%_+_1.25rem)] md:motion-safe:bottom-[6svh]" : "top-[calc(7%_+_1.25rem)] md:motion-safe:top-[5svh]"
        }`}
      >
        <span className={mask}>
          <span data-rise={side === "l" ? "" : undefined} data-cap={side === "l" ? "" : undefined} className="block max-w-[40vw]">
            {captions[0]}
          </span>
        </span>
        <span className={`${mask} text-right`}>
          <span data-rise={side === "r" ? "" : undefined} data-cap={side === "r" ? "" : undefined} className="block max-w-[40vw]">
            {captions[1]}
          </span>
        </span>
      </div>
    ) : null;

  // One photo in its frame. The frame is the whole stage clipped to its half, so the type inside it lands on
  // exactly the same pixels as the ground's copy.
  const column = (img: StruqImage, side: Side) => {
    const left = side === "l";
    // Still (phones, reduced motion): both halves, the first set lower than the second. With motion on wide
    // screens the first paint is the opening frame: both frames shut.
    const clip = left
      ? "[clip-path:inset(7%_calc(50%_+_var(--sp-seam)/2)_0_0)] md:motion-safe:[clip-path:inset(100%_calc(50%_+_var(--sp-seam)/2)_0_0)]"
      : "[clip-path:inset(0_0_7%_calc(50%_+_var(--sp-seam)/2))] md:motion-safe:[clip-path:inset(0_0_100%_calc(50%_+_var(--sp-seam)/2))]";
    // Taller than the stage: room for the arrival's travel and for the run while the pair holds (the first runs
    // up, so its room is below; the second runs down, so its room is above).
    const room = left ? "-top-[6%] h-[132%]" : "-top-[14%] h-[124%]";
    const calmEdge = img.negativeSpace === "top" || img.negativeSpace === "bottom" ? img.negativeSpace : null;
    return (
      <div data-col={side} data-tone="dark" className={`group/col absolute inset-0 overflow-hidden ${clip}`}>
        <div className={`absolute w-1/2 ${room} ${left ? "left-0" : "right-0"}`}>
          <div data-run="" className="absolute inset-0 will-change-transform">
            <div data-push="" className="absolute inset-0 will-change-transform">
              <div
                data-photo=""
                data-calm={calmEdge ?? undefined}
                className="absolute inset-0"
                style={
                  calmEdge
                    ? { transform: `scale(${CALM_ZOOM})`, transformOrigin: calmEdge === "top" ? "50% 0%" : "50% 100%" }
                    : undefined
                }
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="50vw"
                  unoptimized={img.unoptimized}
                  className="object-cover [filter:saturate(0.88)_contrast(1.07)]"
                />
              </div>
              {/* The grade: shadows lifted toward the page's ground, one grain over both photos. */}
              <div aria-hidden className="absolute inset-0 bg-surface-0 opacity-[0.08] mix-blend-screen" />
              <div aria-hidden className="absolute inset-0 opacity-[0.1] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
            </div>
          </div>
        </div>
        {/* Only where no placement reads (or the photo cannot be read): the weakest veil the copy needs. */}
        <div
          data-veil=""
          aria-hidden
          className="absolute inset-0 bg-[var(--sp-dark)] group-data-[tone=dark]/col:bg-on-photo"
          style={{ opacity: 0 }}
        />
        <div className="text-on-photo group-data-[tone=dark]/col:text-[var(--sp-dark)]">
          <div data-ride="" className="absolute inset-0 will-change-transform">
            {words(side)}
          </div>
          {caps(side)}
        </div>
      </div>
    );
  };

  return (
    <section
      ref={stage}
      data-section="split-pair"
      data-line-at="l"
      style={
        {
          "--sp-dark": "oklch(from var(--surface-0) min(calc(l * 0.42), 0.19) c h)",
          "--sp-seam": "max(2px, 0.17vw)",
          "--sp-y": String(PLACE_Y[named]),
        } as React.CSSProperties
      }
      className={`group/sp relative bg-surface-0 ${className}`}
    >
      <h2 className="sr-only">{word}</h2>
      {line ? <p className="sr-only">{line}</p> : null}
      {/* The three inks as this palette resolves them, read once to measure contrast. */}
      <span aria-hidden className="pointer-events-none absolute size-0 overflow-hidden">
        <span data-ink="dark" className="text-[var(--sp-dark)]" />
        <span data-ink="light" className="text-on-photo" />
        <span data-ink="accent" className="text-accent" />
      </span>
      <div className="relative h-[86svh] overflow-hidden [--sp-base:22vw] md:h-svh md:[--sp-base:20vw]" data-stage="">
        {/* The ground: the word in the accent (in ink where the accent is too faint on the ground) and the seam,
            a hard line standing where the photos will meet. */}
        <div data-layer="ground" className="absolute inset-0 text-accent group-data-[ground=ink]/sp:text-ink">
          <span
            data-seam=""
            aria-hidden
            className="absolute inset-y-0 left-[calc(50%_-_var(--sp-seam)/2)] w-[var(--sp-seam)] bg-ink"
          />
          {words("ground")}
        </div>
        {column(first, "l")}
        {column(second, "r")}
      </div>
      {line ? (
        <p aria-hidden className="px-6 pb-14 pt-7 text-lead text-ink md:hidden">
          {line}
        </p>
      ) : null}
    </section>
  );
}
