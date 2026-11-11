"use client";
// hero-poster (Struq hero recipe)
// The first screen as a poster on a wall. Two lines of type, each fitted edge to edge at poster scale, and between
// them a narrow letterbox window onto a photo; a quiet foot line (the place, one link) at the bottom. On load the
// lines rise through their masks one after the other and the window opens from a hairline to its slot. On the first
// scroll the poster parts: the upper line goes up and out, the lower line and the foot go down and out, and the window
// opens into the full photo, which holds full bleed while the next section takes over.
//
// Registration: the photo is one full-screen layer (data-stack-photo) inside the window (data-stack-target), placed
// at the screen's own origin, so the window always shows that part of the full-screen picture: in the composed
// poster, without scripts, and while it opens. Opening it is a clip from whole-pixel numbers, never a scale. A stack
// preloader or page transition lands its print on the window with the photo laid as the full-screen layer.
//
// The type is fitted to the width with the display face loaded, and fitted again when the face arrives late. The
// sizes are two custom properties on the section, and the photo's place in the window is computed from them, so the
// registration holds in CSS too. Before the script, and without it, a cautious estimate per line keeps the poster on
// screen. With scripts and motion the lines wait below their masks and the window is a hairline from the first
// paint (blocks.css, "--- hero-poster ---"); both open after 3s if the script never comes. Under a closing cover the
// window stands open and the lines rise in the cover's wake. The pin is 150%, holds as long as the move.
// Lead for a studio, an architect, a brand with a strong name: any brief where the words are the picture.
//
// <HeroPoster image={images.hero[1]} lines={["Noord bouwt", "met daglicht"]} place="Architectuur en bouw, Rotterdam"
//   link={{ label: "Bekijk het werk", href: "#werk" }} />
//
// Phones: one word per line, the window between at the height that is left, showing the photo's own crop; the
// entrance only (no pin, no open).
//
// Three variants of the same poster, picked with `variant`:
// - window (the default, above): one letterbox window between the two lines.
// - column: the two lines centred, fitted edge to edge, and a tall narrow slit to one side that cuts through them from
//   the top edge to the foot line. Inside the slit the type goes on over the photo in the ink the photo measures for
//   (with the lightest veil that holds 3:1). On load the slit draws down as the lines rise; on the first scroll it
//   opens sideways by registration into the full photo while the upper line leaves left and the lower line right.
// - stack: the lines broken into one word per row, all at one fitted size, and a narrow window between each pair of
//   rows, each a different crop of the same photo. On the first scroll the rows part up and down while every window
//   slides to registration and opens to the full screen, so the crops merge into one photograph.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { covered, whenUncovered } from "../preloaders/preloader-slices-uncovered";
import { inkOver } from "./hero-still";

export const HERO_POSTER_VARIANTS = [
  { id: "window", title: "Venster" },
  { id: "column", title: "Spleet" },
  { id: "stack", title: "Stapel" },
] as const;

export type HeroPosterVariant = (typeof HERO_POSTER_VARIANTS)[number]["id"];

type Props = Inner & {
  /** The composition: one letterbox window (default), a slit through the type, or a window between every row. */
  variant?: HeroPosterVariant;
};

type Inner = {
  image: StruqImage;
  /** The two lines of the poster: the studio's name, or its line split in two. */
  lines: [string, string];
  /** The foot line: place, discipline. */
  place?: string;
  /** One link in the foot line. */
  link?: { label: string; href: string };
  className?: string;
};

/** The longest the fit waits for the display face before measuring on what it has (the CSS fallback is at 3s). */
const FONT_WAIT = 2600;
/** The script-free estimate: an average glyph of a wide display face, in em. Narrower faces come out a little small. */
const EM_PER_CHAR = 0.66;
/** Line height of the poster type. */
const LEADING = 0.84;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** The poster's side margin as laid out: the sheet margin on its padded box ([data-hp-sheet]), read in px. */
const sideOf = (el: HTMLElement) => {
  const pad = el.querySelector<HTMLElement>("[data-hp-sheet]");
  return pad ? parseFloat(getComputedStyle(pad).paddingLeft) || 0 : 0;
};
/** The width the script-free estimates fit into: the screen inside the sheet margin on both sides. */
const INSIDE = "(100vw - 2 * var(--spacing-sheet-margin))";

export function HeroPoster({ variant = "window", ...rest }: Props) {
  if (variant === "column") return <PosterColumn {...rest} />;
  if (variant === "stack") return <PosterStack {...rest} />;
  return <PosterWindow {...rest} />;
}

function PosterWindow({ image, lines, place, link, className = "" }: Inner) {
  const stage = useRef<HTMLElement>(null);
  const words = lines.map((l) => l.split(" "));
  const longest = (ws: string[]) => Math.max(...ws.map((w) => w.length));

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = <T extends HTMLElement = HTMLElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
      const wordEls = q("[data-hp-word]");
      const slot = el.querySelector<HTMLElement>("[data-hp-slot]");
      const photo = el.querySelector<HTMLElement>("[data-stack-photo]");
      if (wordEls.length !== 2 || !slot || !photo) return;
      let dead = false;

      // The CSS fallback has shown the poster when its first line rests at 0 before the script let it go. Read once
      // per element and kept on it: a second mount (development mounts twice) finds the gate restarted.
      if (!el.dataset.hpFirst) {
        const first = el.querySelector<HTMLElement>("[data-hp-line]");
        const rest = first ? getComputedStyle(first).translate : "none";
        const y = rest === "none" ? 0 : parseFloat(rest.trim().split(/\s+/)[1] ?? "0");
        el.dataset.hpFirst = y === 0 ? "late" : "gated";
      }
      const late = el.dataset.hpFirst === "late";

      // Fit: each line to the width at its natural size, then both together so the window keeps at least an eighth
      // of the screen. Measured on a fresh copy at 100px (the line itself may be mid-transition), written as the two
      // custom properties every size and the photo's registration are computed from.
      const fit = () => {
        const W = el.clientWidth;
        const H = el.clientHeight;
        const wide = W >= 768;
        const room = W - 2 * sideOf(el);
        const widthOf = (w: HTMLElement) => {
          const c = w.cloneNode(true) as HTMLElement;
          Object.assign(c.style, { position: "absolute", left: "0", top: "0", visibility: "hidden", fontSize: "100px" });
          w.parentElement?.appendChild(c);
          const width = wide
            ? c.offsetWidth
            : Math.max(0, ...Array.from(c.querySelectorAll<HTMLElement>("[data-hp-part]")).map((p) => p.offsetWidth));
          c.remove();
          return width;
        };
        const sizes = wordEls.map((w) => {
          const width = widthOf(w);
          return width > 0 ? (100 * room) / width : 100;
        });
        const rows = wide ? [1, 1] : words.map((ws) => ws.length);
        const foot = el.querySelector<HTMLElement>("[data-hp-foot]")?.offsetHeight ?? 0;
        const free = H - foot - (wide ? H * 0.1 : 64) - H * 0.12;
        const k = Math.min(1, free / (LEADING * (sizes[0] * rows[0] + sizes[1] * rows[1])));
        return [Math.floor(sizes[0] * k), Math.floor(sizes[1] * k)];
      };
      const sizeNow = { a: 0, b: 0 };
      const write = () => {
        el.style.setProperty("--hp-s1", `${Math.round(sizeNow.a)}px`);
        el.style.setProperty("--hp-s2", `${Math.round(sizeNow.b)}px`);
      };
      // On screen already (the CSS fallback showed the estimate before the script came), a new size is eased in
      // rather than cut; otherwise it is simply set.
      let shown = late;
      const settle = (onFrame: () => void) => {
        const [a, b] = fit();
        if (!shown || !sizeNow.a) {
          if (!sizeNow.a && shown) {
            const masksNow = el.querySelectorAll<HTMLElement>("[data-hp-word]");
            sizeNow.a = parseFloat(getComputedStyle(masksNow[0]).fontSize) || a;
            sizeNow.b = parseFloat(getComputedStyle(masksNow[1]).fontSize) || b;
          } else {
            sizeNow.a = a;
            sizeNow.b = b;
            write();
            onFrame();
            return;
          }
        }
        gsap.to(sizeNow, {
          a,
          b,
          duration: 0.7,
          ease: "power3.inOut",
          overwrite: true,
          onUpdate: () => {
            write();
            onFrame();
          },
        });
      };

      // The photo's place in the window: the screen's origin, measured (the CSS computes the same from the sizes).
      const place = () => {
        // Phones never open the window past the slot, so there the photo simply fills the slot (its own crop).
        if (el.clientWidth < 768) {
          for (const p of ["left", "top", "width", "height"] as const) photo.style[p] = "";
          return;
        }
        const r = slot.getBoundingClientRect();
        const b = el.getBoundingClientRect();
        Object.assign(photo.style, {
          left: `${Math.round(b.left - r.left)}px`,
          top: `${Math.round(b.top - r.top)}px`,
          width: `${el.clientWidth}px`,
          height: `${el.clientHeight}px`,
        });
      };

      const listeners: Array<() => void> = [];
      const frame = () => {
        place();
        for (const f of listeners) f();
      };
      const refit = () => {
        if (dead) return;
        settle(frame);
      };
      // With the face in, or on what there is after FONT_WAIT; and again whenever a face arrives later than that. The
      // poster counts as shown once the entrance has started (or the fallback did it), so a late face eases in.
      const faceIn = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, FONT_WAIT))]);
      settle(frame);
      faceIn.then(() => {
        refit();
        shown = true;
      });
      const onFonts = () => refit();
      document.fonts?.addEventListener?.("loadingdone", onFonts);
      window.addEventListener("resize", refit);

      // The photo decoded ahead of its first show.
      for (const img of q<HTMLImageElement>("img")) {
        const go = () => img.decode?.().catch(() => {});
        if (img.complete) go();
        else img.addEventListener("load", go, { once: true });
      }

      const masks = q("[data-hp-rise]");
      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          phone: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const wide = Boolean(ctx.conditions?.wide);
          const top = el.querySelector<HTMLElement>("[data-hp-top]");
          const bottom = el.querySelector<HTMLElement>("[data-hp-bottom]");
          if (!top || !bottom) return;

          // Under a cover the window stands open at once: the cover lands on it, and the lines rise in its wake.
          const s = { open: late || covered() ? 1 : 0, grow: 0 };
          const g = { W: 1, H: 1, slot: { x: 0, y: 0, w: 1, h: 1 } };
          const measure = () => {
            g.W = el.clientWidth;
            g.H = el.clientHeight;
            const r = slot.getBoundingClientRect();
            const b = el.getBoundingClientRect();
            g.slot = { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
          };
          // The window, in the photo's own coordinates (it sits at the screen's origin): from a hairline at the slot's
          // middle to the slot, then to the whole screen; whole pixels.
          const paint = () => {
            if (!wide) {
              // Phones: the photo fills the slot; the window opens from a hairline at its middle.
              const v = ((1 - s.open) * 50).toFixed(3);
              photo.style.clipPath = `inset(${v}% 0% ${v}% 0%)`;
              return;
            }
            const mid = g.slot.y + g.slot.h / 2;
            const t0 = lerp(mid - 0.5, g.slot.y, s.open);
            const b0 = lerp(mid + 0.5, g.slot.y + g.slot.h, s.open);
            const T = Math.round(lerp(t0, 0, s.grow));
            const B = Math.round(lerp(g.H - b0, 0, s.grow));
            const L = Math.round(lerp(g.slot.x, 0, s.grow));
            const R = Math.round(lerp(g.W - (g.slot.x + g.slot.w), 0, s.grow));
            photo.style.clipPath = `inset(${T}px ${R}px ${B}px ${L}px)`;
            // The poster parts: each half travels just far enough to clear the screen, in whole pixels.
            const up = Math.round(-(top.offsetTop + top.offsetHeight + 8) * s.grow);
            const down = Math.round((g.H - bottom.offsetTop + 8) * s.grow);
            top.style.transform = `translate3d(0, ${up}px, 0)`;
            bottom.style.transform = `translate3d(0, ${down}px, 0)`;
          };

          // The CSS gate lets go first: GSAP would otherwise read the gate's `translate` into its own y and keep it.
          el.dataset.live = wide ? "wide" : "phone";
          gsap.set(masks, { y: 0, yPercent: late ? 0 : 112 });
          measure();
          paint();
          const again = () => {
            measure();
            paint();
          };
          listeners.push(again);

          // The entrance, once the face is in (so the lines rise fitted) and nothing covers the page: the lines rise
          // one after the other and the window opens from its hairline as the second lands.
          let intro: gsap.core.Timeline | null = null;
          let cancel = () => {};
          if (!late) {
            intro = gsap.timeline({ delay: 0.15, paused: true });
            intro.to(masks, { yPercent: 0, duration: 1.15, stagger: 0.12, ease: "expo.out" }, 0);
            if (s.open < 1) intro.to(s, { open: 1, duration: 1.1, ease: "power3.inOut", onUpdate: paint }, 0.35);
            faceIn.then(() => {
              if (!dead) cancel = whenUncovered(() => intro?.play());
            });
          }

          if (wide) {
            // The first scroll: hold on the poster, the poster parts as the window opens by registration, hold on the
            // full photo, and the next section takes over.
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              onUpdate: paint,
              scrollTrigger: { trigger: el, start: "top top", end: "+=150%", pin: true, scrub: 1, onRefresh: again },
            });
            tl.to({}, { duration: 0.6 })
              .to(s, { grow: 1, duration: 1.2, ease: "power3.inOut" }, 0.6)
              .to({}, { duration: 0.6 }, 1.8);
          }

          return () => {
            cancel();
            intro?.kill();
            listeners.splice(listeners.indexOf(again), 1);
            delete el.dataset.live;
            photo.style.clipPath = "";
            top.style.transform = "";
            bottom.style.transform = "";
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
    { scope: stage, dependencies: [lines[0], lines[1]] },
  );

  // The script-free estimate per line: the width over its characters, and on wide screens a height cap so two lines
  // and a window always fit. Phones stack one word per line, so the longest word sets it.
  const est = (i: 0 | 1) =>
    `min(18vw, calc(${INSIDE} / ${(lines[i].length * EM_PER_CHAR).toFixed(2)}), 30svh)`;
  const estPhone = (i: 0 | 1) => `calc(${INSIDE} / ${(longest(words[i]) * EM_PER_CHAR).toFixed(2)})`;

  // The line's box is LEADING of its size per row; the mask carries the descender room in the display em.
  const word = "font-display block w-fit whitespace-nowrap leading-[0.84] tracking-[-0.045em] text-ink";
  const mask = "struq-line-mask block";
  const small = "struq-line-mask block";
  // Inline, because the kit balances display type (text-wrap), which would let a poster line wrap; and no transition,
  // or a page that transitions every property hands the fit a size from mid-change.
  const nowrap = { whiteSpace: "nowrap", textWrap: "nowrap", transition: "none" } as React.CSSProperties;
  const stack = (parts: string[]) =>
    parts.map((part, i) => (
      <span key={i} data-hp-part="" className="inline-block max-md:block">
        {part}
        {i < parts.length - 1 ? " " : ""}
      </span>
    ));

  return (
    <section
      ref={stage}
      data-hero-poster=""
      aria-label={`${lines[0]} ${lines[1]}`}
      className={`group/hp relative h-svh overflow-hidden bg-surface-0 ${className}`}
      style={
        {
          "--hp-e1": est(0),
          "--hp-e2": est(1),
          "--hp-p1": estPhone(0),
          "--hp-p2": estPhone(1),
        } as React.CSSProperties
      }
    >
      <h1 className="sr-only">{`${lines[0]} ${lines[1]}`}</h1>

      {/* The poster: line, window, line, foot. The lines stand above the photo as it opens past them. */}
      <div data-hp-sheet="" className="relative flex h-full flex-col px-sheet-margin pb-6 pt-8 md:pb-[3svh] md:pt-[4svh]">
        <div data-hp-top="" className="relative z-10 will-change-transform">
          <p aria-hidden className="m-0">
            <span
              className={`${mask} text-[length:var(--hp-s1,var(--hp-p1))] md:text-[length:var(--hp-s1,var(--hp-e1))]`}
            >
              <span data-hp-rise="" data-hp-line="" className="block">
                <span data-hp-word="" className={word} style={nowrap}>
                  {stack(words[0])}
                </span>
              </span>
            </span>
          </p>
        </div>

        {/* The window: the box a stack preloader lands on. The photo inside it is the full screen, registered. */}
        <div className="relative my-[1.2svh] min-h-0 flex-1">
          <div
            data-hp-slot=""
            data-stack-target=""
            className="absolute inset-0 overflow-hidden bg-surface-2 group-data-[live=wide]/hp:overflow-visible group-data-[live=wide]/hp:bg-transparent"
          >
            <div
              data-stack-photo=""
              className="absolute inset-0 md:inset-auto md:-left-sheet-margin md:top-[calc(-4svh_-_0.84_*_var(--hp-s1,var(--hp-e1))_-_1.2svh)] md:h-svh md:w-screen"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority
                sizes="100vw"
                unoptimized={image.unoptimized}
                className="object-cover [filter:saturate(0.9)_contrast(1.05)]"
              />
            </div>
          </div>
        </div>

        <div data-hp-bottom="" className="relative z-10 will-change-transform">
          <p aria-hidden className="m-0">
            <span
              className={`${mask} text-[length:var(--hp-s2,var(--hp-p2))] md:text-[length:var(--hp-s2,var(--hp-e2))]`}
            >
              <span data-hp-rise="" data-hp-line="" className="block">
                <span data-hp-word="" className={`${word} ml-auto text-right`} style={nowrap}>
                  {stack(words[1])}
                </span>
              </span>
            </span>
          </p>
          {place || link ? (
            <div data-hp-foot="" className="mt-[2svh] flex items-baseline justify-between gap-6 text-small text-ink-muted">
              {place ? (
                <span className={small}>
                  <span data-hp-rise="" data-hp-line="" className="block">
                    {place}
                  </span>
                </span>
              ) : (
                <span />
              )}
              {link ? (
                <span className={small}>
                  <span data-hp-rise="" data-hp-line="" className="block">
                    <a
                      href={link.href}
                      className="text-ink underline decoration-1 underline-offset-[0.3em] transition-[text-decoration-color] duration-500 hover:decoration-accent"
                    >
                      {link.label}
                    </a>
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// The column and the stack share what follows: the late read, the measure at 100px, the eased refit, the type.

/** Whether the CSS fallback showed the poster before the script came (its first line rests at 0). Read once per
 * element and kept on it: a second mount (development mounts twice) finds the gate restarted. */
function lateOf(el: HTMLElement) {
  if (!el.dataset.hpFirst) {
    const first = el.querySelector<HTMLElement>("[data-hp-line]");
    const rest = first ? getComputedStyle(first).translate : "none";
    const y = rest === "none" ? 0 : parseFloat(rest.trim().split(/\s+/)[1] ?? "0");
    el.dataset.hpFirst = y === 0 ? "late" : "gated";
  }
  return el.dataset.hpFirst === "late";
}

/** A line's width at 100px on a fresh copy (the line itself may be mid-rise); `parts` takes its widest word. */
function widthAt100(w: HTMLElement, parts: boolean) {
  const c = w.cloneNode(true) as HTMLElement;
  Object.assign(c.style, { position: "absolute", left: "0", top: "0", visibility: "hidden", fontSize: "100px" });
  w.parentElement?.appendChild(c);
  const width = parts
    ? Math.max(0, ...Array.from(c.querySelectorAll<HTMLElement>("[data-hp-part]")).map((p) => p.offsetWidth))
    : c.offsetWidth;
  c.remove();
  return width;
}

/**
 * Type sizes as custom properties on the section: set at once while the poster is not yet shown, eased in once it is
 * (a late face, a resize), so nothing on screen jumps. `onScreen` reads the sizes showing when the first one eases.
 */
function sizer(el: HTMLElement, names: string[], onScreen: () => number[], shownAtStart: boolean) {
  const now: Record<string, number> = {};
  const keys = names.map((_, i) => `k${i}`);
  let shown = shownAtStart;
  const write = () => names.forEach((n, i) => el.style.setProperty(n, `${Math.round(now[keys[i]])}px`));
  return {
    show: () => {
      shown = true;
    },
    set(next: number[], onFrame: () => void) {
      const has = now.k0 !== undefined;
      if (shown && !has) onScreen().forEach((v, i) => (now[keys[i]] = v || next[i]));
      if (!shown) {
        keys.forEach((k, i) => (now[k] = next[i]));
        write();
        onFrame();
        return;
      }
      gsap.to(now, {
        ...Object.fromEntries(keys.map((k, i) => [k, next[i]])),
        duration: 0.7,
        ease: "power3.inOut",
        overwrite: true,
        onUpdate: () => {
          write();
          onFrame();
        },
      });
    },
  };
}

/** The display face in, or what there is after FONT_WAIT. */
const faceReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, FONT_WAIT))]);

const WORD = "font-display block w-fit whitespace-nowrap leading-[0.84] tracking-[-0.045em]";
const MASK = "struq-line-mask block";
const SMALL = "struq-line-mask block";
// Inline, because the kit balances display type (text-wrap), which would let a poster line wrap; and no transition,
// or a page that transitions every property hands the fit a size from mid-change.
const NOWRAP = { whiteSpace: "nowrap", textWrap: "nowrap", transition: "none" } as React.CSSProperties;
const LINK =
  "underline decoration-1 underline-offset-[0.3em] transition-[text-decoration-color] duration-500 hover:decoration-accent";

/** The foot line: place, one link. The copy under the slit keeps its place in the layout but shows nothing. */
function Foot({ place, link, copy = false }: { place?: string; link?: Inner["link"]; copy?: boolean }) {
  if (!place && !link) return null;
  return (
    <div
      data-hp-foot=""
      className={`mt-[2svh] flex items-baseline justify-between gap-6 text-small text-ink-muted will-change-transform ${copy ? "invisible" : ""}`}
    >
      {place ? (
        <span className={SMALL}>
          <span data-hp-rise="" data-hp-line="" className="block">
            {place}
          </span>
        </span>
      ) : (
        <span />
      )}
      {link ? (
        <span className={SMALL}>
          <span data-hp-rise="" data-hp-line="" className="block">
            {copy ? (
              <span className={`text-ink ${LINK}`}>{link.label}</span>
            ) : (
              <a href={link.href} className={`text-ink ${LINK}`}>
                {link.label}
              </a>
            )}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * column: the two lines centred and fitted edge to edge, a tall narrow slit to one side cutting through them from the
 * top edge down to the foot. The slit is a cut layer the size of the screen: the photo, a light veil and a second copy
 * of the type, clipped to the slit, so inside it the type goes on over the photo in the ink the photo measures for.
 * The cut layer sits in the slit's box (data-stack-target) at the screen's origin, so a stack preloader lands on the
 * slit with the photo laid as the full screen. On load the slit draws down from the top edge as the lines rise; on the
 * first scroll (pin 150%) it opens sideways by registration while the upper line leaves left, the lower line right
 * and the foot down. Phones: one word per row, the same slit, the entrance only.
 */
function PosterColumn({ image, lines, place, link, className = "" }: Inner) {
  const stage = useRef<HTMLElement>(null);
  const words = lines.map((l) => l.split(" "));
  const longest = (ws: string[]) => Math.max(...ws.map((w) => w.length));

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const ground = el.querySelector<HTMLElement>("[data-hp-layer='ground']");
      const copy = el.querySelector<HTMLElement>("[data-hp-layer='copy']");
      const cut = el.querySelector<HTMLElement>("[data-hp-cut]");
      const veil = el.querySelector<HTMLElement>("[data-hp-veil]");
      const img = cut?.querySelector("img");
      if (!ground || !copy || !cut || !veil || !img) return;
      const lineWords = Array.from(ground.querySelectorAll<HTMLElement>("[data-hp-word]"));
      const foot = ground.querySelector<HTMLElement>("[data-hp-foot]");
      if (lineWords.length !== 2) return;
      const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      let dead = false;
      const late = lateOf(el);

      const fit = () => {
        const W = el.clientWidth;
        const H = el.clientHeight;
        const wide = W >= 768;
        const room = W - 2 * sideOf(el);
        const sizes = lineWords.map((w) => {
          const width = widthAt100(w, !wide);
          return width > 0 ? (100 * room) / width : 100;
        });
        const rows = wide ? [1, 1] : words.map((ws) => ws.length);
        const free = H - (foot?.offsetHeight ?? 0) - (wide ? H * 0.2 : 140);
        const k = Math.min(1, free / (LEADING * (sizes[0] * rows[0] + sizes[1] * rows[1])));
        return [Math.floor(sizes[0] * k), Math.floor(sizes[1] * k)];
      };

      // The slit in pixels: its edges from the shares the CSS sets, its foot from where the foot line starts.
      const g = { W: 1, H: 1, L: 0, R: 0, B: 0, l1: 0, l2: 0, f: 0 };
      const measure = () => {
        const cs = getComputedStyle(el);
        g.W = el.clientWidth;
        g.H = el.clientHeight;
        g.L = Math.round(g.W * (parseFloat(cs.getPropertyValue("--hp-cl")) || 0.6));
        g.R = Math.round(g.W * (parseFloat(cs.getPropertyValue("--hp-cr")) || 0.24));
        const footTop = foot ? foot.offsetTop : g.H;
        g.B = Math.max(0, Math.round(g.H - footTop + g.H * 0.02));
        el.style.setProperty("--hp-cb", `${g.B}px`);
        // How far each half travels to clear the screen: the upper line to the left, the lower to the right.
        const b = el.getBoundingClientRect();
        const r1 = lineWords[0].getBoundingClientRect();
        const r2 = lineWords[1].getBoundingClientRect();
        g.l1 = Math.round(r1.right - b.left + 8);
        g.l2 = Math.round(g.W - (r2.left - b.left) + 8);
        g.f = foot ? Math.round(g.H - foot.offsetTop + 8) : 0;
      };

      // The ink inside the slit, and its veil, from what the photo holds under the type (the whole lines, since the
      // slit opens across them); the CSS's light ink over a safe veil stays when the photo cannot be read.
      const grade = () => {
        const b = el.getBoundingClientRect();
        const boxes = Array.from(copy.querySelectorAll<HTMLElement>("[data-hp-word]")).map((w) => {
          const r = w.getBoundingClientRect();
          const m = (w.closest("[data-hp-mask]") as HTMLElement | null)?.getBoundingClientRect() ?? r;
          return { x: r.left - b.left, y: m.top - b.top, w: r.width, h: m.height };
        });
        const pick = inkOver(img, { x: 0, y: 0, w: el.clientWidth, h: el.clientHeight }, boxes, el);
        if (!pick) return;
        copy.style.color = pick.ink;
        veil.dataset.tone = pick.tone;
        veil.style.opacity = pick.veil.toFixed(3);
      };

      const listeners: Array<() => void> = [];
      const frame = () => {
        measure();
        for (const f of listeners) f();
      };
      const sizes = sizer(
        el,
        ["--hp-s1", "--hp-s2"],
        () => lineWords.map((w) => parseFloat(getComputedStyle(w).fontSize)),
        late,
      );
      const decoded = img.decode().catch(() => undefined);
      const refit = () => {
        if (dead) return;
        sizes.set(fit(), frame);
        decoded.then(() => !dead && grade());
      };
      const faceIn = faceReady();
      sizes.set(fit(), frame);
      faceIn.then(() => {
        refit();
        sizes.show();
      });
      const onFonts = () => refit();
      document.fonts?.addEventListener?.("loadingdone", onFonts);
      window.addEventListener("resize", refit);
      decoded.then(() => !dead && grade());

      const masks = q("[data-hp-rise]");
      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          phone: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const wide = Boolean(ctx.conditions?.wide);
          const ones = q("[data-hp-l1]");
          const twos = q("[data-hp-l2]");
          const feet = q("[data-hp-foot]");
          // Under a cover the slit stands drawn at once: the cover lands on it, and the lines rise in its wake.
          const s = { open: late || covered() ? 1 : 0, grow: 0 };
          const paint = () => {
            const bottom = Math.round(lerp(lerp(g.H, g.B, s.open), 0, s.grow));
            const left = Math.round(lerp(g.L, 0, s.grow));
            const right = Math.round(lerp(g.R, 0, s.grow));
            cut.style.clipPath = `inset(0px ${right}px ${bottom}px ${left}px)`;
            if (!wide) return;
            const x1 = Math.round(-g.l1 * s.grow);
            const x2 = Math.round(g.l2 * s.grow);
            const y = Math.round(g.f * s.grow);
            for (const o of ones) o.style.transform = `translate3d(${x1}px, 0, 0)`;
            for (const t of twos) t.style.transform = `translate3d(${x2}px, 0, 0)`;
            for (const f of feet) f.style.transform = `translate3d(0, ${y}px, 0)`;
          };

          // The CSS gate lets go first: GSAP would otherwise read the gate's `translate` into its own y and keep it.
          el.dataset.live = wide ? "wide" : "phone";
          gsap.set(masks, { y: 0, yPercent: late ? 0 : 112 });
          measure();
          paint();
          listeners.push(paint);

          let intro: gsap.core.Timeline | null = null;
          let cancel = () => {};
          if (!late) {
            intro = gsap.timeline({ delay: 0.15, paused: true });
            intro.to(masks, { yPercent: 0, duration: 1.15, stagger: 0.1, ease: "expo.out" }, 0);
            if (s.open < 1) intro.to(s, { open: 1, duration: 1.2, ease: "power3.inOut", onUpdate: paint }, 0.2);
            faceIn.then(() => {
              if (!dead) cancel = whenUncovered(() => intro?.play());
            });
          }

          if (wide) {
            // Hold on the poster, the slit opens sideways as the lines leave, hold on the full photo, hand over.
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              onUpdate: paint,
              scrollTrigger: {
                trigger: el,
                start: "top top",
                end: "+=150%",
                pin: true,
                scrub: 0.4,
                onRefresh: () => {
                  measure();
                  paint();
                },
              },
            });
            tl.to({}, { duration: 0.5 })
              .to(s, { grow: 1, duration: 1.3, ease: "power3.inOut" }, 0.5)
              .to({}, { duration: 0.6 }, 1.8);
          }

          return () => {
            cancel();
            intro?.kill();
            listeners.splice(listeners.indexOf(paint), 1);
            delete el.dataset.live;
            cut.style.clipPath = "";
            for (const n of [...ones, ...twos, ...feet]) n.style.transform = "";
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
    { scope: stage, dependencies: [lines[0], lines[1]] },
  );

  const est = (i: 0 | 1) => `min(18vw, calc(${INSIDE} / ${(lines[i].length * EM_PER_CHAR).toFixed(2)}), 26svh)`;
  const estPhone = (i: 0 | 1) => `calc(${INSIDE} / ${(longest(words[i]) * EM_PER_CHAR).toFixed(2)})`;
  // The space stands between the words, outside them: a space at the end of an inline block is dropped.
  const parts = (ps: string[]) =>
    ps.map((part, i) => (
      <span key={i}>
        <span data-hp-part="" className="inline-block max-md:block">
          {part}
        </span>
        {i < ps.length - 1 ? " " : ""}
      </span>
    ));
  const line = (i: 0 | 1) => (
    <p aria-hidden className="m-0">
      <span
        data-hp-mask=""
        className={`${MASK} ${i === 0 ? "text-[length:var(--hp-s1,var(--hp-p1))] md:text-[length:var(--hp-s1,var(--hp-e1))]" : "text-[length:var(--hp-s2,var(--hp-p2))] md:text-[length:var(--hp-s2,var(--hp-e2))]"}`}
      >
        <span data-hp-rise="" data-hp-line="" className="block">
          <span data-hp-word="" className={`${WORD} ${i === 1 ? "ml-auto text-right" : ""}`} style={NOWRAP}>
            {parts(words[i])}
          </span>
        </span>
      </span>
    </p>
  );
  // The same layout twice: on the ground in the ink, and as the copy inside the slit.
  const layer = (copy: boolean) => (
    <div
      data-hp-layer={copy ? "copy" : "ground"}
      aria-hidden={copy || undefined}
      data-hp-sheet=""
      className={`absolute inset-0 flex flex-col px-sheet-margin pb-6 pt-8 md:pb-[3svh] md:pt-[4svh] ${copy ? "text-on-photo" : "text-ink"}`}
    >
      <div className="flex-1" />
      <div data-hp-l1="" className="will-change-transform">
        {line(0)}
      </div>
      <div data-hp-l2="" className="mt-[1.2svh] will-change-transform">
        {line(1)}
      </div>
      <div className="flex-1" />
      <Foot place={place} link={link} copy={copy} />
    </div>
  );

  return (
    <section
      ref={stage}
      data-hero-poster=""
      data-hp-variant="column"
      aria-label={`${lines[0]} ${lines[1]}`}
      className={`group/hp relative h-svh overflow-hidden bg-surface-0 ${className}`}
      style={
        {
          "--hp-e1": est(0),
          "--hp-e2": est(1),
          "--hp-p1": estPhone(0),
          "--hp-p2": estPhone(1),
        } as React.CSSProperties
      }
    >
      <h1 className="sr-only">{`${lines[0]} ${lines[1]}`}</h1>
      {layer(false)}
      {/* The slit's box, the box a stack preloader lands on; the cut layer inside it is the whole screen, registered. */}
      <div data-hp-cutslot="" data-stack-target="">
        <div data-hp-cut="">
          <div data-stack-photo="" className="absolute inset-0">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="100vw"
              unoptimized={image.unoptimized}
              className="object-cover [filter:saturate(0.9)_contrast(1.05)]"
            />
          </div>
          <div data-hp-veil="" aria-hidden className="absolute inset-0" />
          {layer(true)}
        </div>
      </div>
    </section>
  );
}

/**
 * stack: the poster's words one per row, all at one size (the longest fitted to the width, the whole capped by the
 * height), alternating left and right, with a narrow window between each pair of rows. Each window shows a different
 * crop of the same photograph: the middle one (the box a stack preloader lands on) the registered screen, the ones
 * above it higher in the picture and the ones below lower. On load the rows rise and the windows open from a hairline;
 * on the first scroll (pin 150%) the upper rows go up and the lower rows and the foot go down while each window slides
 * to registration and opens to the full screen, so the crops merge into one photograph. Only whole pixels move.
 * Phones: the same stack, each window its own crop, the entrance only. Without scripts or under reduced motion the
 * composed poster shows with every crop in place.
 */
function PosterStack({ image, lines, place, link, className = "" }: Inner) {
  const stage = useRef<HTMLElement>(null);
  const rows = lines.flatMap((l) => l.split(" ")).filter(Boolean);
  const n = rows.length;
  const m = Math.max(0, n - 1);
  const middle = Math.floor((m - 1) / 2);
  // Each window's crop as a share down the picture; the middle window is the registered one.
  const crops = Array.from({ length: m }, (_, j) => (j === middle || m === 1 ? 0.5 : 0.1 + (0.8 * j) / (m - 1)));
  const longest = Math.max(...rows.map((w) => w.length));

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      const wordEls = q("[data-hp-word]");
      const rowEls = q("[data-hp-row]");
      const slots = q("[data-hp-slot]");
      const photos = q("[data-hp-photo]");
      const foot = el.querySelector<HTMLElement>("[data-hp-foot]");
      if (!wordEls.length || slots.length !== photos.length) return;
      let dead = false;
      const late = lateOf(el);

      const fit = () => {
        const W = el.clientWidth;
        const H = el.clientHeight;
        const wide = W >= 768;
        const room = W - 2 * sideOf(el);
        const widest = Math.max(1, ...wordEls.map((w) => widthAt100(w, false)));
        const free = H - (foot?.offsetHeight ?? 0) - (wide ? H * 0.1 : 72) - m * H * (wide ? 0.075 : 0.08);
        return [Math.floor(Math.min((100 * room) / widest, free / (LEADING * n)))];
      };

      const listeners: Array<() => void> = [];
      const frame = () => {
        for (const f of listeners) f();
      };
      const sizes = sizer(el, ["--hp-s"], () => [parseFloat(getComputedStyle(wordEls[0]).fontSize)], late);
      const refit = () => {
        if (dead) return;
        sizes.set(fit(), frame);
      };
      const faceIn = faceReady();
      sizes.set(fit(), frame);
      faceIn.then(() => {
        refit();
        sizes.show();
      });
      const onFonts = () => refit();
      document.fonts?.addEventListener?.("loadingdone", onFonts);
      window.addEventListener("resize", refit);
      for (const img of q("img") as HTMLImageElement[]) img.decode?.().catch(() => {});

      const masks = q("[data-hp-rise]");
      const mm = gsap.matchMedia();
      mm.add(
        {
          wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          phone: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const wide = Boolean(ctx.conditions?.wide);
          const s = { open: late || covered() ? 1 : 0, grow: 0 };
          type Box = { x: number; y: number; w: number; h: number };
          const g = { W: 1, H: 1, slots: [] as Box[], d: [] as number[], travel: [] as number[], foot: 0 };
          const measure = () => {
            g.W = el.clientWidth;
            g.H = el.clientHeight;
            const b = el.getBoundingClientRect();
            g.slots = slots.map((sl) => {
              const r = sl.getBoundingClientRect();
              return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
            });
            // Each window's photo is the screen, placed at the screen's origin and moved so the window shows its
            // crop: the registered middle not at all, the others by the distance to their part of the picture.
            g.d = g.slots.map((sl, j) => (j === middle ? 0 : Math.round(sl.y - crops[j] * (g.H - sl.h))));
            if (wide) {
              photos.forEach((p, j) =>
                Object.assign(p.style, {
                  left: `${Math.round(-g.slots[j].x)}px`,
                  top: `${Math.round(-g.slots[j].y)}px`,
                  width: `${g.W}px`,
                  height: `${g.H}px`,
                  right: "auto",
                  bottom: "auto",
                }),
              );
            }
            // How far each row travels to clear the screen: the upper half up, the lower half down.
            g.travel = rowEls.map((r, i) =>
              i < n / 2 ? -(r.offsetTop + r.offsetHeight + 8) : g.H - r.offsetTop + 8,
            );
            g.foot = foot ? g.H - foot.offsetTop + 8 : 0;
          };
          const paint = () => {
            if (!wide) {
              const v = ((1 - s.open) * 50).toFixed(3);
              for (const p of photos) p.style.clipPath = `inset(${v}% 0% ${v}% 0%)`;
              return;
            }
            g.slots.forEach((sl, j) => {
              const mid = sl.y + sl.h / 2;
              const y0 = lerp(lerp(mid - 0.5, sl.y, s.open), 0, s.grow);
              const y1 = lerp(lerp(mid + 0.5, sl.y + sl.h, s.open), g.H, s.grow);
              const x0 = lerp(sl.x, 0, s.grow);
              const x1 = lerp(sl.x + sl.w, g.W, s.grow);
              const d = Math.round(g.d[j] * (1 - s.grow));
              const p = photos[j];
              p.style.transform = `translate3d(0, ${d}px, 0)`;
              p.style.clipPath = `inset(${Math.round(y0 - d)}px ${Math.round(g.W - x1)}px ${Math.round(g.H - y1 + d)}px ${Math.round(x0)}px)`;
            });
            rowEls.forEach((r, i) => {
              r.style.transform = `translate3d(0, ${Math.round(g.travel[i] * s.grow)}px, 0)`;
            });
            if (foot) foot.style.transform = `translate3d(0, ${Math.round(g.foot * s.grow)}px, 0)`;
          };
          const again = () => {
            measure();
            paint();
          };

          el.dataset.live = wide ? "wide" : "phone";
          gsap.set(masks, { y: 0, yPercent: late ? 0 : 112 });
          again();
          listeners.push(again);

          let intro: gsap.core.Timeline | null = null;
          let cancel = () => {};
          if (!late) {
            intro = gsap.timeline({ delay: 0.15, paused: true });
            intro.to(masks, { yPercent: 0, duration: 1.1, stagger: 0.08, ease: "expo.out" }, 0);
            if (s.open < 1) intro.to(s, { open: 1, duration: 1.1, ease: "power3.inOut", onUpdate: paint }, 0.35);
            faceIn.then(() => {
              if (!dead) cancel = whenUncovered(() => intro?.play());
            });
          }

          if (wide) {
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              onUpdate: paint,
              scrollTrigger: { trigger: el, start: "top top", end: "+=150%", pin: true, scrub: 0.4, onRefresh: again },
            });
            tl.to({}, { duration: 0.5 })
              .to(s, { grow: 1, duration: 1.3, ease: "power3.inOut" }, 0.5)
              .to({}, { duration: 0.6 }, 1.8);
          }

          return () => {
            cancel();
            intro?.kill();
            listeners.splice(listeners.indexOf(again), 1);
            delete el.dataset.live;
            for (const p of photos) {
              p.style.clipPath = "";
              p.style.transform = "";
              for (const k of ["left", "top", "width", "height", "right", "bottom"] as const) p.style[k] = "";
            }
            for (const r of rowEls) r.style.transform = "";
            if (foot) foot.style.transform = "";
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
    { scope: stage, dependencies: [lines[0], lines[1]] },
  );

  // The script-free estimate: the longest word over the width, capped so the rows and their windows fit the height.
  const per = (longest * EM_PER_CHAR).toFixed(2);
  const est = `min(calc(${INSIDE} / ${per}), calc((90svh - 2rem - ${m} * 7.5svh) / ${(n * LEADING).toFixed(2)}))`;
  const estPhone = `min(calc(${INSIDE} / ${per}), calc((100svh - 7rem - ${m} * 8svh) / ${(n * LEADING).toFixed(2)}))`;

  return (
    <section
      ref={stage}
      data-hero-poster=""
      data-hp-variant="stack"
      aria-label={`${lines[0]} ${lines[1]}`}
      className={`group/hp relative h-svh overflow-hidden bg-surface-0 text-ink ${className}`}
      style={{ "--hp-e": est, "--hp-p": estPhone } as React.CSSProperties}
    >
      <h1 className="sr-only">{`${lines[0]} ${lines[1]}`}</h1>
      <div data-hp-sheet="" className="relative flex h-full flex-col px-sheet-margin pb-6 pt-8 md:pb-[3svh] md:pt-[4svh]">
        {rows.map((w, i) => (
          <div key={i} className="contents">
            <div data-hp-row="" className="relative z-10 will-change-transform">
              <p aria-hidden className="m-0">
                <span className={`${MASK} text-[length:var(--hp-s,var(--hp-p))] md:text-[length:var(--hp-s,var(--hp-e))]`}>
                  <span data-hp-rise="" data-hp-line="" className="block">
                    <span data-hp-word="" className={`${WORD} ${i % 2 ? "ml-auto text-right" : ""}`} style={NOWRAP}>
                      {w}
                    </span>
                  </span>
                </span>
              </p>
            </div>
            {i < m ? (
              <div className="relative my-[1svh] min-h-[5svh] flex-1">
                <div
                  data-hp-slot=""
                  {...(i === middle ? { "data-stack-target": "" } : {})}
                  className="absolute inset-0 overflow-hidden bg-surface-2 group-data-[live=wide]/hp:overflow-visible group-data-[live=wide]/hp:bg-transparent"
                >
                  <div
                    data-hp-photo=""
                    {...(i === middle ? { "data-stack-photo": "" } : {})}
                    className="absolute inset-0 will-change-transform"
                    style={{ "--hp-crop": `50% ${Math.round(crops[i] * 100)}%` } as React.CSSProperties}
                  >
                    <Image
                      src={image.src}
                      alt={i === middle ? image.alt : ""}
                      fill
                      priority
                      sizes="100vw"
                      unoptimized={image.unoptimized}
                      className="object-cover [object-position:var(--hp-crop)] [filter:saturate(0.9)_contrast(1.05)] group-data-[live=wide]/hp:[object-position:50%_50%]"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        <div className="mt-auto">
          <Foot place={place} link={link} />
        </div>
      </div>
    </section>
  );
}
