"use client";
// panel-accordion (Struq section recipe)
// A full-height row of tall photo panels, like the shutters of a gallery. Each panel is a narrow window onto its
// photograph with the project's name at its foot; hovering or focusing one opens it wide while the others narrow, and
// moving across them flows open from one to the next with weight. Opening only widens the window: the photograph is
// already full size behind it, centred on the window, and never rescales. As the window opens, its small name sinks
// out of a mask and the name in the display face rises in with a short line. On scroll into view the panels rise
// from their bottom edge one after another, and then the first one opens on its own.
//
// <PanelAccordion title="Vijf huizen, één hand." items={[{ image, title: "Cipressenhof", line: "Woonhuis, Lucca, 2025", href: "/werk/cipressenhof" }, ...]} />
//
// How it moves: every panel has one number, its openness (they always add up to one), and on every frame each window
// is written from those numbers in whole pixels: a translate for where it sits and a clip for how wide it is. No
// width or flex-basis is ever animated, so nothing is laid out while it moves. A new hover simply retargets the one
// tween from wherever the panels are, so an open that is overtaken turns back instead of starting over.
// Every photograph loads at once and is decoded before the panels can arrive.
//
// Keyboard: each panel is a link, and focus opens it. Phones: the panels stack as short rows of the same windows;
// a tap opens a row, a tap on the open row follows its link. Reduced motion: opens are hard cuts and the panels are
// simply there. Without scripts: the panels at equal size with their names, each a working link.
import Image from "next/image";
import { useRef } from "react";
import { ScrollTrigger, gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Item = {
  image: StruqImage;
  /** The project's name. */
  title: string;
  /** One short line beside the name when the panel is open: what and where. */
  line?: string;
  href: string;
};

type Props = {
  /** The section's heading. */
  title?: string;
  /** Three to six projects; five reads best. */
  items: Item[];
  className?: string;
};

const T = {
  open: 0.85, // one panel opening while the others narrow
  arrive: 1.0, // one panel rising from its bottom edge
  stagger: 0.09,
  first: 0.2, // the beat before the first panel opens on its own
  openShare: 0.5, // the open panel's share of the row on wide screens
} as const;

/** 0 below `a`, 1 above `b`, smooth between. */
function smooth(x: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** A colour as sRGB 0 to 1, whatever syntax the palette writes it in (the canvas does the conversion). */
function toRgb(ctx: CanvasRenderingContext2D, color: string): [number, number, number] {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}
function luminance([r, g, b]: [number, number, number]) {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * The focus line is the accent when it holds 3:1 against the band's ground; in the few palettes where it does not (a
 * light ochre or coral on cream), it is the accent mixed toward the ink just far enough to hold it.
 */
function focusInk(el: HTMLElement) {
  try {
    const cs = getComputedStyle(el);
    const accent = cs.getPropertyValue("--accent").trim();
    const ground = cs.getPropertyValue("--surface-0").trim();
    const ink = cs.getPropertyValue("--ink").trim();
    if (!accent || !ground || !ink) return;
    const cv = document.createElement("canvas");
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const g = luminance(toRgb(ctx, ground));
    const ratio = (c: string) => {
      const l = luminance(toRgb(ctx, c));
      return (Math.max(l, g) + 0.05) / (Math.min(l, g) + 0.05);
    };
    for (let k = 0; k <= 100; k += 10) {
      const c = k === 0 ? accent : `color-mix(in oklch, ${accent}, ${ink} ${k}%)`;
      if (ratio(c) >= 3) {
        if (k > 0) el.style.setProperty("--focus", c);
        return;
      }
    }
  } catch {
    // The accent stays.
  }
}

export function PanelAccordion({ title, items, className = "" }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const track = el.querySelector("[data-track]") as HTMLElement;
      const panels = Array.from(el.querySelectorAll<HTMLAnchorElement>("[data-panel]"));
      const n = panels.length;
      if (n < 2) return;
      const caps = panels.map((p) => p.querySelector("[data-cap]") as HTMLElement);
      const smalls = panels.map((p) => p.querySelector("[data-small]") as HTMLElement);
      const bigs = panels.map((p) => p.querySelector("[data-big]") as HTMLElement);
      const names = panels.map((p) => p.querySelector("[data-name]") as HTMLElement);
      const imgs = panels.map((p) => p.querySelector("img") as HTMLImageElement);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const phoneQuery = window.matchMedia("(max-width: 767px)");
      const touch = window.matchMedia("(hover: none)").matches;

      // The numbers everything is drawn from.
      const open: Record<string, number> = {};
      panels.forEach((_, i) => (open[`a${i}`] = 1 / n));
      const arrive = panels.map(() => ({ v: reduce ? 0 : 1 })); // 1: below its bottom edge, 0: arrived
      let current = -1;
      let dirty = true;
      const mark = () => {
        dirty = true;
      };

      // Geometry, measured on every resize. On wide screens the windows run along x, on phones along y.
      let phone = false;
      let along = 0; // the track's length along the row
      let across = 0; // the panels' size across the row
      let big = 0; // the open window's length
      let small = 0; // a narrow window's length
      let gap = 8;
      let capS = 0; // the band on a narrow panel
      let capB: number[] = []; // the band on the open panel, per panel
      const measure = () => {
        phone = phoneQuery.matches;
        gap = phone ? 6 : 8;
        if (phone) {
          across = track.clientWidth;
          big = Math.round(Math.min(window.innerHeight * 0.52, across * 1.2));
          small = 104;
          along = big + (n - 1) * (small + gap);
          track.style.height = `${along}px`;
        } else {
          track.style.height = "";
          along = track.clientWidth;
          across = track.clientHeight;
          big = Math.round(along * T.openShare);
          small = (along - big - (n - 1) * gap) / (n - 1);
        }
        panels.forEach((p) => {
          Object.assign(p.style, {
            position: "absolute",
            left: "0px",
            top: "0px",
            flex: "none",
            width: `${phone ? across : big}px`,
            height: `${phone ? big : across}px`,
          });
        });
        caps.forEach((c) => Object.assign(c.style, { top: "0px", bottom: "auto" }));
        // The open name at display size, fitted to the open window whatever the face.
        const pad = phone ? 32 : 40;
        const room = (phone ? across : big) - pad;
        names.forEach((nm) => {
          nm.style.fontSize = "";
          const w = nm.scrollWidth;
          if (w > room) {
            const fs = parseFloat(getComputedStyle(nm).fontSize) || 16;
            nm.style.fontSize = `${Math.floor(((fs * room) / w) * 10) / 10}px`;
          }
        });
        // A narrow panel shows only the top of its band (the small name); the open one shows the whole band. Both
        // reach a pixel past the window's foot, so the clip, never the band's own edge, ends it.
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        capS = Math.round(rem * (phone ? 3.25 : 4.75));
        capB = caps.map((c) => Math.max(capS, Math.floor(c.getBoundingClientRect().height) - 1));
        mark();
      };

      const paint = () => {
        let pos = 0;
        panels.forEach((p, i) => {
          const a = open[`a${i}`];
          const size = small + a * (big - small);
          // The window's two edges in whole pixels, and the element placed so the photo stays centred on it.
          const lead = Math.round(pos);
          const end = Math.round(pos + size);
          pos += size + gap;
          const at = Math.round((lead + end) / 2 - big / 2);
          const before = lead - at;
          const after = at + big - end;
          const rise = arrive[i].v;
          // The band grows from the small name's height to the open name's as the panel opens.
          const capH = Math.round(capS + ((capB[i] ?? capS) - capS) * smooth(a, 0.3, 0.62));
          if (phone) {
            const top = before + Math.round(rise * (end - lead));
            p.style.transform = `translate3d(0, ${at}px, 0)`;
            p.style.clipPath = `inset(${top}px 0px ${after}px 0px)`;
            caps[i].style.transform = `translate3d(0, ${big - after - capH}px, 0)`;
          } else {
            const top = Math.round(rise * across);
            p.style.transform = `translate3d(${at}px, 0, 0)`;
            p.style.clipPath = `inset(${top}px ${after}px 0px ${before}px)`;
            caps[i].style.transform = `translate3d(${before}px, ${across - capH}px, 0)`;
          }
          // The two names swap as one roll in the same window of openness, so between them one whole name always stands:
          // as much of the display name rises in as the small one sinks out. A closing panel runs the same in reverse.
          const roll = smooth(a, 0.36, 0.62);
          smalls[i].style.transform = `translate3d(0, ${roll * 115}%, 0)`;
          bigs[i].style.transform = `translate3d(0, ${(1 - roll) * 115}%, 0)`;
        });
      };

      let tween: gsap.core.Tween | null = null;
      const openTo = (i: number) => {
        if (i === current) return;
        current = i;
        panels.forEach((p, k) => p.toggleAttribute("data-open", k === i));
        const target: Record<string, number> = {};
        panels.forEach((_, k) => (target[`a${k}`] = k === i ? 1 : 0));
        tween?.kill();
        if (reduce) {
          Object.assign(open, target);
          mark();
          return;
        }
        // From wherever the panels are now: an overtaken open turns back, it never restarts.
        tween = gsap.to(open, { ...target, duration: T.open, ease: "power3.out", onUpdate: mark });
      };

      // One draw per frame, after the tweens have moved, and only when something changed.
      const tick = () => {
        if (!dirty) return;
        dirty = false;
        paint();
      };
      el.dataset.motion = "";
      measure();
      paint();
      // The display name is fitted with the real face, so measure again once it has landed.
      document.fonts?.ready.then(() => {
        if (el.isConnected) measure();
      });
      focusInk(el);
      gsap.ticker.add(tick);

      // Every photograph is loaded and decoded before the panels may arrive.
      const decoded = Promise.all(imgs.map((img) => img?.decode().catch(() => undefined)));
      let arrived = reduce;
      const land = () => {
        if (arrived) return;
        arrived = true;
        decoded.then(() => {
          gsap.to(arrive, {
            v: 0,
            duration: T.arrive,
            ease: "expo.out",
            stagger: T.stagger,
            onUpdate: mark,
            onComplete: () => {
              gsap.delayedCall(T.first, () => {
                if (current === -1) openTo(0);
              });
            },
          });
        });
      };
      if (reduce) openTo(0);
      const trigger = ScrollTrigger.create({ trigger: track, start: "top 78%", once: true, onEnter: land });

      const onEnter = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        openTo(panels.indexOf(e.currentTarget as HTMLAnchorElement));
      };
      const onFocus = (e: FocusEvent) => openTo(panels.indexOf(e.currentTarget as HTMLAnchorElement));
      // A tap opens a closed panel first; a tap on the open one follows its link.
      const onClick = (e: MouseEvent) => {
        const i = panels.indexOf(e.currentTarget as HTMLAnchorElement);
        if ((touch || phone) && i !== current) {
          e.preventDefault();
          openTo(i);
        }
      };
      panels.forEach((p) => {
        p.addEventListener("pointerenter", onEnter);
        p.addEventListener("focus", onFocus);
        p.addEventListener("click", onClick);
      });
      const resize = new ResizeObserver(() => measure());
      resize.observe(track);
      phoneQuery.addEventListener("change", measure);

      return () => {
        trigger.kill();
        tween?.kill();
        gsap.ticker.remove(tick);
        resize.disconnect();
        phoneQuery.removeEventListener("change", measure);
        panels.forEach((p) => {
          p.removeEventListener("pointerenter", onEnter);
          p.removeEventListener("focus", onFocus);
          p.removeEventListener("click", onClick);
          p.removeAttribute("style");
          p.removeAttribute("data-open");
        });
        caps.forEach((c) => c.removeAttribute("style"));
        track.style.height = "";
        delete el.dataset.motion;
        el.style.removeProperty("--focus");
        names.forEach((nm) => (nm.style.fontSize = ""));
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-panel-accordion=""
      className={`flex min-h-svh flex-col bg-surface-0 px-6 py-[7vh] text-ink md:px-[4vw] ${className}`}
    >
      {title ? <h2 className="font-display text-h2 mb-[5vh] max-w-[16ch]">{title}</h2> : null}
      <div data-track="" className="relative flex flex-1 flex-col gap-1.5 md:min-h-[60svh] md:flex-row md:gap-2">
        {items.map((item, i) => (
          <a
            key={item.href + i}
            href={item.href}
            data-panel=""
            className="group relative block h-[26svh] overflow-hidden outline-none md:h-auto md:flex-1"
          >
            <Image
              src={item.image.src}
              alt={item.image.alt}
              fill
              loading="eager"
              sizes="(min-width: 768px) 50vw, 100vw"
              unoptimized={item.image.unoptimized}
              className="object-cover"
            />
            {/* The name on the page ground at the window's foot; focus draws the accent along its top. The band is as
                tall as the open name needs and reaches a pixel past the window on each side, so the clip, never the
                band's own edge, ends it; only its top part shows on a narrow panel, and it grows as the panel opens. */}
            <div
              data-cap=""
              className="absolute bottom-0 left-[-1px] w-[calc(100%+2px)] bg-surface-0 group-focus-visible:shadow-[inset_0_2px_0_var(--focus,var(--accent))]"
            >
              <div className="grid items-start px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
                <span className="block overflow-hidden [grid-area:1/1]">
                  <span data-small="" className="text-small block whitespace-nowrap">
                    {item.title}
                  </span>
                </span>
                <span className="block overflow-hidden pb-[0.14em] [grid-area:1/1]">
                  <span data-big="" className="flex flex-col items-start gap-2 md:gap-3" style={{ transform: "translateY(115%)" }}>
                    <span
                      data-name=""
                      className="font-display text-h3 block whitespace-nowrap leading-[0.95] tracking-[-0.02em] md:text-[clamp(2.5rem,1rem_+_3.6vw,5.5rem)]"
                    >
                      {item.title}
                    </span>
                    {item.line ? <span className="text-small text-ink-muted whitespace-nowrap max-md:hidden">{item.line}</span> : null}
                  </span>
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
