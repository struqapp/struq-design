// app/scenes/SitePage.tsx: the subject. One web page in a browser window, built in HTML with the site's tokens, the
// way Oostwerk's work reaches a visitor. Every page drawn with it is an example of the trade (an exhibition, a season,
// a collection, a launch), labelled as such where it is shown, never a client.
//
// It sizes everything by its own width (container query units), so the same page reads at the size of a window on
// the facade, a full screen in the stack, or a phone beside it. Each block of the page carries data-fill (the built
// block) inside data-wire (its drawn outline), so "Drawn, then built" can scrub the drawing into the page.
import Image from "next/image";
import type { CSSProperties } from "react";
import type { StruqImage } from "@/lib/struq-images";
import { images } from "@/lib/struq-images";
import { COLLECTION, Painting } from "./Paintings";

export type PageTone = "oat" | "ink" | "amber" | "clay";
export type PageLayout = "poster" | "grid" | "list" | "product";

/** The sketch the page starts from (Drawn): a note per block, the first headline struck through. */
export type Sketch = { first: string; notes: readonly string[] };

type Props = {
  site: string;
  /** The page's path, in the address field of the top bar. */
  path?: string;
  /** The photo of a poster page, instead of the default. */
  image?: StruqImage;
  sketch?: Sketch;
  nav: string[];
  title: string;
  sub: string;
  cta?: string;
  tone: PageTone;
  layout: PageLayout;
  frame?: "window" | "phone";
  className?: string;
  /** Loads the page's images first (the one on screen at load). */
  priority?: boolean;
  /** A sheet of the scene's paper over the page's ground, hidden until a scene's script shows it (Drawn). */
  paper?: boolean;
};

/** The pack's photos, with alt text in the site's language, as the images inside the example pages. */
const en = (img: StruqImage, alt: string): StruqImage => ({ ...img, alt });
export const PAGE_IMAGES = {
  exhibition: en(images.card[3], "An etching plate with wet black ink on proof paper"),
  print: en(images.detail[0], "A deep black ink field pressed into soft paper"),
  books: en(images.band[0], "A shelf of linen-bound books with blank spines"),
  tiles: [
    en(images.detail[1], "The deckled edge of handmade cotton paper"),
    en(images.card[1], "A proof sheet of halftone dots and registration marks"),
    en(images.detail[2], "Sand-coloured bookbinding linen, close up"),
    en(images.card[2], "Black ink bars and grey washes on handmade paper"),
    en(images.detail[3], "Dense graphite on heavy drawing paper"),
    en(images.card[0], "A fan of colour swatches in ivory, sandstone and muted blue"),
  ],
};

// Fixed tokens only (inverse, on-inverse, the two accents), never the surfaces or the ink, which turn inside an
// inverse scene: an example page keeps its own colours wherever it is shown.
const NIGHT = "var(--inverse)";
const DAY = "var(--on-inverse)";
const tone = (bg: string, fg: string, key: string, onKey: string, line: string): CSSProperties => ({
  background: bg,
  color: fg,
  ["--pg-key" as string]: key,
  ["--pg-on-key" as string]: onKey,
  ["--pg-line" as string]: `color-mix(in oklab, ${line} 22%, transparent)`,
});
const TONES: Record<PageTone, CSSProperties> = {
  oat: tone(DAY, NIGHT, "var(--accent)", DAY, NIGHT),
  ink: tone(`color-mix(in oklab, ${NIGHT}, ${DAY} 7%)`, DAY, "var(--accent-2)", NIGHT, DAY),
  amber: tone("var(--accent-2)", NIGHT, NIGHT, "var(--accent-2)", NIGHT),
  clay: tone("var(--accent)", DAY, DAY, "var(--accent)", DAY),
};

/**
 * A block of the page: its drawn outline (data-wire) around the built block (data-fill). With a sketch, the drawing
 * also carries a pencil note (data-sketch), a cross through an image slot, or the first headline struck through; all
 * hidden until a scene's script shows them, so the built page stands alone everywhere else.
 */
function Block({
  className = "",
  inner = "",
  children,
  style,
  note,
  cross,
  struck,
}: {
  className?: string;
  inner?: string;
  children: React.ReactNode;
  style?: CSSProperties;
  note?: string;
  cross?: boolean;
  struck?: string;
}) {
  return (
    <div data-wire="" className={`relative ${className}`} style={style}>
      <span data-wire-line="" aria-hidden className="pointer-events-none absolute inset-0 border border-[var(--wire,var(--pg-line))] opacity-0" />
      {cross ? (
        <svg data-sketch="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-0" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0 0L100 100M100 0L0 100" stroke="var(--sketch-ink)" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
        </svg>
      ) : null}
      {struck ? (
        <span data-sketch="" aria-hidden className="pointer-events-none absolute left-0 top-0 inline-block font-display text-[8cqw] leading-[1] text-[var(--sketch-ink)] opacity-0 @[40rem]:text-[3.8cqw]">
          {struck}
          {/* The pencil stroke through the first headline: drawn, a little off true. */}
          <svg className="absolute -inset-x-[4%] top-[48%] h-[0.3em] w-[108%] overflow-visible" viewBox="0 0 100 10" preserveAspectRatio="none">
            <path d="M0 7 C 30 4, 60 6, 100 2" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" fill="none" />
          </svg>
        </span>
      ) : null}
      {note ? (
        <span data-sketch="" aria-hidden className="pointer-events-none absolute bottom-[0.4cqw] right-[1cqw] hidden font-accent text-[max(11px,1.3cqw)] italic leading-none text-[var(--sketch-ink)] opacity-0 @[30rem]:block">
          {note}
        </span>
      ) : null}
      <div data-fill="" className={`relative h-full ${inner}`}>
        {children}
      </div>
    </div>
  );
}

function Photo({ img, sizes, priority }: { img: StruqImage; sizes: string; priority?: boolean }) {
  return <Image src={img.src} alt={img.alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}

export function SitePage({ site, nav, title, sub, cta, tone, layout, frame = "window", className = "", priority, paper, path, image, sketch }: Props) {
  const phone = frame === "phone";
  const sizes = phone ? "(min-width: 768px) 20vw, 60vw" : "(min-width: 768px) 70vw, 100vw";
  return (
    <div
      data-site-page={layout}
      className={`@container relative flex flex-col overflow-hidden border border-[var(--pg-line)] ${className}`}
      style={{ ...TONES[tone], ["--sketch-ink" as string]: "var(--ink)", ...(paper ? { ["--wire" as string]: "var(--ink)" } : {}) }}
    >
      {paper ? <span data-paper="" aria-hidden className="absolute inset-0 bg-surface-0 opacity-0" /> : null}
      {/* The browser's own top bar: a hairline field for the address, nothing borrowed from an OS. */}
      <div data-chrome="" className="relative flex shrink-0 items-center border-b border-[var(--pg-line)] px-[3cqw] py-[1.4cqw]">
        <span
          aria-hidden
          className={`flex h-[2.6cqw] min-h-2.5 items-center border border-[var(--pg-line)] px-[1cqw] text-[max(7px,1cqw)] leading-none ${phone ? "mx-auto w-[56cqw] justify-center text-[max(7px,3cqw)]" : "w-[32cqw]"}`}
        >
          {path ? <span data-fill="">{path}</span> : null}
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col gap-[3cqw] p-[4cqw]">
        <Block className="shrink-0" inner="flex items-baseline justify-between gap-[3cqw]" note={sketch?.notes[0]}>
          <span className="font-display text-[max(10px,4.2cqw)] leading-none tracking-[-0.02em] @[40rem]:text-[2.4cqw]">{site}</span>
          <span className="hidden gap-[2.4cqw] text-[max(9px,1.25cqw)] @[30rem]:flex">
            {nav.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
          <span aria-hidden className="flex flex-col gap-[0.8cqw] @[30rem]:hidden">
            <span className="block h-px w-[5cqw] bg-current" />
            <span className="block h-px w-[5cqw] bg-current" />
          </span>
        </Block>

        {layout === "poster" ? (
          <div className="grid min-h-0 flex-1 gap-[3cqw] @[40rem]:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col justify-end gap-[2.4cqw]">
              <Block struck={sketch?.first}>
                <p className="font-display text-[11cqw] leading-[0.95] tracking-[-0.035em] @[40rem]:text-[6.4cqw]">{title}</p>
              </Block>
              <Block note={sketch?.notes[1]}>
                <p className="text-[max(10px,3.6cqw)] leading-snug @[40rem]:text-[1.5cqw]">{sub}</p>
              </Block>
              {cta ? (
                <Block className="self-start" note={sketch?.notes[2]}>
                  <span className="inline-block bg-[var(--pg-key)] px-[3cqw] py-[1.6cqw] text-[max(9px,3.2cqw)] text-[var(--pg-on-key)] @[40rem]:px-[1.6cqw] @[40rem]:py-[0.9cqw] @[40rem]:text-[1.2cqw]">
                    {cta}
                  </span>
                </Block>
              ) : null}
            </div>
            <Block className="relative min-h-[40cqw] @[40rem]:min-h-0" cross={Boolean(sketch)} note={sketch?.notes[3]}>
              {image ? <Photo img={image} sizes={sizes} priority={priority} /> : <Painting kind="sea" label="A painting of a calm sea off the northern coast, a sailing boat on the horizon" />}
            </Block>
          </div>
        ) : null}

        {layout === "list" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-[2.4cqw]">
            <Block>
              <p className="font-display text-[10cqw] leading-[0.95] tracking-[-0.035em] @[40rem]:text-[5.6cqw]">{title}</p>
            </Block>
            <Block>
              <p className="text-[max(10px,3.4cqw)] @[40rem]:text-[1.4cqw]">{sub}</p>
            </Block>
            <div className="mt-auto flex flex-col">
              {["Drama", "Dance", "Music", "Opera"].map((g) => (
                <Block key={g} className="border-t border-[var(--pg-line)]" inner="flex items-baseline justify-between py-[1.6cqw]">
                  <span className="font-display text-[6cqw] leading-none @[40rem]:text-[3.2cqw]">{g}</span>
                  <span className="text-[max(9px,2.8cqw)] @[40rem]:text-[1.2cqw]">Tickets</span>
                </Block>
              ))}
            </div>
          </div>
        ) : null}

        {layout === "grid" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-[2.4cqw]">
            <div className="flex flex-col gap-[1cqw] @[40rem]:flex-row @[40rem]:items-end @[40rem]:justify-between">
              <Block>
                <p className="font-display text-[9cqw] leading-[0.95] tracking-[-0.035em] @[40rem]:text-[5cqw]">{title}</p>
              </Block>
              <Block>
                <p className="text-[max(10px,3.2cqw)] @[40rem]:text-[1.4cqw]">{sub}</p>
              </Block>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-[2cqw] @[40rem]:grid-cols-3">
              {COLLECTION.map((w, i) => (
                <Block key={w.title} className={`min-h-[22cqw] @[40rem]:min-h-0 ${i > 3 ? "hidden @[40rem]:block" : ""}`} inner="flex h-full flex-col gap-[0.8cqw]">
                  <span className="relative block min-h-0 flex-1">
                    <Painting kind={w.kind} label={w.title} />
                  </span>
                  <span className="hidden text-[1.1cqw] leading-tight @[40rem]:block">{w.title}</span>
                </Block>
              ))}
            </div>
          </div>
        ) : null}

        {layout === "product" ? (
          <div className="grid min-h-0 flex-1 gap-[3cqw] @[40rem]:grid-cols-[1fr_1fr]">
            <Block className="relative min-h-[50cqw] @[40rem]:min-h-0">
              <Photo img={PAGE_IMAGES.print} sizes={sizes} />
            </Block>
            <div className="flex flex-col justify-center gap-[2.4cqw]">
              <Block>
                <p className="font-display text-[10cqw] leading-[0.95] tracking-[-0.035em] @[40rem]:text-[5.6cqw]">{title}</p>
              </Block>
              <Block>
                <p className="text-[max(10px,3.4cqw)] @[40rem]:text-[1.4cqw]">{sub}</p>
              </Block>
              <Block className="self-start">
                <span className="inline-block bg-[var(--pg-key)] px-[3cqw] py-[1.6cqw] text-[max(9px,3.2cqw)] text-[var(--pg-on-key)] @[40rem]:px-[1.6cqw] @[40rem]:py-[0.9cqw] @[40rem]:text-[1.2cqw]">
                  Order
                </span>
              </Block>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
