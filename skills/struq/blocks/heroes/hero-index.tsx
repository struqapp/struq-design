"use client";
// hero-index (Struq hero recipe)
// The studio's list of work is the first screen. Five or six project names at display size stand down the screen over
// a full-screen photograph, each with a quiet place and year, each a link. At rest the first project's photograph is
// up, drifting very slowly. Hover or focus a name and the photograph behind the whole list becomes that project's,
// wiping in the way the hand travels (down the list it comes from the top edge, up the list from the bottom), while
// the other names step back. Leave the list and the first project returns. On load the photograph is up first, then
// the names rise one by one through their masks.
//
// The photographs are full-size layers stacked in one box; a swap only opens a clip on the incoming layer, written
// from whole-pixel numbers, and never scales anything. Going back to a photograph that still shows under a wipe
// draws the wipe back instead of re-hiding it, so the screen is never without a picture. Every photograph is decoded
// before it can be swapped in.
//
// The ink is decided per photograph, for the whole list at once: the dark ink with no veil, or the light ink with a
// veil of at most a quarter, whichever gives every name 3:1 over what is under it, the stepped-back names at their
// reduced strength too. The list stands on the side of the screen where most of the photographs allow that (each one
// measured); a photograph that allows it on neither side keeps the light ink under the capped veil and is marked
// data-unfit, and should not be offered as a hero. Each place line stands right-aligned under its name and takes
// whichever ink holds 4.5:1 in its own box. During a wipe the list keeps the outgoing ink until the incoming photo has
// passed the whole list, then switches at once. A photograph that cannot be read keeps the CSS's light ink and veil.
//
// <HeroIndex items={[{ title: "Olijfhof", place: "Alentejo", year: "2025", image: images.hero[2], href: "/werk/olijfhof" }, ...]} />
//
// `accent` (optional) is the site's one accent word: the names are this hero's headline, and where the word first
// stands in one of them it is set in the pairing's italic accent face, inside the name's mask, as the Statement and
// the Close set the same word. Left out, or in no name, the list is exactly as it was.
//
// The photo box carries data-stack-target, so preloader-stack and page-transition-stack land on the first photograph.
// Keyboard: focus swaps like hover; one focus ring, on the link. Phones and touch: the list over the first photograph,
// a tap follows the link. Reduced motion: swaps are hard cuts, no drift, the names simply stand. Without scripts: the
// list over the first photograph.
//
// Three variants of the one idea, the list that calls up its photograph:
// - lijst (default): as above, the list over the full-screen photograph, hover and focus swap it.
// - venster: the list stands on the page ground in the ink, and the photograph lives in a tall window beside it (on
//   phones above it); hover and focus wipe the window the same way. No veil: no name stands on a photograph.
// - doorlopen: the list stands in the middle of the full-screen photograph and the hero holds while the first scroll
//   walks it: each stretch of scroll raises the next project's photograph from the bottom edge, scrubbed, and steps its
//   name forward. Scrolling back draws the photographs back down. Focus a name and the page scrolls to its stretch.
//   Reduced motion: the same stretches, cuts instead of wipes.
import Image from "next/image";
import { useRef } from "react";
import { accentLines } from "../kit/accent";
import { ScrollTrigger, gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances, type PhotoBox } from "../kit/photo-read";
import {
  covered,
  whenUncovered,
} from "../preloaders/preloader-slices-uncovered";

type Item = {
  title: string;
  /** Where it is; set with the year as one quiet line. */
  place: string;
  year: string;
  image: StruqImage;
  href: string;
  /** Where the photograph sits in the frame (CSS object-position), so its subject stands clear of the list. */
  focus?: string;
};

type Props = {
  /** Where the list stands, when the photographs have been framed for it (each item's focus); left out, the block
   * measures every photograph on both sides and takes the side where most of them hold. */
  side?: Side;
  /** Five or six projects; the first is the photograph at rest. */
  items: Item[];
  /** The site's one accent word: where it first stands in the list of names it is set in the pairing's italic accent
   * face (--face-accent), as the Statement and the Close set it. A word no name holds changes nothing. */
  accent?: string;
  /** The composition; the first is the default. */
  variant?: HeroIndexVariant;
  className?: string;
};

export const HERO_INDEX_VARIANTS = [
  { id: "lijst", title: "Lijst over de foto" },
  { id: "venster", title: "Venster" },
  { id: "doorlopen", title: "Doorlopen" },
] as const;

export type HeroIndexVariant = (typeof HERO_INDEX_VARIANTS)[number]["id"];

type Side = "left" | "right";
type Ink = "dark" | "light";
type Dress = {
  ink: Ink;
  veil: number;
  meta: Array<Ink | "foot">;
  fit: boolean;
};

/** The names are display text: 3:1 against the photo under them. The place lines are small text: 4.5:1. */
const RATIO = 3;
const META_RATIO = 4.5;
const MAX_VEIL = 0.25;
/** The veil over a photograph that cannot be read (and without scripts, in the CSS). */
const SAFE_VEIL = 0.45;
/** The strength of a stepped-back name. */
const DIM = 0.8;
/** The share of the pixels under a name that the ink is judged against: the brighter side for light ink, the darker
 * side for dark ink, so a name holds over most of what is under it, not just its average. */
const SAFE = 0.35;
/** A swap wipes the incoming photograph in over this long. */
const WIPE = 0.85;
/** After the hand leaves the list, the first project returns after this pause. */
const RETURN = 0.45;

const FINE = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";
/** A name's size, set on the name and on its mask (the mask's room for accents and descenders is in its own em). */
const NAME_SIZE = "text-[min(11.5vw,7.6svh)] md:text-[min(clamp(2.75rem,1rem_+_5.2vw,7.5rem),8.4svh)]";

const linear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const encode = (l: number) =>
  l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const at = (ys: number[], q: number) =>
  ys[Math.min(ys.length - 1, Math.max(0, Math.floor(ys.length * q)))];

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
  return (
    0.2126 * linear(r / 255) +
    0.7152 * linear(g / 255) +
    0.0722 * linear(b / 255)
  );
}

/** The weakest veil (composited in sRGB, as the browser does) that brings `under` to `ratio` against `ink`. */
function veilFor(
  under: number,
  ink: number,
  veilS: number,
  ratio: number,
): number {
  if (contrast(under, ink) >= ratio) return 0;
  const s = encode(under);
  const ok = (a: number) =>
    contrast(linear(s * (1 - a) + veilS * a), ink) >= ratio;
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

/** How busy a photo is in a box: the spread between its quartiles (foliage and gravel are busy, a wall is calm). */
function texture(
  img: HTMLImageElement,
  frame: PhotoBox,
  box: PhotoBox,
): number | null {
  const ys = photoLuminances(img, frame, box);
  if (!ys) return null;
  return Math.sqrt(at(ys, 0.75)) - Math.sqrt(at(ys, 0.25));
}

export function HeroIndex({ items, side, accent, variant = "lijst", className = "" }: Props) {
  const root = useRef<HTMLElement>(null);
  const names = accentLines(
    items.map((item) => item.title),
    accent,
  );
  // Over a photograph the names need a measured ink; in the window they stand on the ground.
  const overPhoto = variant !== "venster";
  const walks = variant === "doorlopen";
  const listSide: Side = side ?? (items[0]?.image.negativeSpace === "right" ? "right" : "left");

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const box = el.querySelector<HTMLElement>("[data-stack-target]");
      const list = el.querySelector<HTMLElement>("[data-list]");
      const rows = Array.from(
        el.querySelectorAll<HTMLAnchorElement>("[data-row]"),
      );
      const layers = Array.from(
        el.querySelectorAll<HTMLElement>("[data-layer]"),
      );
      const veils = layers.map((l) =>
        l.querySelector<HTMLElement>("[data-veil]"),
      );
      const imgs = layers.map((l) => l.querySelector<HTMLImageElement>("img"));
      const rise = Array.from(el.querySelectorAll<HTMLElement>("[data-rise]"));
      const foot = el.querySelector<HTMLElement>("[data-foot]");
      // The row whose place line is shown: the hovered or focused one, else the first.
      let shownRow = -1;
      const footer = () => {
        if (!foot) return;
        const row = rows[shownRow >= 0 ? shownRow : 0];
        if (row?.dataset.placeInk === "foot") {
          foot.textContent =
            row.querySelector("[data-meta]")?.textContent ?? "";
          foot.dataset.on = "";
        } else {
          foot.textContent = "";
          delete foot.dataset.on;
        }
      };
      if (!box || !list || rows.length === 0 || layers.length === 0) return;
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      let gone = false;
      const labelSide = el.dataset.side;

      // Every photograph loads now and is decoded before it can be swapped in.
      const ready = imgs.map((img, i) => {
        if (!img) return Promise.resolve();
        if (i > 0) img.loading = "eager";
        const loaded = img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener("load", () => res(), { once: true });
              img.addEventListener("error", () => res(), { once: true });
            });
        return loaded.then(() => img.decode()).catch(() => undefined);
      });
      const decoded = imgs.map(() => false);
      ready.forEach((p, i) => p.then(() => (decoded[i] = true)));

      // Where each name and its place line stand, in the layer's coordinates. The line mask is never transformed,
      // so this holds before the names have risen too.
      const rel = (r: DOMRect, base: DOMRect): PhotoBox => ({
        x: r.left - base.left,
        y: r.top - base.top,
        w: r.width,
        h: r.height,
      });
      const places = () => {
        const base = layers[0].getBoundingClientRect();
        return rows.map((row) => {
          const name = row.querySelector<HTMLElement>("[data-name]")!;
          const meta = row.querySelector<HTMLElement>("[data-meta]")!;
          // Where the line stands: the mask's box less its room for accents and descenders (blocks.css), read as
          // laid out, so the rise in flight does not move it.
          const maskEl = row.querySelector<HTMLElement>(".struq-line-mask")!;
          const box = maskEl.getBoundingClientRect();
          const cs = getComputedStyle(maskEl);
          const mask = { top: box.top + parseFloat(cs.paddingTop), bottom: box.bottom - parseFloat(cs.paddingBottom) };
          const range = document.createRange();
          range.selectNodeContents(name);
          const g = range.getBoundingClientRect();
          const m = meta.getBoundingClientRect();
          const mh = meta.offsetHeight;
          return {
            name: rel(
              new DOMRect(g.left, mask.top, g.width, name.offsetHeight),
              base,
            ),
            meta: rel(new DOMRect(m.left, mask.bottom - mh, m.width, mh), base),
          };
        });
      };

      // The dress of one photograph for the names where they stand: one ink for the whole list, its veil, the place
      // lines' inks, and whether it holds at all.
      const inks = () => {
        const cs = getComputedStyle(el);
        const light = luminanceOf(
          cs.getPropertyValue("--on-photo").trim() || "#fff",
        );
        const dark = luminanceOf(
          getComputedStyle(veils[0] ?? el).backgroundColor,
        );
        return { light, dark, veilS: encode(dark) };
      };
      const dressFor = (
        i: number,
        spots: ReturnType<typeof places>,
      ): Dress | null => {
        const img = imgs[i];
        if (!img) return null;
        const frame: PhotoBox = {
          x: 0,
          y: 0,
          w: layers[i].clientWidth,
          h: layers[i].clientHeight,
        };
        const reads = spots.map((s) => ({
          name: photoLuminances(img, frame, s.name),
          meta: photoLuminances(img, frame, s.meta),
        }));
        if (reads.some((r) => !r.name || !r.meta)) return null;
        const { light, dark, veilS } = inks();
        const veiled = (l: number, v: number) =>
          linear(encode(l) * (1 - v) + veilS * v);
        const shown = (ink: number, bg: number, k: number) =>
          linear(encode(ink) * k + encode(bg) * (1 - k));
        // Dark ink, no veil: every name over the darker side of what is under it.
        const darkOk = reads.every((r, k) => {
          const bg = at(r.name!, SAFE);
          return contrast(shown(dark, bg, k === i ? 1 : DIM), bg) >= RATIO;
        });
        // Light ink: the veil every name needs over the brighter side of what is under it, stepped back ones too.
        const need = Math.max(
          ...reads.map((r, k) => {
            const bg = at(r.name!, 1 - SAFE);
            if (k === i) return veilFor(bg, light, veilS, RATIO);
            // A dimmed name is the ink mixed toward the ground; find the veil it needs by search.
            const ok = (v: number) => {
              const b = veiled(bg, v);
              return contrast(shown(light, b, DIM), b) >= RATIO;
            };
            if (!ok(1)) return 1;
            let lo = 0;
            let hi = 1;
            for (let n = 0; n < 14; n += 1) {
              const mid = (lo + hi) / 2;
              if (ok(mid)) hi = mid;
              else lo = mid;
            }
            return hi;
          }),
        );
        const lightOk = need <= MAX_VEIL;
        const ink: Ink = darkOk ? "dark" : "light";
        const veil = darkOk ? 0 : Math.min(need, MAX_VEIL);
        // Each place line: the ink that holds 4.5:1 in its own box over the veil chosen; where neither does, it is
        // shown at the foot of the list in the list's ink instead.
        const meta = reads.map((r) => {
          const lo = veiled(at(r.meta!, SAFE), veil);
          const hi = veiled(at(r.meta!, 1 - SAFE), veil);
          if (contrast(light, hi) >= META_RATIO) return "light" as const;
          if (contrast(dark, lo) >= META_RATIO) return "dark" as const;
          return "foot" as const;
        });
        return { ink, veil, meta, fit: darkOk || lightOk };
      };

      // The side: measure every photograph with the list on each side and take the side where most of them hold; on
      // a tie the side where the first photograph is calmer, then the label.
      const dress: Array<Dress | null> = layers.map(() => null);
      const settle = () => {
        if (gone) return;
        // In the window the names stand on the ground: nothing to measure, no veil.
        if (!overPhoto) {
          el.dataset.side = listSide;
          for (const v of veils) if (v) v.style.opacity = "0";
          return;
        }
        // In the middle of the screen both sides are the same place.
        const sides: Side[] = side ? [side] : walks ? [listSide] : ["left", "right"];
        const tally = sides.map((side) => {
          el.dataset.side = side;
          const spots = places();
          const all = layers.map((_, i) =>
            decoded[i] ? dressFor(i, spots) : null,
          );
          return { side, all, fit: all.filter((d) => d?.fit).length };
        });
        let pick =
          tally.length === 1
            ? tally[0]
            : tally[0].fit === tally[1].fit
              ? null
              : tally[0].fit > tally[1].fit
                ? tally[0]
                : tally[1];
        if (!pick && imgs[0]) {
          const frame: PhotoBox = {
            x: 0,
            y: 0,
            w: layers[0].clientWidth,
            h: layers[0].clientHeight,
          };
          const half = (x: number): PhotoBox => ({
            x: frame.w * x,
            y: frame.h * 0.25,
            w: frame.w * 0.45,
            h: frame.h * 0.75,
          });
          const l = texture(imgs[0], frame, half(0));
          const r = texture(imgs[0], frame, half(0.55));
          if (l !== null && r !== null && l !== r)
            pick = l < r ? tally[0] : tally[1];
        }
        if (!pick) pick = labelSide === "right" ? tally[1] : tally[0];
        el.dataset.side = pick.side;
        pick.all.forEach((d, i) => {
          dress[i] = d;
          const veil = veils[i];
          if (d) layers[i].toggleAttribute("data-unfit", !d.fit);
          // A photograph that cannot be read keeps the light ink over the safe veil.
          else if (veil) veil.style.opacity = SAFE_VEIL.toFixed(3);
          if (veil && d) {
            veil.style.transition = "none";
            veil.style.opacity = d.veil.toFixed(3);
            void veil.offsetWidth;
            veil.style.transition = "";
          }
        });
        behind = -1;
        follow();
      };

      // The swap: each layer's clip as plain numbers, how much of it is still hidden (0 to 1) and the edge it comes
      // from; written in whole pixels of its height.
      const wipe = layers.map((_, i) => ({ a: i === 0 ? 0 : 1, dir: 1 }));
      const paint = (i: number) => {
        const w = wipe[i];
        const px = Math.round(w.a * layers[i].clientHeight);
        // Down the list it comes from the top edge (its foot still hidden), up the list from the bottom edge.
        layers[i].style.clipPath =
          w.dir > 0
            ? `inset(0px 0px ${px}px 0px)`
            : `inset(${px}px 0px 0px 0px)`;
        follow();
      };

      // The list's ink follows the photograph that lies behind the whole list: the topmost layer whose open part
      // covers the list from its top to its foot. So a wipe keeps the outgoing ink until it has passed the list.
      let behind = -1;
      const follow = () => {
        if (!overPhoto) return;
        const base = layers[0].getBoundingClientRect();
        const lr = list.getBoundingClientRect();
        const top = lr.top - base.top;
        const foot = lr.bottom - base.top;
        const order = layers
          .map((_, i) => i)
          .sort(
            (a, b) =>
              (Number(layers[b].style.zIndex) || 0) -
              (Number(layers[a].style.zIndex) || 0),
          );
        let under = order[order.length - 1];
        for (const i of order) {
          const w = wipe[i];
          const h = layers[i].clientHeight;
          const hidden = w.a * h;
          const from = w.dir > 0 ? 0 : hidden;
          const to = w.dir > 0 ? h - hidden : h;
          if (from <= top && to >= foot) {
            under = i;
            break;
          }
        }
        if (under === behind) return;
        behind = under;
        const d = dress[under];
        if (!d) return;
        el.dataset.tone = d.ink;
        rows.forEach((row, k) => (row.dataset.placeInk = d.meta[k] ?? "foot"));
        footer();
      };

      let z = layers.length + 1;
      layers.forEach((l, i) => {
        l.style.zIndex = i === 0 ? String(z) : "0";
        paint(i);
      });
      let current = 0;
      let want = 0;

      const mark = (i: number) => {
        rows.forEach((r, j) => {
          if (j === i) r.dataset.current = "";
          else delete r.dataset.current;
        });
      };

      const swap = (i: number, from: number) => {
        const dir = i > from ? 1 : -1;
        // Back to a photograph that still shows under the ones wiping over it: those draw back the way they came, and
        // it is never re-hidden.
        if (wipe[i].a < 0.995) {
          const zi = Number(layers[i].style.zIndex) || 0;
          for (let j = 0; j < layers.length; j += 1) {
            const wj = wipe[j];
            if (
              j === i ||
              wj.a >= 1 ||
              (Number(layers[j].style.zIndex) || 0) <= zi
            )
              continue;
            gsap.killTweensOf(wj);
            if (reduce) {
              wj.a = 1;
              paint(j);
            } else {
              gsap.to(wj, {
                a: 1,
                duration: WIPE * 0.8,
                ease: "expo.out",
                onUpdate: () => paint(j),
              });
            }
          }
          const wi = wipe[i];
          if (wi.a > 0) {
            gsap.killTweensOf(wi);
            if (reduce) {
              wi.a = 0;
              paint(i);
            } else {
              gsap.to(wi, {
                a: 0,
                duration: WIPE,
                ease: "expo.out",
                onUpdate: () => paint(i),
              });
            }
          }
          return;
        }
        const w = wipe[i];
        gsap.killTweensOf(w);
        w.dir = dir;
        w.a = 1;
        layers[i].style.zIndex = String(++z);
        paint(i);
        const done = () => {
          // Only the photograph on top stays open, so the next wipe always covers a whole picture.
          for (let j = 0; j < layers.length; j += 1) {
            if (j === i || j === current) continue;
            wipe[j].a = 1;
            paint(j);
          }
        };
        if (reduce) {
          w.a = 0;
          paint(i);
          done();
          return;
        }
        gsap.to(w, {
          a: 0,
          duration: WIPE,
          ease: "expo.out",
          onUpdate: () => paint(i),
          onComplete: done,
        });
      };

      const show = (i: number) => {
        want = i;
        if (i === current) return;
        const go = () => {
          if (gone || want !== i || i === current) return;
          const from = current;
          current = i;
          swap(i, from);
        };
        if (decoded[i]) go();
        else ready[i].then(go);
      };

      // The entrance: once every photograph is decoded and the side and inks are settled (at most 1.6s), the names
      // rise one by one once nothing covers the page.
      if (!reduce) gsap.set(rise, { y: 0, yPercent: 115 });
      el.dataset.ready = "";
      let stop = () => {};
      let driftTween: gsap.core.Tween | null = null;
      const allReady = Promise.race([
        Promise.all([...ready, document.fonts?.ready ?? Promise.resolve()]),
        new Promise((r) => setTimeout(r, 1600)),
      ]);
      allReady.then(() => {
        if (gone) return;
        settle();
        const play = contextSafe(() => {
          if (reduce) {
            gsap.set(rise, { yPercent: 0 });
            return;
          }
          gsap.to(rise, {
            yPercent: 0,
            duration: 1.15,
            ease: "expo.out",
            stagger: 0.08,
            delay: covered() ? 0.1 : 0.25,
          });
          // The drift: a very slow travel of the whole stack, written in whole pixels so the photograph never
          // shimmers between them.
          const drift = el.querySelector<HTMLElement>("[data-drift]");
          if (drift) {
            const pos = { x: 0, y: 0 };
            let lx = 0;
            let ly = 0;
            driftTween = gsap.to(pos, {
              x: -0.012,
              y: 0.008,
              duration: 28,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              onUpdate: () => {
                const x = Math.round(pos.x * drift.offsetWidth);
                const y = Math.round(pos.y * drift.offsetHeight);
                if (x === lx && y === ly) return;
                lx = x;
                ly = y;
                drift.style.transform = `translate3d(${x}px, ${y}px, 0)`;
              },
            });
          }
        });
        stop = whenUncovered(play);
      });
      // A photograph decoded after the settle (a slow network) is dressed for the side already chosen.
      ready.forEach((p, i) =>
        p.then(() => {
          if (gone || !overPhoto || dress[i] || !el.dataset.tone) return;
          dress[i] = dressFor(i, places());
          const d = dress[i];
          const veil = veils[i];
          if (d && veil) veil.style.opacity = d.veil.toFixed(3);
        }),
      );

      // When the scroll walks the list, the pointer swaps nothing; the scroll does.
      const fine = window.matchMedia(FINE).matches && !walks;
      let back = 0;

      // The walk: the hero holds while the scroll runs from the first project to the last. Each photograph has the
      // stretch before it; it rises from the bottom edge over the middle of that stretch (the photo rests between),
      // scrubbed, so scrolling back draws it down the way it came. The layers stack in list order.
      let walk: ScrollTrigger | undefined;
      if (walks && layers.length > 1) {
        const n = layers.length;
        const ease = gsap.parseEase("power2.inOut");
        const pos = { p: 0 };
        let at = 0;
        layers.forEach((l, k) => (l.style.zIndex = String(k + 1)));
        const render = () => {
          for (let k = 1; k < n; k += 1) {
            const t = Math.min(1, Math.max(0, (pos.p - (k - 1) - 0.15) / 0.7));
            const a = reduce ? (t >= 0.5 ? 0 : 1) : 1 - ease(t);
            if (a === wipe[k].a && wipe[k].dir < 0) continue;
            wipe[k].a = a;
            wipe[k].dir = -1;
            paint(k);
          }
          const now = Math.min(n - 1, Math.round(pos.p));
          if (now === at && rows[now]?.dataset.current !== undefined) return;
          at = now;
          current = now;
          shownRow = now;
          mark(now);
          footer();
        };
        list.dataset.active = "";
        render();
        walk = gsap
          .timeline({
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: () => `+=${Math.round((n - 1) * 0.6 * window.innerHeight)}`,
              pin: true,
              scrub: reduce ? true : 0.3,
              invalidateOnRefresh: true,
            },
          })
          .to(pos, { p: n - 1, ease: "none", duration: 1, onUpdate: render })
          .scrollTrigger;
      }
      // A name focused from the keyboard scrolls the page to its stretch.
      const walkTo = (i: number) => {
        if (!walk) return;
        const y = walk.start + (i / Math.max(1, rows.length - 1)) * (walk.end - walk.start);
        window.scrollTo({ top: Math.round(y), behavior: reduce ? "auto" : "smooth" });
      };
      const enter = (i: number) => {
        shownRow = i;
        footer();
        window.clearTimeout(back);
        mark(i);
        list.dataset.active = "";
        show(i);
      };
      const leave = () => {
        shownRow = -1;
        footer();
        mark(-1);
        delete list.dataset.active;
        window.clearTimeout(back);
        back = window.setTimeout(() => !gone && show(0), RETURN * 1000);
      };
      const onEnter = rows.map((row, i) => {
        const fn = () => enter(i);
        if (fine) row.addEventListener("pointerenter", fn);
        return fn;
      });
      const onFocus = rows.map((row, i) => {
        const fn = () => {
          if (!row.matches(":focus-visible")) return;
          if (walks) walkTo(i);
          else enter(i);
        };
        row.addEventListener("focus", fn);
        return fn;
      });
      const onFocusOut = (e: FocusEvent) => {
        if (walks) return;
        if (!list.contains(e.relatedTarget as Node | null)) leave();
      };
      if (fine) list.addEventListener("pointerleave", leave);
      list.addEventListener("focusout", onFocusOut);
      let resizing = 0;
      const onResize = () => {
        layers.forEach((_, i) => paint(i));
        window.clearTimeout(resizing);
        resizing = window.setTimeout(settle, 200);
      };
      window.addEventListener("resize", onResize);

      return () => {
        gone = true;
        stop();
        driftTween?.kill();
        window.clearTimeout(back);
        window.clearTimeout(resizing);
        window.removeEventListener("resize", onResize);
        rows.forEach((row, i) => {
          row.removeEventListener("pointerenter", onEnter[i]);
          row.removeEventListener("focus", onFocus[i]);
          delete row.dataset.current;
          delete row.dataset.placeInk;
        });
        list.removeEventListener("pointerleave", leave);
        list.removeEventListener("focusout", onFocusOut);
        delete list.dataset.active;
        delete el.dataset.ready;
        delete el.dataset.tone;
        if (foot) {
          foot.textContent = "";
          delete foot.dataset.on;
        }
        if (labelSide) el.dataset.side = labelSide;
        const drift = el.querySelector<HTMLElement>("[data-drift]");
        if (drift) drift.style.transform = "";
        for (const l of layers) {
          l.style.clipPath = "";
          l.style.zIndex = "";
          l.removeAttribute("data-unfit");
        }
      };
    },
    { scope: root, dependencies: [items.length, side, variant] },
  );

  // The window stands on the side away from the list: wide screens beside it, phones above it.
  const windowBox =
    listSide === "left"
      ? // sheet-allow: the window's inner edge at 54vw leaves the list its half
        "absolute inset-x-sheet-margin top-6 h-[38svh] overflow-hidden md:inset-x-auto md:top-[7svh] md:bottom-[7svh] md:left-[54vw] md:right-sheet-margin md:h-auto"
      : // sheet-allow: the window's inner edge at 54vw leaves the list its half
        "absolute inset-x-sheet-margin top-6 h-[38svh] overflow-hidden md:inset-x-auto md:top-[7svh] md:bottom-[7svh] md:left-sheet-margin md:right-[54vw] md:h-auto";

  return (
    <section
      ref={root}
      data-hero-index=""
      data-variant={variant}
      data-side={variant === "lijst" ? (items[0]?.image.negativeSpace === "right" ? "right" : "left") : listSide}
      className={`group/hero relative h-svh min-h-[30rem] overflow-hidden bg-surface-0 ${overPhoto ? "text-on-photo" : "text-ink"} ${className}`}
    >
      {/* The photo box: what a preloader lands on. The layers stack inside it; only the first shows without scripts. */}
      <div data-stack-target="" className={overPhoto ? "absolute inset-0 overflow-hidden" : windowBox}>
        <div data-drift="" className="absolute -inset-[2%]">
          {items.map((item, i) => (
            <div
              key={item.href + i}
              data-layer=""
              className="absolute inset-0"
              style={{
                clipPath:
                  i === 0
                    ? "inset(0px 0px 0px 0px)"
                    : "inset(0px 0px 100% 0px)",
                zIndex: i === 0 ? 1 : 0,
              }}
            >
              <Image
                src={item.image.src}
                alt={i === 0 ? item.image.alt : ""}
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                sizes={overPhoto ? "100vw" : "(min-width: 768px) 42vw, 100vw"}
                unoptimized={item.image.unoptimized}
                className="object-cover"
                style={item.focus ? { objectPosition: item.focus } : undefined}
              />
              <div
                data-veil=""
                aria-hidden="true"
                className="absolute inset-0"
              />
            </div>
          ))}
        </div>
      </div>

      <nav
        aria-label="Werk"
        className={
          walks
            ? "absolute inset-0 z-10 flex flex-col items-center justify-center px-sheet-margin"
            : "absolute inset-x-0 bottom-0 z-10 px-sheet-margin pb-[7svh] md:pb-[6svh]"
        }
      >
        <ul
          data-list=""
          className={
            walks
              ? "group/list flex flex-col items-center"
              : "group/list flex flex-col group-data-[side=right]/hero:items-end"
          }
        >
          {items.map((item, i) => (
            <li key={item.href + i}>
              {/* One focus ring, on the link itself, outside the line's mask, so nothing clips it. */}
              <a
                data-row=""
                href={item.href}
                className="group/row block w-fit rounded-[0.15rem] py-[0.2svh] outline-offset-[0.35rem] transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-current group-data-[active]/list:not-data-[current]:opacity-80"
              >
                {/* The shared line mask carries the name's size, so its room is the name's; leading 0 keeps the
                    line box to the name and its place line. */}
                <span className={`struq-line-mask block leading-[0] ${NAME_SIZE}`}>
                  <span data-rise="" className="block">
                    {/* The place line stands right-aligned under its name. */}
                    <span
                      data-text=""
                      className="inline-flex flex-col items-end transition-[translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[current]/row:translate-x-[1.2vw] group-data-[side=right]/hero:group-data-[current]/row:-translate-x-[1.2vw]"
                    >
                      <span
                        data-name=""
                        className={`font-display whitespace-nowrap leading-[0.98] tracking-[-0.035em] ${NAME_SIZE}`}
                      >
                        {names[i]}
                      </span>
                      <span
                        data-meta=""
                        className="text-small mt-[1.1svh] whitespace-nowrap pb-[0.3svh]"
                      >
                        {item.place}, {item.year}
                      </span>
                    </span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        {/* A place line that cannot hold its own ink over the photo stands here, under the list, in the list's ink. */}
        <p
          data-foot=""
          aria-hidden="true"
          className={`text-small mt-[1.6svh] min-h-[1.5em] whitespace-nowrap ${walks ? "text-center" : "group-data-[side=right]/hero:text-right"}`}
        />
      </nav>
    </section>
  );
}
