"use client";
// components/struq/kit/middle/ProductRow.tsx (Struq recipe)
// Things for sale shown as objects, for a shop that gave no prices and no stock: a ceramicist's mugs and bowls, a
// label's first collection, a bakery's breads by the trade's own categories. Never a cart, a basket count or a price
// the caller did not pass. Three variants, each extracted from a source:
//
// - "shelf": the objects stand on one shared shelf line; the shelf draws, each object's profile draws on it, then its
//   photo rises over it from the shelf, the name as a caption last. From the ProfileDraw of the ana-ferreira-ceramics
//   showcase (struq-showcases).
// - "index": the kinds of thing as display rows with the follow frame; the row name is the brief's own noun ("Mugs",
//   "Bowls"). From sections/hover-list, through the FollowFrame primitive.
// - "pair": two large plates side by side at different heights, the name and one sentence under each, one door under
//   both when a shop URL is given. From kit/quiet/PhotoText and the doors of kit/quiet/Close.
//
// <ProductRow variant="shelf" items={[
//   { name: "Mugs", image: images.column[0], text: "Thrown in stoneware, glazed inside.", profile: { d: "M30 110 V40 H90 V110", viewBox: "0 0 120 120" } },
//   { name: "Bowls", image: images.column[1] },
//   { name: "Plates", image: images.column[2], price: { amount: 38, currency: "EUR" } },
// ]} shop={{ label: "Visit the shop", href: "https://shop.example" }} locale="en-GB" />
//
// Props
// - items: { name, image, text?, price?, profile? }[]. shelf takes three to five, index two to six, pair two. name:
//   the brief's own noun or the trade's plain category, never an invented piece name or SKU. text: one sentence.
//   price: { amount, currency } (ISO 4217), only from the caller, written through Intl.NumberFormat. profile: { d,
//   viewBox? } an SVG path of the object's outline, standing on the bottom of its viewBox (default "0 0 120 120").
// - shop: optional { label, href }: the one door to the shop, a Pressable under the objects.
// - locale: for the prices (default "en-GB").
// - variant: "shelf" (default), "index" or "pair".
// - heading: optional, at h2. Without it the objects open the section.
// - tone: "ground" (default), "inverse" or "field" (scene-inverse, scene-field in blocks.css). className: on the root.
//
// Empty slots and fallbacks (code, not advice): "pair" with other than two items renders "shelf" (three to five) or
// "index"; "shelf" with two items renders "pair", with more than five "index"; "index" with fewer than two renders
// "shelf"; index shows the first six. No price: no price line at all. No shop: no button, the scene ends on the
// objects. No profile: shelf draws only the shelf rule. No text: the caption is the name alone.
// resolveProductVariant() returns the variant that renders; priceText() the written price.
//
// Mounting: a page section of its own. The root carries data-scene="product", data-variant (the rendered one),
// data-energy="1" and data-middle. No pin.
//
// Motion (kit/feel.ts, data-temperament on <body>): shelf is one timeline from one trigger: the heading, the shelf
// rule drawing across over duration.swap, the profiles drawing along their length (crisp all together, weighted one
// after another overlapping, slow one by one), each photo rising from the shelf on the curtain ease, the captions
// last. The profile draw is the scene's one loud move. index: the heading, the rows rising in turn; hover is the
// follow frame (FollowFrame). pair: the heading, the plates opening from their foot, the captions, the door.
// Reduced motion: the composed scene, profiles drawn under the photos. Without scripts: composed.
//
// Phones: shelf becomes a swipe row of objects on one rule; index shows each photo inline; pair stacks.
import Image from "next/image";
import { useRef } from "react";
import { feel, prefersReduced } from "../feel";
import { gsap, useGSAP } from "../gsap";
import type { StruqImage } from "../images";
import { FOLLOW_INLINE, FollowFrame } from "../motion/FollowFrame";
import { Pressable } from "../motion/Pressable";
import { SHEET_GRID } from "../quiet/sheet";
import { entrance } from "./entrance";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type Price = { amount: number; currency: string };
export type Product = { name: string; image: StruqImage; text?: string; price?: Price; profile?: { d: string; viewBox?: string } };
export type ProductVariant = "shelf" | "index" | "pair";
export type ShopDoor = { label: string; href: string };

type Props = {
  items: Product[];
  shop?: ShopDoor;
  locale?: string;
  heading?: string;
  variant?: ProductVariant;
  tone?: SceneTone;
  className?: string;
};

/** The variant that renders: pair is exactly two, shelf three to five, index two to six (the first six shown). */
export function resolveProductVariant(variant: ProductVariant, items: readonly Product[]): ProductVariant {
  const n = items.length;
  if (variant === "pair" && n !== 2) return n >= 3 && n <= 5 ? "shelf" : n < 2 ? "shelf" : "index";
  if (variant === "shelf" && n === 2) return "pair";
  if (variant === "shelf" && n > 5) return "index";
  if (variant === "index" && n < 2) return "shelf";
  return variant;
}

/** A price as the locale writes it, only from what was passed. */
export function priceText(price: Price, locale = "en-GB") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: price.currency }).format(price.amount);
}

function Heading({ heading }: { heading?: string }) {
  if (!heading) return null;
  return (
    <div className={`mb-12 md:mb-20 ${SHEET_GRID}`}>
      <h2 data-part="heading" className="col-span-12 m-0 max-w-[18ch] font-display text-h2 md:col-span-8">
        {heading}
      </h2>
    </div>
  );
}

function Door({ shop, className = "" }: { shop?: ShopDoor; className?: string }) {
  if (!shop) return null;
  return (
    <div data-part="detail" className={`px-sheet-margin ${className}`}>
      <Pressable href={shop.href} press="fill" className="min-h-11 border border-ink px-7 py-3 text-small font-medium text-ink">
        {shop.label}
      </Pressable>
    </div>
  );
}

function Caption({ item, locale, big = false }: { item: Product; locale: string; big?: boolean }) {
  return (
    <>
      <span className={`block font-display ${big ? "text-h2" : "text-h3"}`}>{item.name}</span>
      {item.text ? <span className={`mt-2 block max-w-[34ch] text-ink-muted ${big ? "text-body" : "text-small"}`}>{item.text}</span> : null}
      {item.price ? <span className="mt-2 block text-small tabular-nums text-ink">{priceText(item.price, locale)}</span> : null}
    </>
  );
}

type VariantProps = { items: Product[]; shop?: ShopDoor; locale: string; heading?: string; tone: SceneTone; className: string };

// --- shelf ----------------------------------------------------------------------------------------------------------

function Shelf({ items, shop, locale, heading, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const rules = Array.from(el.querySelectorAll<HTMLElement>("[data-shelf-rule]"));
      const objects = Array.from(el.querySelectorAll<HTMLElement>("[data-object]"));
      if (prefersReduced()) {
        el.dataset.ready = "1";
        return;
      }
      const f = feel(el);
      // The heading and the door through the shared entrance; the shelf's own build joins its timeline after the heading.
      const stop = entrance(el, (tl, _f, at) => {
        const start = at.media;
        // The segments draw one after another at an even pace, so the shelf reads as one line drawing across.
        const each = f.duration.swap / Math.max(1, rules.length);
        rules.forEach((rule, i) => tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: each, ease: "none" }, start + i * each));
        // How the draws overlap: crisp all at once, weighted overlapping, slow one by one.
        const gap = f.name === "crisp" ? 0 : f.name === "weighted" ? f.duration.swap * 0.35 : f.duration.swap * 0.8;
        const drawAt = start + f.duration.swap * 0.5;
        objects.forEach((obj, i) => {
          const path = obj.querySelector<SVGPathElement>("[data-profile]");
          const photo = obj.querySelector<HTMLElement>("[data-object-photo]");
          const cap = obj.querySelector<HTMLElement>("[data-object-cap]");
          const at = drawAt + i * gap;
          let rise = at;
          if (path) {
            const length = path.getTotalLength();
            gsap.set(path, { attr: { "stroke-dasharray": `${length} ${length}` } });
            tl.fromTo(path, { attr: { "stroke-dashoffset": length } }, { attr: { "stroke-dashoffset": 0 }, duration: f.duration.swap, ease: f.ease.swap }, at);
            rise = at + f.duration.swap * 0.85;
          }
          if (photo) {
            tl.fromTo(photo, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: f.dur("curtain", photo.offsetHeight), ease: f.ease.curtain }, rise);
          }
          if (cap) tl.fromTo(cap, { autoAlpha: 0, y: f.travel.block * 0.5 }, { autoAlpha: 1, y: 0, duration: f.duration.enter, ease: f.ease.enter }, rise + f.duration.curtain * 0.5);
        });
      });
      return stop;
    },
    { scope: ref, dependencies: [items.length] },
  );

  return (
    <section ref={ref} data-scene="product" data-variant="shelf" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Heading heading={heading} />
      <div className="relative">
        {/* Phones: one swipe row on the one rule; wide screens: the objects share the shelf across the page. */}
        <ul
          role="list"
          aria-label={heading ?? "Objects"}
          tabIndex={0}
          className="m-0 flex list-none snap-x snap-mandatory scroll-px-sheet-margin gap-5 overflow-x-auto px-sheet-margin pb-2 outline-offset-4 [scrollbar-width:none] md:grid md:grid-cols-[repeat(var(--n),minmax(0,1fr))] md:gap-sheet-gutter md:overflow-visible [&::-webkit-scrollbar]:hidden"
          style={{ ["--n" as string]: String(items.length) }}
        >
          {items.map((item) => (
            <li key={item.name} data-object="" className="group/obj w-[64vw] shrink-0 snap-start md:w-auto">
              <div className="relative aspect-[4/5]">
                {item.profile ? (
                  <svg aria-hidden viewBox={item.profile.viewBox ?? "0 0 120 120"} preserveAspectRatio="xMidYMax meet" className="absolute inset-x-[14%] bottom-0 h-[70%] w-[72%] overflow-visible text-ink">
                    <path data-profile="" d={item.profile.d} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
                  </svg>
                ) : null}
                <div data-object-photo="" className="absolute inset-0 overflow-hidden">
                  <Image src={item.image.src} alt={item.image.alt} fill sizes={`(min-width: 768px) ${Math.round(90 / items.length)}vw, 64vw`} unoptimized={item.image.unoptimized} className="object-cover" />
                </div>
              </div>
              {/* The shelf: one segment under each object reaching across the gap to the next, so the segments read
                  as one line and draw as one, left to right. */}
              <span aria-hidden data-shelf-rule="" className="block h-px w-[calc(100%+1.25rem)] origin-left bg-ink group-last/obj:w-full md:w-[calc(100%+var(--spacing-sheet-gutter))]" />
              <p data-object-cap="" className="m-0 mt-5 md:mt-6">
                <Caption item={item} locale={locale} />
              </p>
            </li>
          ))}
        </ul>
      </div>
      <Door shop={shop} className="mt-14 md:mt-20" />
    </section>
  );
}

// --- index ----------------------------------------------------------------------------------------------------------

function Index({ items, shop, locale, heading, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [items.length] },
  );
  return (
    <section ref={ref} data-scene="product" data-variant="index" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Heading heading={heading} />
      <FollowFrame images={items.map((item) => item.image)} className="px-sheet-margin">
        <ul className="m-0 list-none border-t border-line p-0">
          {items.map((item) => (
            <li key={item.name} data-part="detail" className="border-b border-line">
              <div
                tabIndex={0}
                data-follow-row=""
                className="group/row block py-6 outline-none transition-opacity duration-[var(--dur-enter)] ease-[var(--ease-enter)] lg:py-[1.3vw] [[data-active]_&:not([data-current])]:opacity-[0.28]"
              >
                <span className={`relative mb-5 block aspect-[4/3] w-full overflow-hidden sm:aspect-[16/9] ${FOLLOW_INLINE}`}>
                  <Image src={item.image.src} alt={item.image.alt} fill sizes="100vw" unoptimized={item.image.unoptimized} className="object-cover" />
                </span>
                <span
                  data-follow-text=""
                  className="flex min-w-0 flex-col gap-2 outline-offset-[0.6rem] transition-[translate] duration-[var(--dur-enter)] ease-[var(--ease-enter)] group-data-[current]/row:translate-x-[1.4vw] group-focus-visible/row:outline-2 group-focus-visible/row:outline-solid group-focus-visible/row:outline-accent lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-[2.2vw]"
                >
                  <span className="block font-display text-[clamp(2.25rem,9vw,3.5rem)] leading-[1] tracking-[-0.03em] lg:text-[clamp(2.75rem,1rem_+_6vw,8rem)]">
                    {item.name}
                  </span>
                  {item.text ? <span className="block max-w-[40ch] text-small text-ink-muted">{item.text}</span> : null}
                  {item.price ? <span className="block text-small tabular-nums text-ink">{priceText(item.price, locale)}</span> : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </FollowFrame>
      <Door shop={shop} className="mt-14 md:mt-20" />
    </section>
  );
}

// --- pair -----------------------------------------------------------------------------------------------------------

function Pair({ items, shop, locale, heading, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      return entrance(el);
    },
    { scope: ref, dependencies: [items.length] },
  );
  return (
    <section ref={ref} data-scene="product" data-variant="pair" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Heading heading={heading} />
      <div className={`items-start gap-y-16 ${SHEET_GRID}`}>
        {items.slice(0, 2).map((item, i) => (
          <figure key={item.name} className={`col-span-12 m-0 ${i === 0 ? "md:col-span-6" : "md:col-span-5 md:col-start-8 md:mt-[18svh]"}`}>
            <div data-part="media" data-open="bottom" className="relative aspect-[4/5] overflow-hidden">
              <div className="absolute inset-0">
                <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 768px) 46vw, 100vw" unoptimized={item.image.unoptimized} className="object-cover" />
              </div>
            </div>
            <figcaption data-part="detail" className="mt-6 md:mt-8">
              <Caption item={item} locale={locale} big />
            </figcaption>
          </figure>
        ))}
      </div>
      <Door shop={shop} className="mt-16 md:mt-24" />
    </section>
  );
}

export function ProductRow({ items, shop, locale = "en-GB", heading, variant = "shelf", tone = "ground", className = "" }: Props) {
  const v = resolveProductVariant(variant, items);
  const common = { shop, locale, heading, tone, className };
  if (v === "pair") return <Pair items={items} {...common} />;
  if (v === "index") return <Index items={items.slice(0, 6)} {...common} />;
  return <Shelf items={items.slice(0, 5)} {...common} />;
}
