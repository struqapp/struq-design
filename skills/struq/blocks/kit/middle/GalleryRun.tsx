"use client";
// components/struq/kit/middle/GalleryRun.tsx (Struq recipe)
// A run of photographs that sets the place or the mood, between two text scenes: a guesthouse, a restaurant, a
// photographer, a label, a bakery at night. Three variants, each extracted from a source block:
//
// - "track": the photos as one sideways run, each panning slightly against its frame, the line standing first in the
//   run. Pinned on wide screens by default (energy 2, it spends the film's pin budget); pin={false} keeps it a swipe
//   row at every width (energy 1). From kit/HorizontalGallery, through the Track primitive.
// - "walk": the line stays put on the left (CSS sticky, nothing pins) while two columns of upright photos pass beside
//   it, the second later and faster, so the walk has depth. From the wandeling variant of sections/about-studio.
// - "sheet": the photos land in an editorial grid with exact gaps and mixed sizes, captions under each, the line in
//   the first cell; no pin. The final, still state of sections/grid-assembly.
//
// <GalleryRun variant="sheet" line="Saturday night at the counter." images={[
//   { image: images.card[0], caption: "The pass, before service" },
//   { image: images.column[1] },
// ]} />
//
// Props
// - images: { image, caption? }[]. track takes four to eight, walk six to ten, sheet five to nine; past the most, the
//   rest do not render. caption: what is in the photo, small, under it. Never claim it is the client's own place or
//   work unless the caller says so.
// - line: optional, one short sentence that holds the run. walk needs it.
// - pin: track only, true (default) pins on wide screens, false keeps the swipe row.
// - variant: "sheet" (default), "track" or "walk".
// - tone: "ground" (default), "inverse" or "field" (scene-inverse, scene-field in blocks.css). className: on the root.
//
// Empty slots and fallbacks (code, not advice): "track" with fewer than four photos renders "sheet"; "walk" with fewer
// than six photos or no line renders "sheet"; "sheet" takes any count and re-spans its rows so no cell stands empty.
// No caption: the photo stands alone, no empty caption line kept. No line: the run opens on its first photo.
// resolveGalleryVariant() returns the variant that renders; sheetRows() the sheet's column spans.
//
// Mounting: a page section of its own. The root carries data-scene="gallery", data-variant (the rendered one),
// data-energy ("2" for a pinned track, else "1") and data-middle.
//
// Motion (kit/feel.ts, data-temperament on <body>): the line first, then the photos in reading order. track: the run
// slides with the scroll (scrub.pinned smoothing) and is the scene's one loud move. walk: the line's lines rise, each
// photo opens from its foot as it arrives, the second column drifts against the first with the scroll (linear,
// scrub.flow). sheet: each row is its own entrance as it arrives, each photo opening from its foot and settling from
// the feel's media scale (crisp a hard curtain, slow a long settle from a larger scale), its caption after it.
// Reduced motion: the composed run; track is the swipe row. Without scripts: composed, track a swipe row.
//
// Phones: track is a native swipe row with snap; walk is one column, the line on top; sheet is one column, the photos
// alternating full and inset widths.
import Image from "next/image";
import { useRef } from "react";
import { feel, prefersReduced } from "../feel";
import { gsap, useGSAP } from "../gsap";
import type { StruqImage } from "../images";
import { Track } from "../motion/Track";
import { SHEET_GRID } from "../quiet/sheet";
import { entrance, entranceEach } from "./entrance";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type GalleryPhoto = { image: StruqImage; caption?: string };
export type GalleryVariant = "track" | "walk" | "sheet";

type Props = {
  images: GalleryPhoto[];
  line?: string;
  pin?: boolean;
  variant?: GalleryVariant;
  tone?: SceneTone;
  className?: string;
};

/** The fewest and most photos each variant takes. */
export const GALLERY_COUNTS: Record<GalleryVariant, [number, number]> = { track: [4, 8], walk: [6, 10], sheet: [1, 9] };

/** The variant that renders: track needs four photos, walk six and its line; sheet takes any count. */
export function resolveGalleryVariant(variant: GalleryVariant, run: { images: readonly GalleryPhoto[]; line?: string }): GalleryVariant {
  const n = run.images.length;
  if (variant === "track" && n < GALLERY_COUNTS.track[0]) return "sheet";
  if (variant === "walk" && (n < GALLERY_COUNTS.walk[0] || !run.line)) return "sheet";
  return variant;
}

/** The sheet's rows as column spans (of twelve), for n photos; the line's cell takes four of the first row. */
const ROWS: number[][] = [
  [7, 5],
  [4, 4, 4],
  [5, 7],
  [3, 6, 3],
];

export function sheetRows(n: number, withLine = false): number[][] {
  const rows: number[][] = [];
  let left = n;
  if (withLine && left > 0) {
    rows.push([8]);
    left -= 1;
  }
  let k = 0;
  while (left > 0) {
    const pattern = ROWS[k % ROWS.length];
    k += 1;
    if (left >= pattern.length) {
      rows.push(pattern);
      left -= pattern.length;
    } else {
      // The last row re-spans what is left across the full width: one photo wide and set in, two as seven and five.
      rows.push(left === 1 ? [8] : [7, 5]);
      left = 0;
    }
  }
  return rows;
}

/** The photo's frame for a span: wide spans landscape, narrow ones upright. */
function ratioFor(span: number) {
  if (span >= 8) return "aspect-[16/9]";
  if (span >= 6) return "aspect-[4/3]";
  if (span >= 4) return "aspect-[4/5]";
  return "aspect-[3/4]";
}

const SPAN: Record<number, string> = {
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
};

function Caption({ text }: { text?: string }) {
  if (!text) return null;
  return <figcaption className="mt-3 max-w-[40ch] text-small text-ink-muted">{text}</figcaption>;
}

type VariantProps = { images: GalleryPhoto[]; line?: string; tone: SceneTone; className: string };

// --- sheet ----------------------------------------------------------------------------------------------------------

function Sheet({ images, line, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entranceEach(el);
    },
    { scope: ref, dependencies: [images.length, Boolean(line)] },
  );
  const rows = sheetRows(images.length, Boolean(line));
  let at = 0;
  let photo = 0;
  return (
    <section ref={ref} data-scene="gallery" data-variant="sheet" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className="grid gap-y-14 md:gap-y-[0.9vw]">
        {rows.map((spans, r) => {
          const first = r === 0 && line;
          return (
            <div key={r} data-middle="" data-middle-group="" className={`items-start gap-y-14 md:gap-x-[0.9vw] md:gap-y-0 ${SHEET_GRID}`}>
              {first ? (
                <h2 data-part="heading" className="col-span-12 m-0 max-w-[14ch] self-end font-display text-h2 md:col-span-4">
                  {line}
                </h2>
              ) : null}
              {spans.map((span, s) => {
                const item = images[at++];
                const i = photo++;
                // A lone wide photo at the foot is set in; with the line it stands beside it.
                const start = first ? "md:col-start-5" : spans.length === 1 ? "md:col-start-3" : "md:col-start-auto";
                // Phones: one column, full width and set in by turns.
                const phone = i % 2 === 0 ? "col-span-12" : "col-span-10 col-start-3";
                return (
                  <figure key={`${r}:${s}`} className={`m-0 ${phone} ${SPAN[span]} ${start}`}>
                    <div data-part="media" data-open="bottom" className={`relative overflow-hidden ${ratioFor(span)}`}>
                      <div className="absolute inset-0">
                        <Image
                          src={item.image.src}
                          alt={item.image.alt}
                          fill
                          sizes={`(min-width: 768px) ${Math.round((span / 12) * 100)}vw, 100vw`}
                          unoptimized={item.image.unoptimized}
                          className="object-cover"
                        />
                      </div>
                    </div>
                    {item.caption ? (
                      <div data-part="detail">
                        <Caption text={item.caption} />
                      </div>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// --- walk -----------------------------------------------------------------------------------------------------------

/** How far the second column travels against the first over the section, in screens. */
const WALK = 0.24;

function Walk({ images, line, tone, className }: VariantProps & { line: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const stop = entranceEach(el);
      const late = el.querySelector<HTMLElement>("[data-walk-late]");
      if (!late || prefersReduced()) return stop;
      const f = feel(el);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const tween = gsap.fromTo(
          late,
          { y: () => 0.5 * WALK * window.innerHeight },
          {
            y: () => -0.5 * WALK * window.innerHeight,
            ease: f.ease.scrub,
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: f.scrub.flow, invalidateOnRefresh: true },
          },
        );
        return () => {
          tween.scrollTrigger?.kill();
          tween.revert();
        };
      });
      return () => {
        stop();
        mm.revert();
      };
    },
    { scope: ref, dependencies: [images.length] },
  );
  const half = Math.ceil(images.length / 2);
  const cols = [images.slice(0, half), images.slice(half)];
  return (
    <section ref={ref} data-scene="gallery" data-variant="walk" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`gap-y-14 ${SHEET_GRID}`}>
        <div className="col-span-12 md:col-span-5">
          <div data-middle="" data-middle-group="" className="md:sticky md:top-[16svh]">
            <h2 data-part="heading" className="m-0 max-w-[13ch] font-display text-h2">
              {line}
            </h2>
          </div>
        </div>
        <div className="col-span-12 grid gap-y-14 md:col-span-6 md:col-start-7 md:grid-cols-2 md:gap-x-sheet-gutter">
          {cols.map((col, c) => (
            <div key={c} data-walk-late={c === 1 ? "" : undefined} className={`grid content-start gap-y-14 md:gap-y-[12svh] ${c === 1 ? "md:pt-[28svh]" : ""}`}>
              {col.map((item, i) => (
                <figure key={`${c}:${i}`} data-middle="" data-middle-group="" className="m-0">
                  <div data-part="media" data-open="bottom" className="relative aspect-[4/5] overflow-hidden">
                    <div className="absolute inset-0">
                      <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 768px) 25vw, 100vw" unoptimized={item.image.unoptimized} className="object-cover" />
                    </div>
                  </div>
                  {item.caption ? (
                    <div data-part="detail">
                      <Caption text={item.caption} />
                    </div>
                  ) : null}
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- track ----------------------------------------------------------------------------------------------------------

function Run({ images, line, tone, className, pin }: VariantProps & { pin: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [images.length, pin] },
  );
  return (
    <section
      ref={ref}
      data-scene="gallery"
      data-variant="track"
      data-energy={pin ? "2" : "1"}
      data-middle=""
      className={`py-28 text-ink ${pin ? "md:py-0" : "md:py-40"} ${TONE_CLASS[tone]} ${className}`}
    >
      <Track label={line ?? "Photographs"} pin={pin} rowClassName="gap-5 px-sheet-margin md:gap-[2.4vw]">
        {line ? (
          <div className="flex w-[80vw] flex-col justify-end md:w-[30vw] md:pr-[3vw]">
            <h2 data-part="heading" className="m-0 max-w-[14ch] font-display text-h2">
              {line}
            </h2>
          </div>
        ) : null}
        {images.map((item, i) => {
          const upright = i % 2 === 1;
          return (
            <figure key={i} data-part="detail" className={`m-0 ${upright ? "w-[66vw] md:w-[24vw] md:pt-[10svh]" : "w-[80vw] md:w-[34vw]"}`}>
              <div className={`relative overflow-hidden ${upright ? "aspect-[4/5]" : "aspect-[3/2]"}`}>
                <div data-pan="" className="absolute inset-[-8%]">
                  <Image
                    src={item.image.src}
                    alt={item.image.alt}
                    fill
                    sizes={upright ? "(min-width: 768px) 30vw, 66vw" : "(min-width: 768px) 42vw, 80vw"}
                    unoptimized={item.image.unoptimized}
                    className="object-cover"
                  />
                </div>
              </div>
              <Caption text={item.caption} />
            </figure>
          );
        })}
      </Track>
    </section>
  );
}

export function GalleryRun({ images, line, pin = true, variant = "sheet", tone = "ground", className = "" }: Props) {
  const v = resolveGalleryVariant(variant, { images, line });
  const shown = images.slice(0, GALLERY_COUNTS[v][1]);
  if (v === "track") return <Run images={shown} line={line} pin={pin} tone={tone} className={className} />;
  if (v === "walk" && line) return <Walk images={shown} line={line} tone={tone} className={className} />;
  return <Sheet images={shown} line={line} tone={tone} className={className} />;
}
