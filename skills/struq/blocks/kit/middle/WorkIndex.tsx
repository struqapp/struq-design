"use client";
// components/struq/kit/middle/WorkIndex.tsx (Struq recipe)
// A list of things the visitor wants to look at one by one: a photographer's projects, a guesthouse's rooms, a
// label's collection, a studio's work. Three variants, each extracted from a source block:
//
// - "follow": the names at display size in hairline rows; hovering one brings its photo in an upright frame that
//   follows the pointer and wipes in the way the hand travelled, the other rows stepping back. From
//   sections/hover-list, through the FollowFrame primitive.
// - "trail": the same rows; the pointer deals prints of the hovered row's photo behind it, six at most, the oldest
//   fading first. From sections/image-trail, through FollowFrame's trail.
// - "plates": no hover: each item a large photo, alternating seven and five columns down the page, its name and its
//   line as a caption under the photo. From the clip variant of sections/reveals and the grid of kit/quiet/PhotoText.
//
// <WorkIndex variant="follow" heading="Rooms with a view of the dunes." items={[
//   { name: "The garden room", image: images.column[0], line: "Ground floor, doors onto the lawn.", href: "/rooms/garden" },
//   { name: "The attic", image: images.column[1] },
//   { name: "The dune room", image: images.column[2] },
// ]} />
//
// Props
// - items: { name, image, line?, href? }[], three to eight (only the first eight render). name: the item as the
//   client calls it, or the trade's plain category. image: a StruqImage. line: one quiet line about it, the client's
//   own words. href: makes the row or plate a link.
// - variant: "follow" (default), "trail" or "plates".
// - heading: optional, at h2. Without it the list opens the section.
// - label: optional, small, sentence case, beside the heading's first baseline in the margin columns (never above it).
// - tone: "ground" (default), "inverse" or "field" (scene-inverse, scene-field in blocks.css). className: on the root.
//
// Empty slots and fallbacks (code, not advice): "follow" and "trail" with fewer than three items render "plates" (a
// hover list of two reads as unfinished). No line: the row is the name alone, the plate's caption the name alone. No
// href: the row is not a link (no arrow, no link hover), still focusable so its photo is reachable by keyboard. No
// heading: the list opens the scene. There is no slot for a year, a client, an award or a count.
// resolveWorkVariant() returns the variant that renders.
//
// Mounting: a page section of its own. The root carries data-scene="work", data-variant (the rendered one),
// data-energy="1" and data-middle. No pin.
//
// Motion (kit/feel.ts, data-temperament on <body>): the heading's lines rise, then the rows one after another (one
// timeline from one trigger, ./entrance). In plates each plate is its own entrance as it arrives: the photo wipes up
// from its foot and settles from the feel's media scale, then its caption rises. The loud move is the follow frame or
// the trail, hover only: crisp snaps the frame to the pointer, slow lets it lag and lean less (FollowFrame). Reduced
// motion: the composed list; hover or focus stands the photo beside the row. Without scripts: the list, photos inline.
//
// Phones and touch: no hover. follow and trail show each photo inline above its name at full width; plates stack
// photo, then caption.
import Image from "next/image";
import { useRef } from "react";
import { useGSAP } from "../gsap";
import type { StruqImage } from "../images";
import { FOLLOW_INLINE, FollowFrame } from "../motion/FollowFrame";
import { LABEL, SHEET_GRID } from "../quiet/sheet";
import { entrance, entranceEach } from "./entrance";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type WorkItem = { name: string; image: StruqImage; line?: string; href?: string };
export type WorkVariant = "follow" | "trail" | "plates";

type Props = {
  items: WorkItem[];
  variant?: WorkVariant;
  heading?: string;
  label?: string;
  tone?: SceneTone;
  className?: string;
};

/** The most items a work index shows. */
export const WORK_MAX = 8;

/** The variant that renders: a hover list needs at least three rows. */
export function resolveWorkVariant(variant: WorkVariant, items: readonly WorkItem[]): WorkVariant {
  if ((variant === "follow" || variant === "trail") && items.length < 3) return "plates";
  return variant;
}

function Head({ heading, label }: { heading?: string; label?: string }) {
  if (!heading && !label) return null;
  return (
    <div className={`mb-12 items-baseline gap-y-6 md:mb-20 ${SHEET_GRID}`}>
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

type VariantProps = { items: WorkItem[]; heading?: string; label?: string; tone: SceneTone; className: string };

// --- follow and trail -----------------------------------------------------------------------------------------------

function HoverRows({ items, heading, label, tone, className, mode }: VariantProps & { mode: "follow" | "trail" }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [items.length, mode] },
  );
  return (
    <section ref={ref} data-scene="work" data-variant={mode} data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Head heading={heading} label={label} />
      <FollowFrame images={items.map((item) => item.image)} mode={mode} className="px-sheet-margin">
        <ul className="m-0 list-none border-t border-line p-0">
          {items.map((item) => {
            const body = (
              <>
                {/* Touch and phones: the photo inline, full width, above its name. */}
                <span className={`relative mb-5 block aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] ${FOLLOW_INLINE}`}>
                  <Image src={item.image.src} alt={item.image.alt} fill sizes="100vw" unoptimized={item.image.unoptimized} className="object-cover" />
                </span>
                {/* The focus ring is drawn around the words only, so a placed frame stands clear of it. */}
                <span
                  data-follow-text=""
                  className="flex min-w-0 flex-col gap-2 outline-offset-[0.6rem] transition-[translate] duration-[var(--dur-enter)] ease-[var(--ease-enter)] group-data-[current]/row:translate-x-[1.4vw] group-focus-visible/row:outline-2 group-focus-visible/row:outline-solid group-focus-visible/row:outline-accent lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-[2.2vw]"
                >
                  <span className="block font-display text-[clamp(2.25rem,9vw,3.5rem)] leading-[1] tracking-[-0.03em] lg:text-[clamp(2.75rem,1rem_+_6vw,8rem)]">
                    {item.name}
                  </span>
                  {item.line ? <span className="block max-w-[40ch] text-small text-ink-muted">{item.line}</span> : null}
                </span>
              </>
            );
            const cls =
              "group/row block py-6 outline-none transition-opacity duration-[var(--dur-enter)] ease-[var(--ease-enter)] lg:py-[1.3vw] [[data-active]_&:not([data-current])]:opacity-[0.28]";
            return (
              <li key={item.name} data-part="detail" className="border-b border-line">
                {item.href ? (
                  <a href={item.href} data-follow-row="" className={`${cls} text-ink`}>
                    {body}
                  </a>
                ) : (
                  <div tabIndex={0} data-follow-row="" className={cls}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </FollowFrame>
    </section>
  );
}

// --- plates ---------------------------------------------------------------------------------------------------------

function Plates({ items, heading, label, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entranceEach(el);
    },
    { scope: ref, dependencies: [items.length] },
  );
  return (
    <section ref={ref} data-scene="work" data-variant="plates" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      {heading || label ? (
        <div data-middle="" data-middle-group="">
          <Head heading={heading} label={label} />
        </div>
      ) : null}
      <ul className={`m-0 list-none gap-y-20 p-0 md:gap-y-[14svh] ${SHEET_GRID}`}>
        {items.map((item, i) => {
          // Seven columns, then five, the side alternating: the plates walk down the page.
          const seven = i % 2 === 0;
          const place = seven ? (i % 4 === 0 ? "md:col-span-7 md:col-start-1" : "md:col-span-7 md:col-start-6") : i % 4 === 1 ? "md:col-span-5 md:col-start-8" : "md:col-span-5 md:col-start-2";
          const caption = (
            <>
              <span className="block font-display text-h3">{item.name}</span>
              {item.line ? <span className="mt-2 block max-w-[40ch] text-small text-ink-muted">{item.line}</span> : null}
            </>
          );
          return (
            // Each plate its own row on the page's columns, so the plates walk down the page side to side.
            <li key={item.name} data-middle="" data-middle-group="" className="col-span-12 md:grid md:grid-cols-subgrid">
              <figure className={`m-0 ${place}`}>
                <div data-part="media" data-open="bottom" className={`relative overflow-hidden ${seven ? "aspect-[4/3]" : "aspect-[4/5]"}`}>
                  <div className="absolute inset-0">
                    <Image
                      src={item.image.src}
                      alt={item.image.alt}
                      fill
                      sizes={seven ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 42vw, 100vw"}
                      unoptimized={item.image.unoptimized}
                      className="object-cover"
                    />
                  </div>
                </div>
                <figcaption data-part="detail" className="mt-5 md:mt-6">
                  {item.href ? (
                    <a href={item.href} data-hover-link="draw" className="text-ink">
                      {caption}
                    </a>
                  ) : (
                    caption
                  )}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WorkIndex({ items, variant = "follow", heading, label, tone = "ground", className = "" }: Props) {
  const shown = items.slice(0, WORK_MAX);
  const v = resolveWorkVariant(variant, shown);
  if (v === "plates") return <Plates items={shown} heading={heading} label={label} tone={tone} className={className} />;
  return <HoverRows items={shown} heading={heading} label={label} tone={tone} className={className} mode={v} />;
}
