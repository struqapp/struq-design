"use client";
// hero-framed (Struq hero recipe)
// The first screen as a gallery wall. One photograph hung at the centre of the page ground, about a third of the
// screen, with four fine registration marks at its corners; beside it a small museum label (the studio's name, its
// line, the place), and under the frame a tiny caption (title, year). On load the marks draw in from the corners and
// the photograph opens inside them, then the label rises line by line. On the first scroll you walk up to the print:
// the frame opens to the whole screen while the marks travel out to the screen's corners and go, the label and the
// caption leave through their masks, and the photograph becomes the ground for the next line of copy, which rises on
// its calm side.
//
// Registration: the photograph is one full-screen layer (data-stack-photo) inside the frame (data-stack-target), at
// the screen's own origin, so the frame always shows that part of the full-screen picture, and opening it is a clip
// from whole-pixel numbers, never a scale. A stack preloader or page transition lands its print on the frame with
// the photograph laid as that layer. The copy over the open photograph is set on the side that needs the weaker
// veil, measured from the photograph itself (3:1 for the heading, 4.5:1 for the line), the veil kept light.
//
// The first paint is the composed wall. With scripts and motion the marks, the photograph and the label wait for the
// entrance (blocks.css, "--- hero-framed ---") and show after 3s if the script never comes; whether that fallback
// already ran is read once from the element itself. Under a closing cover the frame stands open and the rest
// arrives in the cover's wake. The pin is 150%, the holds as long as the move.
// Lead for a photographer, a gallery, an architect, an atelier: any brief where one image carries the work.
//
// <HeroFramed image={images.hero[1]} name="Noord" line="Architectuur en bouw" place="Rotterdam, sinds 2011"
//   caption="Binnenplaats met olijf, 2024" heading={["Ruimte die", "het licht volgt."]} accent="licht" lead="..." />
//
// `accent` (optional) is the site's one accent word: where it first stands in the heading (the line on the open
// photograph) it is set in the pairing's italic accent face, inside its line's mask, as the Statement and the Close
// set the same word. Left out, or not in the heading, the heading is exactly as it was.
//
// Phones: the frame larger (about 80% of the width), the label under it, the entrance only; the next line follows
// on the ground. Reduced motion and pages without scripts: the composed wall, then the line.
//
// Three variants, the same print on the same wall:
// - wand (default): the above. A small landscape print at the centre, the label beside it; you walk up to it.
// - portret: the type takes the room. The studio's name set large on the wall at the left, a tall portrait print
//   hung high at the right edge. On the first scroll the print opens from the edge across the wall, over the name,
//   to the whole screen, and the next line rises on its calm side.
// - passe: the image takes the room. The print nearly fills the screen inside a thin mat of the ground, the label in
//   the mat. On the first scroll you step back: the print closes (the same clip, run toward a smaller box) to a
//   small portrait at the left, the marks follow its corners in, and the next line rises on the wall beside it, in
//   ink, with no veil.
import Image from "next/image";
import { useRef } from "react";
import { accentLines } from "../kit/accent";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances } from "../kit/photo-read";
import { covered, whenUncovered } from "../preloaders/preloader-slices-uncovered";

export const HERO_FRAMED_VARIANTS = [
  { id: "wand", title: "Wand" },
  { id: "portret", title: "Portret" },
  { id: "passe", title: "Passe-partout" },
] as const;

export type HeroFramedVariant = (typeof HERO_FRAMED_VARIANTS)[number]["id"];

type Props = {
  /** The composition; the first is the default. */
  variant?: HeroFramedVariant;
  image: StruqImage;
  /** The studio's name, set as the label's title. */
  name: string;
  /** The label's second line: the discipline. */
  line?: string;
  /** The label's third line: place, year. */
  place?: string;
  /** The caption under the frame: the photograph's title and year. */
  caption?: string;
  /** The next line of copy, standing on the open photograph; one entry per line. */
  heading: string[];
  /** The site's one accent word: where it first stands in the heading it is set in the pairing's italic accent face
   * (--face-accent), as the Statement and the Close set it. A word the heading does not hold changes nothing. */
  accent?: string;
  /** One sentence under it. */
  lead?: string;
  className?: string;
};

/** The longest the fit waits for the display face (the CSS fallback is at 3s). */
const FONT_WAIT = 2600;
/** The heaviest veil the copy may take over the open photograph. */
const VEIL_MAX = 0.45;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
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

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/** Each variant's wide-screen layout: the frame, the photograph's resting registration, the label, the name's size. */
const LAYOUT: Record<HeroFramedVariant, { vars: Record<string, string>; frame: string; photo: string; label: string; name: string }> = {
  wand: {
    // The frame: 3:2, about a third of the screen on wide screens, never taller than 60% of it.
    vars: { "--hf-fw": "min(56vw, 90svh)", "--hf-fh": "calc(var(--hf-fw) / 1.5)" },
    frame:
      "md:absolute md:left-[calc(50%_-_var(--hf-fw)/2)] md:top-[calc(50%_-_var(--hf-fh)/2)] md:mx-0 md:aspect-auto md:h-[var(--hf-fh)] md:w-[var(--hf-fw)]",
    photo: "md:left-[calc(var(--hf-fw)/2_-_50vw)] md:top-[calc(var(--hf-fh)/2_-_50svh)]",
    label: "md:absolute md:bottom-[calc(50%_-_var(--hf-fh)/2)] md:left-[calc(50%_+_var(--hf-fw)/2_+_3vw)] md:right-sheet-margin md:mt-0",
    name: "clamp(2.25rem, 1rem + 2.4vw, 3.5rem)",
  },
  portret: {
    // A 3:4 portrait, about three quarters of the screen's height, hung a little high at the right edge.
    vars: { "--hf-fw": "min(36vw, 57svh)", "--hf-fh": "calc(var(--hf-fw) / 0.75)" },
    frame:
      // sheet-allow: the print hangs 6vw in from the wall's edge, its own distance; the registration below follows it
      "md:absolute md:right-[6vw] md:top-[calc(50%_-_var(--hf-fh)/2_-_3svh)] md:z-[1] md:mx-0 md:aspect-auto md:h-[var(--hf-fh)] md:w-[var(--hf-fw)]",
    photo: "md:left-[calc(var(--hf-fw)_+_6vw_-_100vw)] md:top-[calc(var(--hf-fh)/2_+_3svh_-_50svh)]",
    label:
      "md:absolute md:bottom-[calc(50%_-_var(--hf-fh)/2_+_3svh)] md:left-sheet-margin md:right-[calc(10vw_+_var(--hf-fw))] md:mt-0",
    name: "clamp(4.5rem, 1rem + 11vw, 16rem)",
  },
  passe: {
    // The print inside a thin mat of the ground, the mat wider at the foot where the label sits. It steps back to a
    // 4:5 portrait (--hf-tw by --hf-th) at the left, standing in the middle of the screen's height.
    vars: { "--hf-tw": "min(30vw, 52svh)", "--hf-th": "calc(var(--hf-tw) * 1.25)" },
    frame: "md:absolute md:inset-x-sheet-margin md:bottom-[18svh] md:top-[5svh] md:mx-0 md:aspect-auto md:w-auto",
    photo: "md:-left-sheet-margin md:-top-[5svh]",
    label: "md:absolute md:bottom-[3svh] md:right-sheet-margin md:mt-0 md:w-[34vw] md:text-right",
    name: "clamp(1.75rem, 0.8rem + 1.6vw, 2.75rem)",
  },
};

export function HeroFramed({ variant = "wand", image, name, line, place, caption, heading, accent, lead, className = "" }: Props) {
  const lay = LAYOUT[variant] ?? LAYOUT.wand;
  const back = variant === "passe";
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = <T extends HTMLElement = HTMLElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
      const wall = el.querySelector<HTMLElement>("[data-hf-wall]");
      const frame = el.querySelector<HTMLElement>("[data-hf-frame]");
      const photo = el.querySelector<HTMLElement>("[data-stack-photo]");
      const nameEl = el.querySelector<HTMLElement>("[data-hf-name]");
      if (!wall || !frame || !photo || !nameEl) return;
      let dead = false;

      // Whether the CSS fallback already showed the wall: the first label line rests at 0. Read once per element.
      if (!el.dataset.hfFirst) {
        const first = el.querySelector<HTMLElement>("[data-hf-rise]");
        const rest = first ? getComputedStyle(first).translate : "none";
        const y = rest === "none" ? 0 : parseFloat(rest.trim().split(/\s+/)[1] ?? "0");
        el.dataset.hfFirst = y === 0 ? "late" : "gated";
      }
      const late = el.dataset.hfFirst === "late";

      // The label's name fitted to the room beside the frame, with the face loaded: its CSS size, or smaller when a
      // wide face would run past its column (so the script never makes it jump larger than the first paint).
      const fitName = () => {
        const col = el.querySelector<HTMLElement>("[data-hf-label]");
        if (!col) return;
        el.style.removeProperty("--hf-name");
        const max = parseFloat(getComputedStyle(nameEl).fontSize) || 48;
        const c = nameEl.cloneNode(true) as HTMLElement;
        Object.assign(c.style, { position: "absolute", visibility: "hidden", fontSize: "100px", whiteSpace: "nowrap" });
        nameEl.parentElement?.appendChild(c);
        const width = c.offsetWidth;
        c.remove();
        const size = width > 0 ? Math.min(max, (100 * col.clientWidth) / width) : max;
        el.style.setProperty("--hf-name", `${Math.floor(size)}px`);
      };

      // The photograph at the screen's origin inside the frame (phones: simply the frame's own crop).
      const place = () => {
        if (el.clientWidth < 768) {
          for (const p of ["left", "top", "width", "height"] as const) photo.style[p] = "";
          return;
        }
        const r = frame.getBoundingClientRect();
        const b = wall.getBoundingClientRect();
        Object.assign(photo.style, {
          left: `${Math.round(b.left - r.left)}px`,
          top: `${Math.round(b.top - r.top)}px`,
          width: `${wall.clientWidth}px`,
          height: `${wall.clientHeight}px`,
        });
      };

      // The copy over the open photograph: the side (left or right) and ink that need the weaker veil, measured.
      const tone = () => {
        const img = photo.querySelector("img");
        const copy = el.querySelector<HTMLElement>("[data-hf-copy]");
        if (!img || !copy || !copy.offsetParent) return;
        const probe = (k: string) => {
          const n = el.querySelector<HTMLElement>(`[data-ink='${k}']`);
          return n ? luminanceOf(getComputedStyle(n).color) : 0;
        };
        const light = probe("light");
        const dark = probe("dark");
        const W = wall.clientWidth;
        const H = wall.clientHeight;
        const screen = { x: 0, y: 0, w: W, h: H };
        const parts = [
          { n: copy.querySelector<HTMLElement>("h2"), ratio: 3, tail: 0.1 },
          { n: copy.querySelector<HTMLElement>("p"), ratio: 4.5, tail: 0.03 },
        ];
        const base = wall.getBoundingClientRect();
        const cb = copy.getBoundingClientRect();
        // Where the copy block would stand at the foot (10% up from the bottom) or the top (10% down) of the photo.
        const tops = { foot: H * 0.9 - cb.height, top: H * 0.1 };
        const nowSide = el.dataset.side === "right" ? "right" : "left";
        const nowPos = el.dataset.pos === "top" ? "top" : "foot";
        const try_ = (sideTo: "left" | "right", pos: "foot" | "top") => {
          let d = 0;
          let l = 0;
          // How busy the photograph is under the small line (its tonal spread, as the eye sees it): a contrast that
          // passes over frost or gravel still reads mottled.
          let busy = 0;
          for (const p of parts) {
            if (!p.n) continue;
            const b = p.n.getBoundingClientRect();
            let box = {
              x: b.left - base.left - 12,
              y: tops[pos] + (b.top - cb.top) - 12,
              w: b.width + 24,
              h: b.height + 24,
            };
            if (sideTo !== nowSide) box = { ...box, x: W - box.x - box.w };
            const ys = photoLuminances(img, screen, box);
            if (!ys) return null;
            const lo = ys[Math.floor(ys.length * p.tail)];
            const hi = ys[Math.floor(ys.length * (1 - p.tail))];
            d = Math.max(d, veilFor(lo, dark, encode(light), p.ratio));
            l = Math.max(l, veilFor(hi, light, encode(dark), p.ratio));
            if (p.ratio > 3) busy = Math.max(busy, encode(ys[Math.floor(ys.length * 0.9)]) - encode(ys[Math.floor(ys.length * 0.1)]));
          }
          const veil = Math.min(d, l);
          return { dark: d <= l, veil, busy, score: veil + busy, side: sideTo, pos };
        };
        // The foot first, on either side; the top of either side when the foot cannot reach the ratio within the light
        // veil, or reads busy under the line, and the top is clearly calmer. A photograph that cannot be read keeps the
        // foot and the heaviest light veil.
        const other = nowSide === "left" ? "right" : "left";
        const foot = [try_(nowSide, "foot"), try_(other, "foot")].filter((c) => c !== null);
        const head = [try_(nowSide, "top"), try_(other, "top")].filter((c) => c !== null);
        const best = (cs: typeof foot) => cs.reduce<(typeof foot)[number] | null>((a, c) => (!a || c.score + 0.02 < a.score ? c : a), null);
        let pick = best(foot);
        const up = best(head);
        if (pick && up && (pick.veil > VEIL_MAX || pick.busy > 0.12) && up.score + 0.05 < pick.score) pick = up;
        const chosen = pick ?? { dark: false, veil: VEIL_MAX, busy: 0, score: VEIL_MAX, side: nowSide, pos: nowPos };
        el.dataset.side = chosen.side;
        el.dataset.pos = chosen.pos;
        el.dataset.tone = chosen.dark ? "dark" : "light";
        // Still over the light veil's limit, or still over a busy patch: the lead, which is body text, takes one weight
        // step and a little size.
        if (chosen.veil > VEIL_MAX + 0.005 || chosen.busy > 0.12) el.dataset.strong = "1";
        else delete el.dataset.strong;
        const v = el.querySelector<HTMLElement>("[data-hf-veil]");
        if (v) v.style.opacity = clamp(chosen.veil, 0, VEIL_MAX).toFixed(3);
      };

      const listeners: Array<() => void> = [];
      const refit = () => {
        if (dead) return;
        fitName();
        place();
        for (const f of listeners) f();
        tone();
      };
      const faceIn = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, FONT_WAIT))]);
      fitName();
      place();
      faceIn.then(refit);
      const onFonts = () => refit();
      document.fonts?.addEventListener?.("loadingdone", onFonts);
      window.addEventListener("resize", refit);

      // The photograph decoded ahead of its first show; its tone read once it is in.
      for (const img of q<HTMLImageElement>("img")) {
        const go = () => {
          img.decode?.().catch(() => {});
          tone();
        };
        if (img.complete) go();
        else img.addEventListener("load", go, { once: true });
      }

      const rises = q("[data-hf-rise]");
      const copyRise = q("[data-hf-copy-rise]");
      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          phone: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const wide = Boolean(ctx.conditions?.wide);
          const marks = q("[data-hf-mark]");
          const veil = el.querySelector<HTMLElement>("[data-hf-veil-on]");

          // Every value the entrance and the scroll drive: the marks drawn, the photograph open, the grow.
          const s = { draw: late ? 1 : 0, open: late || covered() ? 1 : 0, grow: 0 };
          const g = { W: 1, H: 1, f: { x: 0, y: 0, w: 1, h: 1 }, to: { x: 0, y: 0, w: 1, h: 1 } };
          const toBox = el.querySelector<HTMLElement>("[data-hf-to]");
          const measure = () => {
            g.W = wall.clientWidth;
            g.H = wall.clientHeight;
            const r = frame.getBoundingClientRect();
            const b = wall.getBoundingClientRect();
            g.f = { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
            // Where the scroll carries the print: the whole screen, or (passe) the smaller box it steps back to.
            const t = back && toBox ? toBox.getBoundingClientRect() : null;
            g.to = t ? { x: t.left - b.left, y: t.top - b.top, w: t.width, h: t.height } : { x: 0, y: 0, w: g.W, h: g.H };
          };
          const paint = () => {
            // The marks: drawn in toward the corners (each arm grows from the corner, the mark slides in a little),
            // then carried out to the screen's corners as the frame opens, going as they arrive.
            for (const m of marks) {
              const at = m.dataset.hfMark as Corner;
              const sx = at[1] === "l" ? -1 : 1;
              const sy = at[0] === "t" ? -1 : 1;
              const inX = Math.round(sx * 24 * (1 - s.draw));
              const inY = Math.round(sy * 24 * (1 - s.draw));
              const cornerX = at[1] === "l" ? g.to.x - g.f.x : g.to.x + g.to.w - (g.f.x + g.f.w);
              const cornerY = at[0] === "t" ? g.to.y - g.f.y : g.to.y + g.to.h - (g.f.y + g.f.h);
              const outX = Math.round(cornerX * s.grow);
              const outY = Math.round(cornerY * s.grow);
              m.style.transform = `translate3d(${inX + outX}px, ${inY + outY}px, 0)`;
              // Out to the screen's corners they go as they arrive; stepping back they stay on the smaller print.
              m.style.opacity = back ? "1" : String(clamp(1 - (s.grow - 0.6) / 0.4, 0, 1));
              for (const arm of Array.from(m.children) as HTMLElement[]) {
                arm.style.transform = arm.dataset.arm === "h" ? `scaleX(${s.draw.toFixed(4)})` : `scaleY(${s.draw.toFixed(4)})`;
              }
            }
            if (!wide) {
              const v = ((1 - s.open) * 50).toFixed(3);
              photo.style.clipPath = `inset(${v}% 0% ${v}% 0%)`;
              return;
            }
            // The photograph: from a hairline at the frame's middle to the frame, then to the whole screen.
            const mid = g.f.y + g.f.h / 2;
            const t0 = lerp(mid - 0.5, g.f.y, s.open);
            const b0 = lerp(mid + 0.5, g.f.y + g.f.h, s.open);
            // Whole pixels, rounded inward: the photograph never shows past the frame's own (fractional) box.
            const T = Math.ceil(lerp(t0, g.to.y, s.grow));
            const B = Math.ceil(lerp(g.H - b0, g.H - (g.to.y + g.to.h), s.grow));
            const L = Math.ceil(lerp(g.f.x, g.to.x, s.grow));
            const R = Math.ceil(lerp(g.W - (g.f.x + g.f.w), g.W - (g.to.x + g.to.w), s.grow));
            photo.style.clipPath = `inset(${T}px ${R}px ${B}px ${L}px)`;
            // The veil only where copy will stand on the photograph (never when stepping back).
            if (veil) veil.style.opacity = back ? "0" : clamp((s.grow - 0.5) / 0.5, 0, 1).toFixed(3);
          };

          // The CSS gate lets go first, then the script holds every start itself.
          el.dataset.live = wide ? "wide" : "phone";
          gsap.set(rises, { y: 0, yPercent: late ? 0 : 140 });
          gsap.set(copyRise, { y: 0, yPercent: 140 });
          measure();
          paint();
          const again = () => {
            measure();
            paint();
          };
          listeners.push(again);

          // The entrance, with the face in and nothing covering the page: the marks draw in from the corners, the
          // photograph opens inside them, then the label rises line by line.
          let intro: gsap.core.Timeline | null = null;
          let cancel = () => {};
          if (!late) {
            intro = gsap.timeline({ delay: 0.15, paused: true, onUpdate: paint });
            intro.to(s, { draw: 1, duration: 1.0, ease: "expo.out" }, 0);
            if (s.open < 1) intro.to(s, { open: 1, duration: 1.1, ease: "power3.inOut" }, 0.3);
            intro.to(rises, { yPercent: 0, duration: 1.0, stagger: 0.07, ease: "expo.out" }, 0.75);
            faceIn.then(() => {
              if (!dead) cancel = whenUncovered(() => intro?.play());
            });
          }

          if (wide) {
            // The first scroll: hold on the wall; walk up to the print (the frame opens by registration, the marks
            // go to the screen's corners, the label leaves); the copy rises on the calm side; hold.
            // Portret: the label stays on the wall and the opening print passes over it; only the caption leaves.
            // Passe: the mat's label and the caption leave, the print steps back, the line rises beside it.
            const leave = variant === "portret" ? rises.filter((r) => !r.closest("[data-hf-label]")) : rises;
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              onUpdate: paint,
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: "+=150%",
                pin: true,
                scrub: variant === "wand" ? 1 : 0.4,
                onRefresh: again,
              },
            });
            tl.to({}, { duration: 0.6 })
              .to(leave, { yPercent: -140, duration: 0.45, stagger: 0.03, ease: "power2.in" }, 0.6)
              .to(s, { grow: 1, duration: 1.2, ease: "power3.inOut" }, 0.6)
              .to(copyRise, { yPercent: 0, duration: 0.7, stagger: 0.08, ease: "expo.out" }, back ? 1.35 : 1.6)
              .to({}, { duration: 1.0 }, 2.0);
          }

          return () => {
            cancel();
            intro?.kill();
            listeners.splice(listeners.indexOf(again), 1);
            delete el.dataset.live;
            photo.style.clipPath = "";
            if (veil) veil.style.opacity = "";
            for (const m of marks) {
              m.style.transform = "";
              m.style.opacity = "";
              for (const arm of Array.from(m.children) as HTMLElement[]) arm.style.transform = "";
            }
          };
        },
      );

      return () => {
        dead = true;
        document.fonts?.removeEventListener?.("loadingdone", onFonts);
        window.removeEventListener("resize", refit);
        mm.revert();
      };
    },
    { scope: stage, dependencies: [name, image.src, variant] },
  );

  const mask = "struq-line-mask block";
  const grade = "object-cover [filter:saturate(0.92)_contrast(1.04)]";
  // Inline: the kit balances display type, which must not wrap the label's name; no transition, so the fit reads a
  // settled size.
  const nowrap = { whiteSpace: "nowrap", textWrap: "nowrap", transition: "none" } as React.CSSProperties;

  const mark = (at: Corner) => (
    <span
      key={at}
      data-hf-mark={at}
      aria-hidden
      className={`pointer-events-none absolute z-10 size-[1.1rem] ${at[0] === "t" ? "-top-[0.6rem]" : "-bottom-[0.6rem]"} ${
        at[1] === "l" ? "-left-[0.6rem]" : "-right-[0.6rem]"
      }`}
    >
      <span
        data-arm="h"
        className={`absolute h-px w-full bg-ink ${at[0] === "t" ? "top-0" : "bottom-0"} ${
          at[1] === "l" ? "left-0 origin-left" : "right-0 origin-right"
        }`}
      />
      <span
        data-arm="v"
        className={`absolute h-full w-px bg-ink ${at[1] === "l" ? "left-0" : "right-0"} ${
          at[0] === "t" ? "top-0 origin-top" : "bottom-0 origin-bottom"
        }`}
      />
    </span>
  );

  const ink = "text-on-photo group-data-[tone=dark]/hf:text-[var(--hf-dark)]";
  // Where the next line stands: on the open photograph (measured side and veil), on the wall beside the print it
  // stepped back to (passe, plain ink), or on the ground under the wall (phones, reduced motion, no scripts).
  const copyBlock = (at: "photo" | "wall" | "ground") => {
    const overlay = at === "photo";
    const moves = at !== "ground";
    return (
    <div
      data-hf-copy={overlay ? "" : undefined}
      className={
        overlay
          ? `absolute bottom-[10svh] max-w-[44rem] px-sheet-margin group-data-[pos=top]/hf:bottom-auto group-data-[pos=top]/hf:top-[10svh] ${ink} group-data-[side=right]/hf:right-0 group-data-[side=right]/hf:text-right group-data-[side=left]/hf:left-0`
          : at === "wall"
            ? // sheet-allow: beside the stepped-back print, mirroring its 6vw from the wall
              "absolute left-[calc(12vw_+_var(--hf-tw))] right-[6vw] top-1/2 -translate-y-1/2 text-ink"
            : "px-sheet-margin pb-20 pt-6 text-ink md:pb-[14svh]"
      }
    >
      <h2 className="m-0 font-display text-[clamp(2.5rem,1rem_+_4.4vw,6.5rem)] leading-[0.95] tracking-[-0.03em]">
        {accentLines(heading, accent).map((h, i) => (
          <span key={heading[i]} className={mask}>
            <span data-hf-copy-rise={moves ? "" : undefined} className="block">
              {h}
            </span>
          </span>
        ))}
      </h2>
      {lead ? (
        <p className="m-0 mt-6 text-lead">
          <span className="struq-line-mask block">
            <span
              data-hf-copy-rise={moves ? "" : undefined}
              className={`block max-w-[36ch] ${overlay ? "group-data-[side=right]/hf:ml-auto group-data-[strong]/hf:text-[1.2em] group-data-[strong]/hf:font-medium" : "text-ink-muted"}`}
            >
              {lead}
            </span>
          </span>
        </p>
      ) : null}
    </div>
    );
  };

  return (
    <section
      ref={stage}
      data-hero-framed=""
      data-variant={variant}
      data-side="left"
      data-tone="light"
      aria-label={name}
      className={`group/hf relative bg-surface-0 ${className}`}
      style={
        {
          ...lay.vars,
          "--hf-name-css": lay.name,
          "--hf-dark": "oklch(from var(--surface-0) min(calc(l * 0.42), 0.19) c h)",
        } as React.CSSProperties
      }
    >
      <h1 className="sr-only">{`${name}${line ? `, ${line}` : ""}`}</h1>
      {/* The inks as this palette resolves them, read once to measure contrast. */}
      <span aria-hidden className="pointer-events-none absolute size-0 overflow-hidden">
        <span data-ink="light" className="text-on-photo" />
        <span data-ink="dark" className="text-[var(--hf-dark)]" />
      </span>

      <div data-hf-wall="" className="relative px-sheet-margin pb-14 pt-[12svh] md:h-svh md:overflow-hidden md:p-0">
        {/* The frame: the box a stack preloader lands on, the photograph inside it registered to the screen. */}
        <div
          data-hf-frame=""
          data-stack-target=""
          className={`relative mx-auto aspect-[4/5] w-[80vw] ${lay.frame}`}
        >
          <div className="absolute inset-0 overflow-hidden bg-surface-2 group-data-[live=wide]/hf:overflow-visible group-data-[live=wide]/hf:bg-transparent">
            <div data-stack-photo="" className={`absolute inset-0 md:inset-auto ${lay.photo} md:h-svh md:w-screen`}>
              <Image src={image.src} alt={image.alt} fill priority sizes="100vw" unoptimized={image.unoptimized} className={grade} />
              {/* The veil the copy needs over the open photograph, coming in with the open; light, measured. */}
              <div data-hf-veil-on="" aria-hidden className="absolute inset-0 opacity-0">
                <div
                  data-hf-veil=""
                  className="absolute inset-0 bg-[var(--hf-dark)] group-data-[tone=dark]/hf:bg-on-photo"
                  style={{ opacity: 0.3 }}
                />
              </div>
            </div>
          </div>
          {CORNERS.map(mark)}
          {/* The caption under the frame. */}
          {caption ? (
            <p className="absolute left-0 top-[calc(100%_+_1rem)] m-0 text-small text-ink-muted">
              <span className={mask}>
                <span data-hf-rise="" className="block">
                  {caption}
                </span>
              </span>
            </p>
          ) : null}
        </div>

        {/* The box the passe print steps back to, read for its place and size. */}
        {back ? (
          <div
            data-hf-to=""
            aria-hidden
            // sheet-allow: the stepped-back print hangs 6vw in from the wall's edge, a composition offset
            className="pointer-events-none invisible absolute left-[6vw] top-[calc(50%_-_var(--hf-th)/2)] hidden h-[var(--hf-th)] w-[var(--hf-tw)] md:block"
          />
        ) : null}

        {/* The museum label: beside the frame (wand), large on the wall (portret) or in the mat (passe) on wide
            screens, aligned to the frame's foot; under it on phones. */}
        <div data-hf-label="" className={`mt-14 ${lay.label}`}>
          <p className="m-0 font-display text-[length:var(--hf-name,var(--hf-name-css))] leading-[0.95] tracking-[-0.02em] text-ink">
            <span className={mask}>
              <span data-hf-rise="" className="block">
                <span data-hf-name="" className="inline-block" style={nowrap}>
                  {name}
                </span>
              </span>
            </span>
          </p>
          {line ? (
            <p className="m-0 mt-3 text-small text-ink">
              <span className={mask}>
                <span data-hf-rise="" className="block">
                  {line}
                </span>
              </span>
            </p>
          ) : null}
          {place ? (
            <p className="m-0 mt-1 text-small text-ink-muted">
              <span className={mask}>
                <span data-hf-rise="" className="block">
                  {place}
                </span>
              </span>
            </p>
          ) : null}
        </div>

        {/* The next line, over the open photograph or beside the stepped-back print (wide screens with motion, once
            scripts run). */}
        <div className="pointer-events-none absolute inset-0 z-20 hidden md:motion-safe:[:is(.js,.sq-js)_&]:block">
          {copyBlock(back ? "wall" : "photo")}
        </div>
      </div>

      {/* The next line on the ground: phones, reduced motion and pages without scripts. */}
      <div className="md:motion-safe:[:is(.js,.sq-js)_&]:hidden">{copyBlock("ground")}</div>
    </section>
  );
}
