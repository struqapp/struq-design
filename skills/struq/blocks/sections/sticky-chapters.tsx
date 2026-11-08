"use client";
// sticky-chapters (Struq section recipe)
// A process or a story told in chapters, with the camera holding still. One large photograph stands on
// the left while the chapters scroll past on the right; it stays put with plain CSS (position sticky),
// so nothing pins and nothing jumps. As a chapter climbs toward the middle of the screen its photograph
// rises over the last from the bottom edge of the frame, out of a slight push-in, and the chapter comes
// forward while the others step back. A hairline beside the frame fills as you read on, the only measure
// of how far you are.
//
// The swaps are tied to the scroll, not fired by it: each chapter after the first owns one short stretch
// of scroll (its top travelling from 70% to 45% of the screen) and its photograph's mask follows that
// stretch, lightly smoothed. So the frame always matches the chapter you are reading, a fast flick scrubs
// straight through, scrolling back simply lowers the photograph again, and the stretches never overlap,
// so the frame never holds more than two photographs. The emphasis follows the same positions, so text
// and photograph change together. Every photograph loads at the frame's size and is decoded before it
// shows; every mask is written from plain numbers.
//
// <StickyChapters title="Van plek tot huis." chapters={[
//   { title: "Eerst kijken.", text: "...", image: images.column[1] },
//   ...
// ]} />
//
// Without scripts and on phones: each chapter carries its photograph inline, above its text on phones
// and beside it on desktop. Reduced motion: the sticky frame with hard cuts and no push-in.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Chapter = {
  title: string;
  /** Two or three sentences. */
  text: string;
  image: StruqImage;
};

type Props = {
  /** An optional heading above the chapters. */
  title?: string;
  chapters: Chapter[];
  className?: string;
};

/** Each chapter's stretch of scroll: from its top at this share of the screen to its top at that one. */
const FROM = "top 70%";
const TO = "top 45%";
/** The smoothing on the scrub, in seconds: enough to feel like a camera, never enough to lag the text. */
const SMOOTH = 0.4;
/** A rising photograph settles out of this push-in. */
const PUSH = 1.12;

export function StickyChapters({ title, chapters, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const frame = el.querySelector<HTMLElement>("[data-frame]");
      const fill = el.querySelector<HTMLElement>("[data-fill]");
      const list = el.querySelector<HTMLElement>("[data-chapters]");
      const items = Array.from(el.querySelectorAll<HTMLElement>("[data-chapter]"));
      const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-layer]"));
      const pics = layers.map((l) => l.querySelector<HTMLElement>("[data-pic]"));
      const imgs = layers.map((l) => l.querySelector<HTMLImageElement>("img"));
      if (!frame || !list || items.length === 0 || layers.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 1024px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { wide, reduce } = ctx.conditions as { wide: boolean; reduce: boolean };
        if (!wide) return;

        // Every photograph loads now, at the frame's size. A layer stays hidden until its photograph is
        // decoded, so an undecoded one can only ever show the photograph beneath it, never an empty frame.
        imgs.forEach((img, i) => {
          if (!img || i === 0) return;
          layers[i].style.visibility = "hidden";
          img.loading = "eager";
          const loaded = img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              });
          loaded
            .then(() => img.decode())
            .catch(() => undefined)
            .then(() => {
              layers[i].style.visibility = "";
            });
        });
        if (imgs[0]) imgs[0].loading = "eager";

        // Each layer's progress (0 hidden below the frame's bottom edge, 1 whole), and the mask and push-in
        // written from it. Layers stack in chapter order, so the newest is always on top.
        const prog = layers.map((_, i) => ({ p: i === 0 ? 1 : 0 }));
        const rise = gsap.parseEase("power2.inOut");
        const settle = gsap.parseEase("power3.out");
        const paint = (i: number) => {
          const p = prog[i].p;
          const shown = reduce ? (p >= 0.5 ? 1 : 0) : rise(p);
          layers[i].style.clipPath = `inset(${((1 - shown) * 100).toFixed(2)}% 0% 0% 0%)`;
          const pic = pics[i];
          if (pic && !reduce && i > 0) {
            const k = 1 + (PUSH - 1) * (1 - settle(p));
            pic.style.transform = `translate3d(0, ${((1 - settle(p)) * 4).toFixed(2)}%, 0) scale(${k.toFixed(4)})`;
          }
        };

        // The chapter in front is the last one whose photograph has risen past half way.
        let active = -1;
        const mark = () => {
          let a = 0;
          for (let i = 1; i < prog.length; i += 1) if (prog[i].p >= 0.5) a = i;
          if (a === active) return;
          active = a;
          items.forEach((c, j) => {
            if (j === a) delete c.dataset.back;
            else c.dataset.back = "";
          });
        };

        layers.forEach((l, i) => {
          l.style.zIndex = String(i + 1);
          paint(i);
        });
        mark();

        const tweens = items.slice(1).map((item, k) => {
          const i = k + 1;
          return gsap.to(prog[i], {
            p: 1,
            ease: "none",
            onUpdate: () => {
              paint(i);
              mark();
            },
            scrollTrigger: { trigger: item, start: FROM, end: TO, scrub: reduce ? true : SMOOTH },
          });
        });

        // The hairline beside the frame fills from the first chapter to the last.
        const line = fill
          ? gsap.fromTo(
              fill,
              { scaleY: 0 },
              {
                scaleY: 1,
                ease: "none",
                scrollTrigger: { trigger: list, start: "top 52%", end: "bottom 52%", scrub: reduce ? true : SMOOTH },
              },
            )
          : null;

        return () => {
          for (const t of tweens) {
            t.scrollTrigger?.kill();
            t.kill();
          }
          line?.scrollTrigger?.kill();
          line?.kill();
          items.forEach((c) => delete c.dataset.back);
          for (const l of layers) {
            l.style.clipPath = "";
            l.style.zIndex = "";
            l.style.visibility = "";
          }
          for (const p of pics) if (p) p.style.transform = "";
          if (fill) fill.style.transform = "";
        };
      });
      return () => mm.revert();
    },
    { scope: stage, dependencies: [chapters.length] },
  );

  // With scripts on desktop the sticky frame stands in the left column and the chapters lose their inline
  // photographs; without scripts (or on phones) every chapter keeps its own. The pre-paint class is `js` in a
  // client project and `sq-js` on struq.nl.
  const withFrame = "hidden lg:[.js_&]:block lg:[.sq-js_&]:block";
  const inlineOnly = "lg:[.js_&]:hidden lg:[.sq-js_&]:hidden";

  return (
    <section
      ref={stage}
      data-section="sticky-chapters"
      aria-labelledby={title ? "sticky-chapters-title" : undefined}
      className={`relative bg-surface-0 px-6 py-20 lg:px-[4vw] lg:py-[10svh] ${className}`}
    >
      {title ? (
        <h2 id="sticky-chapters-title" className="font-display mb-12 max-w-[16ch] text-h2 text-ink lg:mb-[4svh]">
          {title}
        </h2>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-x-[6vw]">
        {/* The frame: it holds still while the chapters move past it. */}
        <div className={withFrame}>
          <div className="sticky top-[10svh] flex h-[80svh] gap-[1.4vw]">
            <div data-frame="" className="relative h-full flex-1 overflow-hidden rounded-[0.2rem] bg-surface-2">
              {chapters.map((c, i) => (
                <div
                  key={c.title}
                  data-layer=""
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: i === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
                >
                  <div data-pic="" className="absolute inset-0">
                    <Image
                      src={c.image.src}
                      alt={c.image.alt}
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 48vw, 1px"
                      unoptimized={c.image.unoptimized}
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* How far through the chapters: a hairline that fills, never a number. */}
            <div aria-hidden className="relative h-full w-px bg-line">
              <div data-fill="" className="absolute inset-0 origin-top scale-y-0 bg-ink" />
            </div>
          </div>
        </div>

        <ol data-chapters="" className="grid gap-16 lg:block">
          {chapters.map((c) => (
            <li
              key={c.title}
              data-chapter=""
              className="group/item lg:grid lg:grid-cols-2 lg:items-center lg:gap-x-[4vw] lg:py-[8svh] lg:[.js_&]:flex lg:[.js_&]:min-h-[80svh] lg:[.js_&]:py-0 lg:[.sq-js_&]:flex lg:[.sq-js_&]:min-h-[80svh] lg:[.sq-js_&]:py-0"
            >
              <span className={`relative mb-6 block aspect-[4/5] w-full overflow-hidden rounded-[0.2rem] bg-surface-2 sm:aspect-[4/3] lg:mb-0 lg:aspect-[4/5] ${inlineOnly}`}>
                <Image
                  src={c.image.src}
                  alt={c.image.alt}
                  fill
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  unoptimized={c.image.unoptimized}
                  className="object-cover"
                />
              </span>
              <div className="max-w-[30rem] transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[back]/item:-translate-x-[0.8vw] group-data-[back]/item:opacity-[0.24]">
                <h3 className="font-display text-h2 text-ink">{c.title}</h3>
                <p className="mt-5 text-lead text-ink-muted">{c.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
