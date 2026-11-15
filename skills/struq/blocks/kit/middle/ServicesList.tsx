"use client";
// components/struq/kit/middle/ServicesList.tsx (Struq recipe)
// What the business does, as named offers with one sentence each: the middle scene for a plumber's repairs and
// renovations, a firm's areas of law, a studio's classes, an app's jobs. Never an icon grid, never numbered. Three
// variants, each extracted from a source block:
//
// - "rows": large hairline rows; hover or focus floods a row with the accent from its foot, the name turns to the
//   accent's ink and nudges in; the sentence beside it always shows and lifts with the flood. From
//   showpieces/fill-rows. Three to six services.
// - "panels": three to five tall photo panels side by side; hover or focus opens one wide while the others narrow,
//   its name rising through a mask with its sentence. From sections/panel-accordion. Needs a photo per service.
// - "pair": two services only: two halves side by side, each a photo, the name at h2 and its sentences, a rule
//   drawing between them with the scroll. From kit/quiet/PhotoText and the rule of kit/motion/ScrubLine.
//
// <ServicesList variant="rows" heading="What we fix, and what we build." services={[
//   { name: "Repairs", text: "Leaks, blockages and boilers, the same week you call." },
//   { name: "Bathroom renovations", text: "From the first drawing to the last tile, one team.", image: images.card[0] },
// ]} />
//
// Props
// - services: { name, text, image?, href? }[]. name: the offer in one to three words. text: one sentence (pair takes
//   two). image: a StruqImage. href: makes the row or panel a link; without it the row is not a link, still focusable
//   so its hover state is reachable by keyboard.
// - variant: "rows" (default), "panels" or "pair".
// - heading: optional, at h2, opens the scene. Without it the services open the section.
// - tone: "ground" (default), "inverse" or "field": the scene's ground (scene-inverse, scene-field in blocks.css).
// - className: on the root.
//
// Empty slots and fallbacks (code, not advice): "panels" with any service missing its photo renders "rows"; "pair"
// with other than two services renders "rows"; one service is not a list (use kit/quiet/Statement), given one it
// renders as a single row. A pair half without a photo is its name and sentences alone. No price, "from" figure,
// duration or guarantee: there is no slot for one. resolveServicesVariant() returns the variant that will render.
//
// Mounting: a page section of its own. The root carries data-scene="services", data-variant (the rendered one),
// data-energy="1" and data-middle. Energy 1: no pin.
//
// Motion (kit/feel.ts, data-temperament on <body>): one timeline from one trigger (./entrance): the heading's lines
// rise, then the photos open from their foot, then the rows or halves rise one after another. The loud move is the
// hover: rows flood over the feel's --dur-hover-fill on --ease-enter, the sentence following a quarter of that later
// (crisp a quick fill, slow a soft flood with the sentence drifting in after); panels open over duration.swap on the
// enter ease and retarget from wherever they are. Pair's rule is scrubbed (ScrubLine). Reduced motion: the composed
// scene, hover states cut in, panels open as hard cuts. Without scripts: the composed scene, every panel a link.
//
// Phones: rows show every sentence under its name; panels stack as short rows that open on tap (a tap
// on the open one follows its link); pair stacks, the rule drawn across between the halves.
import Image from "next/image";
import { useRef } from "react";
import { feel, LOCKED, prefersReduced } from "../feel";
import { gsap, ScrollTrigger, useGSAP } from "../gsap";
import type { StruqImage } from "../images";
import { ScrubLine } from "../motion/ScrubLine";
import { SHEET_GRID } from "../quiet/sheet";
import { entrance } from "./entrance";

export type Service = { name: string; text: string; image?: StruqImage; href?: string };
export type ServicesVariant = "rows" | "panels" | "pair";
export type SceneTone = "ground" | "inverse" | "field";

type Props = {
  services: Service[];
  variant?: ServicesVariant;
  heading?: string;
  tone?: SceneTone;
  className?: string;
};

/** The scene classes in blocks.css for each tone. */
export const TONE_CLASS: Record<SceneTone, string> = { ground: "bg-surface-0", inverse: "scene-inverse", field: "scene-field" };

/** The variant that renders for these services: panels needs a photo each, pair needs exactly two. */
export function resolveServicesVariant(variant: ServicesVariant, services: readonly Service[]): ServicesVariant {
  if (variant === "panels" && (services.length < 2 || services.some((s) => !s.image))) return "rows";
  if (variant === "pair" && services.length !== 2) return "rows";
  return variant;
}

/** The scene's entrance, shared by rows and pair. */
function useEntrance(ref: React.RefObject<HTMLElement | null>, key: string) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [key] },
  );
}

function Heading({ heading, className = "" }: { heading?: string; className?: string }) {
  if (!heading) return null;
  return (
    <h2 data-part="heading" className={`m-0 max-w-[18ch] font-display text-h2 ${className}`}>
      {heading}
    </h2>
  );
}

// --- rows -----------------------------------------------------------------------------------------------------------

type VariantProps<S> = { services: S; heading?: string; tone: SceneTone; className: string };

function Rows({ services, heading, tone, className }: VariantProps<Service[]>) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, `rows:${services.length}`);
  return (
    <section ref={ref} data-scene="services" data-variant="rows" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      {heading ? (
        <div className={`mb-12 md:mb-20 ${SHEET_GRID}`}>
          <Heading heading={heading} className="col-span-12 md:col-span-8" />
        </div>
      ) : null}
      <ul className="m-0 list-none border-t border-line p-0">
        {services.map((service) => {
          const inner = (
            <>
              <span aria-hidden data-flood="" className="absolute inset-0 origin-bottom bg-accent" />
              <span data-flood-name="" className="relative block font-display text-[clamp(2.25rem,9vw,3.5rem)] leading-[1] tracking-[-0.03em] md:text-[5.5vw]">
                {service.name}
              </span>
              <span data-flood-text="" className="relative block max-w-[34ch] text-body text-ink-muted">
                {service.text}
              </span>
            </>
          );
          const cls = "group relative grid gap-3 overflow-hidden px-sheet-margin py-8 md:grid-cols-[1fr_auto] md:items-end md:gap-x-[4vw] md:py-[3vw]";
          return (
            <li key={service.name} data-part="detail" className="border-b border-line">
              {service.href ? (
                <a href={service.href} data-flood-row="" className={cls}>
                  {inner}
                </a>
              ) : (
                <div tabIndex={0} data-flood-row="" className={cls}>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// --- panels ---------------------------------------------------------------------------------------------------------

/** The open panel's share of the row on wide screens, and the beat before the first opens on its own (s). */
const OPEN_SHARE = 0.5;
const FIRST = 0.2;

/** 0 below `a`, 1 above `b`, smooth between. */
function smooth(x: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function Panels({ services, heading, tone, className }: VariantProps<Service[]>) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const track = el.querySelector<HTMLElement>("[data-track]");
      const panels = Array.from(el.querySelectorAll<HTMLElement>("[data-panel]"));
      const n = panels.length;
      if (!track || n < 2) return entrance(el);
      const f = feel(el);
      const caps = panels.map((p) => p.querySelector("[data-cap]") as HTMLElement);
      const smalls = panels.map((p) => p.querySelector("[data-small]") as HTMLElement);
      const bigs = panels.map((p) => p.querySelector("[data-big]") as HTMLElement);
      const names = panels.map((p) => p.querySelector("[data-name]") as HTMLElement);
      const imgs = panels.map((p) => p.querySelector("img") as HTMLImageElement | null);
      const reduce = prefersReduced();
      const phoneQuery = window.matchMedia("(max-width: 767px)");
      const touch = window.matchMedia("(hover: none)").matches;

      // The numbers everything is drawn from: each panel's openness (they add up to one) and its arrival.
      const open: Record<string, number> = {};
      panels.forEach((_, i) => (open[`a${i}`] = 1 / n));
      const arrive = panels.map(() => ({ v: reduce ? 0 : 1 }));
      let current = -1;
      let dirty = true;
      const mark = () => {
        dirty = true;
      };

      let phone = false;
      let across = 0;
      let big = 0;
      let small = 0;
      let gap = 8;
      let capS = 0;
      let capB: number[] = [];
      const measure = () => {
        phone = phoneQuery.matches;
        gap = phone ? 6 : 8;
        if (phone) {
          across = track.clientWidth;
          big = Math.round(Math.min(window.innerHeight * 0.52, across * 1.2));
          small = 104;
          track.style.height = `${big + (n - 1) * (small + gap)}px`;
        } else {
          track.style.height = "";
          const along = track.clientWidth;
          across = track.clientHeight;
          big = Math.round(along * OPEN_SHARE);
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
        const room = (phone ? across : big) - (phone ? 32 : 40);
        names.forEach((nm) => {
          nm.style.fontSize = "";
          const w = nm.scrollWidth;
          if (w > room) {
            const fs = parseFloat(getComputedStyle(nm).fontSize) || 16;
            nm.style.fontSize = `${Math.floor(((fs * room) / w) * 10) / 10}px`;
          }
        });
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
          const lead = Math.round(pos);
          const end = Math.round(pos + size);
          pos += size + gap;
          const at = Math.round((lead + end) / 2 - big / 2);
          const before = lead - at;
          const after = at + big - end;
          const rise = arrive[i].v;
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
          // The small name sinks out as the display name rises in, in the same window of openness.
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
        tween = gsap.to(open, { ...target, duration: f.duration.swap * 0.85, ease: f.ease.enter, onUpdate: mark });
      };

      const tick = () => {
        if (!dirty) return;
        dirty = false;
        paint();
      };
      el.dataset.motion = "";
      measure();
      paint();
      document.fonts?.ready.then(() => {
        if (el.isConnected) measure();
      });
      gsap.ticker.add(tick);

      // Every photograph is decoded before the panels may arrive; they arrive after the heading, from the scene's
      // one trigger, then the first one opens on its own.
      const decoded = Promise.all(imgs.map((img) => img?.decode().catch(() => undefined)));
      const land = () => {
        if (reduce) return;
        decoded.then(() => {
          gsap.to(arrive, {
            v: 0,
            duration: f.duration.enter,
            ease: f.ease.enter,
            stagger: f.stagger.line,
            onUpdate: mark,
            onComplete: () => {
              gsap.delayedCall(FIRST, () => {
                if (current === -1) openTo(0);
              });
            },
          });
        });
      };
      if (reduce) openTo(0);
      const stop = el.querySelector('[data-part="heading"]')
        ? entrance(el, (tl, _f, at) => tl.call(land, [], at.media))
        : (() => {
            el.dataset.ready = "1";
            const t = ScrollTrigger.create({ trigger: track, start: LOCKED.trigger.start, once: true, onEnter: land });
            return () => t.kill();
          })();

      const onEnter = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        openTo(panels.indexOf(e.currentTarget as HTMLElement));
      };
      const onFocus = (e: FocusEvent) => openTo(panels.indexOf(e.currentTarget as HTMLElement));
      // A tap opens a closed panel first; a tap on the open one follows its link.
      const onClick = (e: MouseEvent) => {
        const i = panels.indexOf(e.currentTarget as HTMLElement);
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
        stop();
        tween?.kill();
        gsap.killTweensOf(arrive);
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
        names.forEach((nm) => (nm.style.fontSize = ""));
      };
    },
    { scope: root, dependencies: [services.length] },
  );

  return (
    <section
      ref={root}
      data-scene="services"
      data-variant="panels"
      data-energy="1"
      data-middle=""
      className={`flex min-h-svh flex-col px-sheet-margin py-[7vh] text-ink ${TONE_CLASS[tone]} ${className}`}
    >
      <Heading heading={heading} className="mb-[5vh]" />
      {/* The panels sit at full width and are clipped into place, so the track clips too: without it the closed panels
          widened the page (lab check, 2026-11-15). */}
      <div data-track="" className="relative flex flex-1 flex-col gap-1.5 overflow-hidden md:min-h-[60svh] md:flex-row md:gap-2">
        {services.map((service) => {
          const body = (
            <>
              {service.image ? (
                <Image
                  src={service.image.src}
                  alt={service.image.alt}
                  fill
                  loading="eager"
                  sizes="(min-width: 768px) 50vw, 100vw"
                  unoptimized={service.image.unoptimized}
                  className="object-cover"
                />
              ) : null}
              {/* The name on the scene's ground at the window's foot; focus draws the accent along its top. */}
              <div data-cap="" className="absolute bottom-0 left-[-1px] w-[calc(100%+2px)] bg-surface-0 group-focus-visible:shadow-[inset_0_2px_0_var(--accent)]">
                <div className="grid items-start px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
                  <span className="struq-line-mask block [grid-area:1/1]">
                    <span data-small="" className="block whitespace-nowrap text-small">
                      {service.name}
                    </span>
                  </span>
                  <span className="struq-line-mask block text-h3 [grid-area:1/1] md:text-[clamp(2.5rem,1rem_+_3.6vw,5.5rem)]">
                    <span data-big="" className="flex flex-col items-start gap-2 md:gap-3" style={{ transform: "translateY(115%)" }}>
                      <span data-name="" className="block whitespace-nowrap font-display text-h3 leading-[0.95] tracking-[-0.02em] md:text-[clamp(2.5rem,1rem_+_3.6vw,5.5rem)]">
                        {service.name}
                      </span>
                      <span className="max-w-[40ch] text-small text-ink-muted">{service.text}</span>
                    </span>
                  </span>
                </div>
              </div>
            </>
          );
          // The panel clips, so a ring outside it would be cut: focus draws the accent along the band's top instead.
          const cls = "group relative block h-[26svh] overflow-hidden outline-none md:h-auto md:flex-1";
          return service.href ? (
            <a key={service.name} href={service.href} data-panel="" className={cls}>
              {body}
            </a>
          ) : (
            <div key={service.name} tabIndex={0} data-panel="" className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// --- pair -----------------------------------------------------------------------------------------------------------

function Half({ service, sizes }: { service: Service; sizes: string }) {
  const name = service.href ? (
    <a href={service.href} data-hover-link="draw" className="text-ink">
      {service.name}
    </a>
  ) : (
    service.name
  );
  return (
    <div className="grid content-start gap-8 md:gap-10">
      {service.image ? (
        <div data-part="media" data-open="bottom" className="relative aspect-[4/3] overflow-hidden">
          <div className="absolute inset-0">
            <Image src={service.image.src} alt={service.image.alt} fill sizes={sizes} unoptimized={service.image.unoptimized} className="object-cover" />
          </div>
        </div>
      ) : null}
      <div>
        <h3 data-part="heading" className="m-0 font-display text-h2">
          {name}
        </h3>
        <p data-part="detail" className="m-0 mt-6 max-w-[38ch] text-body text-ink-muted md:mt-8">
          {service.text}
        </p>
      </div>
    </div>
  );
}

function Pair({ services, heading, tone, className }: VariantProps<[Service, Service]>) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "pair");
  const sizes = "(min-width: 768px) 42vw, 100vw";
  return (
    <section ref={ref} data-scene="services" data-variant="pair" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`items-stretch gap-y-12 ${SHEET_GRID}`}>
        {heading ? <Heading heading={heading} className="col-span-12 mb-4 md:col-span-8 md:mb-12" /> : null}
        <div className="col-span-12 md:col-span-5">
          <Half service={services[0]} sizes={sizes} />
        </div>
        {/* The rule between the halves: drawn down on wide screens, across on phones. */}
        <div aria-hidden className="col-span-12 md:col-span-2 md:col-start-6 md:flex md:justify-center">
          <ScrubLine axis="x" className="text-line md:hidden" />
          <ScrubLine axis="y" className="hidden h-full text-line md:block" />
        </div>
        <div className="col-span-12 md:col-span-5 md:col-start-8">
          <Half service={services[1]} sizes={sizes} />
        </div>
      </div>
    </section>
  );
}

export function ServicesList({ services, variant = "rows", heading, tone = "ground", className = "" }: Props) {
  const shown = resolveServicesVariant(variant, services);
  if (shown === "panels") return <Panels services={services} heading={heading} tone={tone} className={className} />;
  if (shown === "pair") return <Pair services={services as [Service, Service]} heading={heading} tone={tone} className={className} />;
  return <Rows services={services} heading={heading} tone={tone} className={className} />;
}
