"use client";
// components/struq/kit/middle/ProcessStrip.tsx (Struq recipe)
// How the work goes from the first call to done, told by sequence in layout: never numbered kickers, never icons, never
// durations the brief did not give. The middle scene for a renovation, a case, a bake, a build. Three variants, each
// extracted from a source block:
//
// - "thread": one line draws down the page as you read; the stages hang off it left and right, and as the line's tip
//   reaches a stage a short tick draws out to it, its term rises through its mask and its sentence follows. From the
//   draad variant of sections/approach.
// - "chapters": one photo holds sticky on the left (plain CSS sticky, nothing pins) while the stages pass on the right;
//   each stage's photo rises over the last as the stage reaches the middle of the screen, the current stage forward,
//   the others stepped back, a hairline beside the frame filling as you read. From sections/sticky-chapters.
// - "rows": the stages as hairline rows, term and one sentence, an upright photo beside them. From kit/quiet/Rows,
//   unchanged in layout.
//
// <ProcessStrip variant="thread" heading="From the first call to the last tile." steps={[
//   { term: "Visit", text: "We come by, measure up and listen to what the room has to do." },
//   { term: "Drawing", text: "A plan and a fixed quote, so nothing changes once we start." },
//   { term: "Build", text: "One team from stripping out to the last silicone line." },
// ]} />
//
// Props
// - steps: { term, text, image? }[], three to six, in order. term: one or two words. text: one sentence the agent may
//   write (what the step is). image: a StruqImage, used by "chapters".
// - variant: "thread" (default), "chapters" or "rows".
// - heading: optional, at h2. Without it the stages open the section.
// - label: optional, small, sentence case, beside the heading's first baseline in the margin columns (never above it).
// - image: optional upright photo for "rows" (beside the rows). "thread" sets no photo.
// - tone: "ground" (default), "inverse" or "field" (scene-inverse, scene-field in blocks.css). className: on the root.
//
// Empty slots and fallbacks (code, not advice): "chapters" needs a photo on every step and at least three steps,
// otherwise it renders "rows" (with `image`, or else the first step photo given, beside them; with none the rows take
// the full width). No heading: the stages open the scene. No label: nothing beside the heading. There is no slot for a
// duration, a date or a count; the order carries the time. resolveProcessVariant() returns the variant that renders.
//
// Mounting: a page section of its own. The root carries data-scene="process", data-variant (the rendered one),
// data-energy="1" and data-middle. No pin: chapters holds its photo with CSS sticky.
//
// Motion (kit/feel.ts, data-temperament on <body>): the heading's lines rise first (one timeline, one trigger:
// ./entrance). thread: the line is a ScrubLine drawn with the scroll, its tip at 62% of the screen, linear with the
// feel's scrub.flow; each stage fires once as the tip reaches it, its tick drawing over duration.swap, its term rising
// over duration.line, its sentence rising a block's travel after it. That drawing is the scene's one loud move. Crisp
// stages snap in short, slow stages settle long before the next. chapters: each photo's rise is scrubbed over its
// stage's stretch with scrub.flow smoothing, settling from a slight push-in. rows: the rows rise one after another,
// then the photo opens from its foot. Reduced motion: the composed scene, chapters cutting between photos. Without
// scripts: thread is a plain ruled list, chapters carries each photo inline, rows is composed.
//
// Phones: thread becomes one rule on the left with the stages on its right; chapters shows each photo inline above its
// stage; rows puts the sentence under its term and the photo after the rows.
import Image from "next/image";
import { useRef } from "react";
import { feel, prefersReduced } from "../feel";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../gsap";
import type { StruqImage } from "../images";
import { riseFrom, riseTo } from "../motion/Rise";
import { ScrubLine } from "../motion/ScrubLine";
import { LABEL, SHEET_GRID } from "../quiet/sheet";
import { entrance } from "./entrance";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type Step = { term: string; text: string; image?: StruqImage };
export type ProcessVariant = "thread" | "chapters" | "rows";

type Props = {
  steps: Step[];
  variant?: ProcessVariant;
  heading?: string;
  label?: string;
  image?: StruqImage;
  tone?: SceneTone;
  className?: string;
};

/** The variant that renders: chapters needs at least three steps and a photo on every one. */
export function resolveProcessVariant(variant: ProcessVariant, steps: readonly Step[]): ProcessVariant {
  if (variant === "chapters" && (steps.length < 3 || steps.some((s) => !s.image))) return "rows";
  return variant;
}

/** thread: where the line's tip rides, as a share of the screen from the top. */
const TIP = 62;

function Head({ heading, label, className = "" }: { heading?: string; label?: string; className?: string }) {
  if (!heading && !label) return null;
  return (
    <div className={`items-baseline gap-y-6 ${SHEET_GRID} ${className}`}>
      {heading ? (
        <h2 data-part="heading" className="col-span-12 m-0 max-w-[18ch] font-display text-h2 md:col-span-7">
          {heading}
        </h2>
      ) : null}
      {label ? (
        <p data-part="detail" className={`col-span-8 md:col-span-2 md:col-start-11 ${LABEL}`}>
          {label}
        </p>
      ) : null}
    </div>
  );
}

// --- thread ---------------------------------------------------------------------------------------------------------

function Thread({ steps, heading, label, tone, className }: Required<Pick<Props, "steps" | "tone" | "className">> & Pick<Props, "heading" | "label">) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const stop = entrance(el);
      const stages = Array.from(el.querySelectorAll<HTMLElement>("[data-stage]"));
      if (prefersReduced()) {
        for (const s of stages) s.dataset.ready = "1";
        return stop;
      }
      const f = feel(el);
      const wide = window.matchMedia("(min-width: 768px)").matches;
      const splits: SplitText[] = [];
      const triggers: ScrollTrigger[] = [];
      stages.forEach((stage, i) => {
        const tick = stage.querySelector<HTMLElement>("[data-tick]");
        const term = stage.querySelector<HTMLElement>("[data-term]");
        const text = stage.querySelector<HTMLElement>("[data-text]");
        const tl = gsap.timeline({ paused: true });
        // Stages on the left on wide screens draw their tick leftwards, out of the line.
        const left = wide && i % 2 === 0;
        if (tick) {
          tl.fromTo(
            tick,
            { clipPath: left ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: f.duration.swap * 0.5, ease: f.ease.swap },
            0,
          );
        }
        if (term) {
          const split = SplitText.create(term, { type: "lines", mask: "lines", linesClass: "struq-line" });
          splits.push(split);
          tl.fromTo(split.lines, { yPercent: f.travel.text }, { yPercent: 0, duration: f.duration.line, ease: f.ease.enter, stagger: f.stagger.line }, f.duration.swap * 0.2);
        }
        if (text) tl.fromTo(text, riseFrom(f), riseTo(f), f.duration.swap * 0.2 + f.stagger.block * 2);
        stage.dataset.ready = "1";
        triggers.push(ScrollTrigger.create({ trigger: stage, start: `top ${TIP}%`, once: true, onEnter: () => tl.play() }));
      });
      return () => {
        stop();
        for (const t of triggers) t.kill();
        for (const s of splits) s.revert();
      };
    },
    { scope: ref, dependencies: [steps.length] },
  );

  return (
    <section ref={ref} data-scene="process" data-variant="thread" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Head heading={heading} label={label} className="mb-[10svh] md:mb-[14svh]" />
      <div className="relative px-sheet-margin">
        <div className="relative">
          <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-line md:left-1/2" />
          <ScrubLine axis="y" start={`top ${TIP}%`} end={`bottom ${TIP}%`} className="absolute inset-y-0 left-0 text-ink md:left-1/2" />
          <ol className="relative m-0 list-none p-0">
            {steps.map((step, i) => {
              const left = i % 2 === 0;
              return (
                <li key={step.term} data-stage="" className="relative grid pb-[9svh] pl-8 last:pb-0 md:grid-cols-2 md:pb-[13svh] md:pl-0">
                  <span
                    aria-hidden
                    data-tick=""
                    className={`absolute left-0 top-[0.6em] h-px w-6 bg-ink text-h2 md:w-[3vw] ${left ? "md:left-[calc(50%-3vw)]" : "md:left-1/2"}`}
                  />
                  <div className={left ? "md:col-start-1 md:pr-[4vw] md:text-right" : "md:col-start-2 md:pl-[4vw]"}>
                    <h3 data-term="" className="m-0 font-display text-h2">
                      {step.term}
                    </h3>
                    <p data-text="" className={`m-0 mt-5 max-w-[34ch] text-body text-ink-muted ${left ? "md:ml-auto" : ""}`}>
                      {step.text}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

// --- chapters -------------------------------------------------------------------------------------------------------

/** Each stage's stretch of scroll: from its top at this share of the screen to its top at that one. */
const FROM = "top 70%";
const TO = "top 45%";

function Chapters({ steps, heading, label, tone, className }: Required<Pick<Props, "steps" | "tone" | "className">> & Pick<Props, "heading" | "label">) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const stop = entrance(el);
      const fill = el.querySelector<HTMLElement>("[data-fill]");
      const list = el.querySelector<HTMLElement>("[data-chapters]");
      const items = Array.from(el.querySelectorAll<HTMLElement>("[data-chapter]"));
      const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-layer]"));
      const pics = layers.map((l) => l.querySelector<HTMLElement>("[data-pic]"));
      const imgs = layers.map((l) => l.querySelector<HTMLImageElement>("img"));
      if (!list || items.length === 0 || layers.length === 0) return stop;
      const f = feel(el);
      const push = 1 + (f.travel.media - 1) * 0.4;

      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 1024px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { wide, reduce } = ctx.conditions as { wide: boolean; reduce: boolean };
        if (!wide) return;
        // A layer stays hidden until its photo is decoded, so it can only ever show the photo beneath it.
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

        const prog = layers.map((_, i) => ({ p: i === 0 ? 1 : 0 }));
        const rise = gsap.parseEase(f.ease.swap);
        const settle = gsap.parseEase(f.ease.enter);
        const paint = (i: number) => {
          const p = prog[i].p;
          const shown = reduce ? (p >= 0.5 ? 1 : 0) : rise(p);
          layers[i].style.clipPath = `inset(${((1 - shown) * 100).toFixed(2)}% 0% 0% 0%)`;
          const pic = pics[i];
          if (pic && !reduce && i > 0) {
            const k = 1 + (push - 1) * (1 - settle(p));
            pic.style.transform = `translate3d(0, ${((1 - settle(p)) * 4).toFixed(2)}%, 0) scale(${k.toFixed(4)})`;
          }
        };
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
            ease: f.ease.scrub,
            onUpdate: () => {
              paint(i);
              mark();
            },
            scrollTrigger: { trigger: item, start: FROM, end: TO, scrub: reduce ? true : f.scrub.flow },
          });
        });
        const line = fill
          ? gsap.fromTo(
              fill,
              { scaleY: 0 },
              { scaleY: 1, ease: f.ease.scrub, scrollTrigger: { trigger: list, start: "top 52%", end: "bottom 52%", scrub: reduce ? true : f.scrub.flow } },
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
      return () => {
        stop();
        mm.revert();
      };
    },
    { scope: ref, dependencies: [steps.length] },
  );

  // With scripts on desktop the sticky frame stands in the left column and the stages lose their inline photos;
  // without scripts (or on phones) every stage keeps its own. The pre-paint class is `js` in a client project.
  const withFrame = "hidden lg:[.js_&]:block lg:[.sq-js_&]:block";
  const inlineOnly = "lg:[.js_&]:hidden lg:[.sq-js_&]:hidden";

  return (
    <section ref={ref} data-scene="process" data-variant="chapters" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Head heading={heading} label={label} className="mb-12 lg:mb-[4svh]" />
      <div className="px-sheet-margin lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-x-[6vw]">
        <div className={withFrame}>
          <div className="sticky top-[10svh] flex h-[80svh] gap-[1.4vw]">
            <div className="relative h-full flex-1 overflow-hidden">
              {steps.map((step, i) =>
                step.image ? (
                  <div
                    key={step.term}
                    data-layer=""
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: i === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
                  >
                    <div data-pic="" className="absolute inset-0">
                      <Image src={step.image.src} alt={step.image.alt} fill loading="lazy" sizes="(min-width: 1024px) 48vw, 1px" unoptimized={step.image.unoptimized} className="object-cover" />
                    </div>
                  </div>
                ) : null,
              )}
            </div>
            {/* How far through the stages: a hairline that fills, never a number. */}
            <div aria-hidden className="relative h-full w-px bg-line">
              <div data-fill="" className="absolute inset-0 origin-top bg-ink" style={{ transform: "scaleY(0)" }} />
            </div>
          </div>
        </div>

        <ol data-chapters="" className="m-0 grid list-none gap-16 p-0 lg:block">
          {steps.map((step) => (
            <li
              key={step.term}
              data-chapter=""
              className="group/item lg:[.js_&]:flex lg:[.js_&]:min-h-[80svh] lg:[.js_&]:items-center lg:[.sq-js_&]:flex lg:[.sq-js_&]:min-h-[80svh] lg:[.sq-js_&]:items-center"
            >
              {step.image ? (
                <span className={`relative mb-6 block aspect-[4/5] w-full overflow-hidden sm:aspect-[4/3] lg:mb-10 ${inlineOnly}`}>
                  <Image src={step.image.src} alt={step.image.alt} fill sizes="(min-width: 1024px) 44vw, 100vw" unoptimized={step.image.unoptimized} className="object-cover" />
                </span>
              ) : null}
              <div data-chapter-text="" className="max-w-[30rem]">
                <h3 className="m-0 font-display text-h2 text-ink">{step.term}</h3>
                <p className="m-0 mt-5 text-body text-ink-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// --- rows -----------------------------------------------------------------------------------------------------------

function StepRows({ steps, heading, label, image, tone, className }: Required<Pick<Props, "steps" | "tone" | "className">> & Pick<Props, "heading" | "label" | "image">) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [steps.length, Boolean(image)] },
  );
  const wide = !image;
  return (
    <section ref={ref} data-scene="process" data-variant="rows" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`items-start gap-y-10 md:gap-y-16 ${SHEET_GRID}`}>
        {heading ? (
          <h2 data-part="heading" className="col-span-12 m-0 text-h2 md:col-span-7 md:self-baseline">
            {heading}
          </h2>
        ) : null}
        {label ? (
          <p data-part="detail" className={`col-span-8 md:col-span-2 md:col-start-11 md:self-baseline ${LABEL}`}>
            {label}
          </p>
        ) : null}
        <ol className={`col-span-12 m-0 grid list-none border-b border-line p-0 md:grid-cols-subgrid ${wide ? "md:col-span-12" : "md:col-span-8"}`}>
          {steps.map((step) => (
            <li
              key={step.term}
              data-part="detail"
              className="grid gap-y-2 border-t border-line py-6 md:col-span-full md:grid-cols-subgrid md:items-baseline md:py-8"
            >
              <h3 className="m-0 text-h3 md:col-span-3">{step.term}</h3>
              <p className={`m-0 max-w-[48ch] text-body text-ink-muted ${wide ? "md:col-span-6 md:col-start-5" : "md:col-span-5"}`}>{step.text}</p>
            </li>
          ))}
        </ol>
        {image ? (
          <div className="col-span-8 col-start-5 md:col-span-3 md:col-start-10">
            <div data-part="media" data-open="bottom" className="relative aspect-[4/5] overflow-hidden">
              <div className="absolute inset-0">
                <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 25vw, 66vw" unoptimized={image.unoptimized} className="object-cover" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ProcessStrip({ steps, variant = "thread", heading, label, image, tone = "ground", className = "" }: Props) {
  const shown = resolveProcessVariant(variant, steps);
  if (shown === "thread") return <Thread steps={steps} heading={heading} label={label} tone={tone} className={className} />;
  if (shown === "chapters") return <Chapters steps={steps} heading={heading} label={label} tone={tone} className={className} />;
  // rows, asked for or fallen back to: the given photo, else the first step photo, else none (full width).
  const photo = image ?? steps.find((s) => s.image)?.image;
  return <StepRows steps={steps} heading={heading} label={label} image={photo} tone={tone} className={className} />;
}
