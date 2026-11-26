"use client";
// components/struq/kit/quiet/Close.tsx (Struq recipe)
// The page's last scene before the footer, built from the motion primitives (../motion) and timed by the site's
// temperament. Four shapes; none of them is the site's name at full width, which is never a close.
//
// - "idea": the idea's last line rises out of its masks (RevealText), a ScrubLine draws the motif's line under it as
//   the reader arrives, and the doors sit below. For a site whose last word is the idea itself.
// - "echo": the opening comes back smaller. Its first line wipes in (MaskWipe) or its photo is uncovered
//   (ImageCurtain), at a fraction of its first size, with the doors beside or under it. For a film that ends where it
//   began.
// - "door": the brief gave real ways in (an address, a phone number, an email, a booking or shop URL) and they are the
//   close: set large, each a HoverLink (or a Pressable for a booking or a shop), with the idea in one line above. For
//   a place people visit, call or book.
// - "order": what the client sells or takes on, and the one way to get it, as the page's last scene. For any site that
//   sells or takes enquiries: a studio's pendants, a builder's renovation, an agency's engagement, a restaurant's
//   tasting menu. The idea turned to the offer in one line at display scale; the items as plates with their images
//   in a loose grid, or as a large index on hairlines when no item has an image, prices on the name's baseline; beside
//   them on a wide screen and under them on a phone the door: filled, large (64px and up), full width in its column,
//   an arrow that travels on hover, marked data-door; the other doors as HoverLinks and the note under a hairline.
//
// <Close shape="idea" line="Grown slowly, poured by hand." accent="slowly" motif={{ path: "M2 40 C 120 0, 240 80, 398 30", viewBox: "0 0 400 80" }}
//   doors={[{ kind: "email", href: "mailto:hello@kiln.studio", label: "hello@kiln.studio" }]} />
// <Close shape="echo" echo={{ media: <img src="/hero.jpg" alt="The kiln at dawn" className="h-full w-full object-cover" /> }} line="Back to the kiln." />
// <Close shape="door" line="Bread from four in the morning." doors={[
//   { kind: "address", href: "https://maps.app.goo.gl/...", label: "Oudegracht 12, Utrecht" },
//   { kind: "phone", href: "tel:+31301234567", label: "030 123 45 67" },
//   { kind: "booking", href: "https://book.example/table", label: "Book a table" },
// ]} credit="Bakkerij Oud, since 1962" />
// <Close shape="order" locale="nb-NO" line="Hver lampe blåses når du bestiller den." items={[
//   { name: "Dråpe", text: "Smal og høy, over kjøkkenøya.", price: { amount: 6400, currency: "NOK" } },
//   { name: "Klode", text: "Rund, over spisebordet." },
// ]} doors={[site.door]} note="Laget på bestilling, seks uker." />
//
// Props
// - shape: "idea" (default), "echo", "door" or "order".
// - line: the idea's line, plain text. idea: the line itself (short, two or three lines at h2). door: one line above
//   the doors. echo: optional, a short lead beside the echo.
// - accent: the site's one accent word, again: set in the pairing's italic accent face where it first stands in line
//   or echo.line (../accent). A word the line does not hold changes nothing.
// - echo (shape "echo"): { line?: string; media?: ReactNode; reveal?: "wipe" | "curtain"; className?: string }. line is
//   the opening's first line, set at h2 (not the opening's poster size); media is the opening's photo (an img, a
//   next/image with fill), shown at about half the page's width, sized by className (default aspect-[4/3]). reveal:
//   "curtain" (default for media) or "wipe" (always for a line).
// - motif (shape "idea"): { path?: string; viewBox?: string }, the ScrubLine under the line. A path echoes a drawn
//   motif; without one it is a straight rule.
// - doors: the ways in, from the brief: { label, href?, kind?, placeholder? } with kind "address" | "phone" | "email" |
//   "booking" | "shop" | "quote" | "link". With an href a door is a HoverLink, or a Pressable when it is a booking, a
//   shop or a quote; an address without an href is plain text. placeholder: true marks the door the skill sets in
//   lib/site.ts when the brief gave none (mailto:post@example.com): it renders as any door, so the page reads
//   finished, carries data-door-placeholder, and check.mjs warns until the client replaces it.
// - items (shape "order"): { name, price?, text?, image? }[], two to six, products or services. name: the brief's own
//   word for the thing. price: { amount, currency, from? } only when the brief gives it, written through
//   Intl.NumberFormat in locale; from: true sets the locale's "from" word before it (fra, vanaf, from). text: one
//   short line. image: a StruqImage, an upright 4:5 plate; give every item one or none (an item without one in a set
//   with images keeps an empty hairline frame).
// - note (shape "order"): one small line under the door from the brief only: lead time, made to order, area served.
// - subject (shape "order"): the subject of an email door; default the item names, so a mail order names the items.
// - locale (shape "order"): for the prices and the "from" word (default "en-GB").
// - credit: a small line at the foot (credit, legal, year). wordmark: the name at text size in the foot, if at all.
// - look: the HoverLink look, the site's one ("draw" default, "slide", "color").
// - className: on the root, for example "scene-inverse" or "scene-field".
//
// Mounting: the last section before the footer. The root carries data-scene="close", data-energy="1" and
// data-close-shape. Motion: it enters once, from the primitives: RevealText on the line, ScrubLine scrubbed under it,
// MaskWipe or ImageCurtain on the echo; order: the line through RevealText, the item rows rising one after another
// (Rise each), the door rising last; doors answer hover and press by the feel. No pin. Reduced motion, no scripts
// or the server render: every primitive shows its final state. Phones: one column, the doors stacked; an order row
// keeps the name and the price on one line with the text under them, and the order door spans the screen.
import Image from "next/image";
import type { ReactNode } from "react";
import { withAccent } from "../accent";
import type { StruqImage } from "../images";
import { HoverLink } from "../motion/HoverLink";
import { ImageCurtain } from "../motion/ImageCurtain";
import { MaskWipe } from "../motion/MaskWipe";
import { Pressable } from "../motion/Pressable";
import { RevealText } from "../motion/RevealText";
import { Rise } from "../motion/Rise";
import { ScrubLine } from "../motion/ScrubLine";
import { LABEL, SCENE_SPACE, SHEET_GRID } from "./sheet";

export type CloseShape = "idea" | "echo" | "door" | "order";

export type Door = {
  label: string;
  href?: string;
  kind?: "address" | "phone" | "email" | "booking" | "shop" | "quote" | "link";
  /** The skill's placeholder door (the brief gave none): rendered as any door, marked data-door-placeholder. */
  placeholder?: boolean;
};

export type OrderPrice = { amount: number; currency: string; from?: boolean };
export type OrderItem = { name: string; price?: OrderPrice; text?: string; image?: StruqImage };

const FROM_WORD: Record<string, string> = { nb: "fra", nn: "fra", no: "fra", da: "fra", sv: "från", nl: "vanaf", de: "ab", fr: "à partir de", es: "desde", it: "da", en: "from" };

/** A price as the locale writes it, with the locale's "from" word before it when the price is a starting price. */
export function orderPriceText(price: OrderPrice, locale = "en-GB") {
  const { word, amount } = priceParts(price, locale);
  return word ? `${word} ${amount}` : amount;
}

function priceParts(price: OrderPrice, locale: string) {
  const amount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: Number.isInteger(price.amount) ? 0 : 2,
  }).format(price.amount);
  const word = price.from ? (FROM_WORD[locale.toLowerCase().split("-")[0]] ?? FROM_WORD.en) : "";
  return { word, amount };
}

/** The price in its row: the "from" word quieter than the amount, the amount kept on one line. */
function PriceText({ price, locale }: { price: OrderPrice; locale: string }) {
  const { word, amount } = priceParts(price, locale);
  return (
    <>
      {word ? <span className="text-small text-ink-muted md:text-body">{word} </span> : null}
      <span className="whitespace-nowrap">{amount}</span>
    </>
  );
}

/** An email door's href with a subject naming the items, unless it already carries one. */
function withSubject(href: string, subject?: string) {
  if (!subject || !href.startsWith("mailto:") || /[?&]subject=/i.test(href)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}subject=${encodeURIComponent(subject)}`;
}

const PRESSED = new Set<Door["kind"]>(["booking", "shop", "quote"]);

type Props = {
  shape?: CloseShape;
  line?: string;
  accent?: string;
  echo?: { line?: string; media?: ReactNode; reveal?: "wipe" | "curtain"; className?: string };
  motif?: { path?: string; viewBox?: string };
  doors?: readonly Door[];
  items?: readonly OrderItem[];
  note?: string;
  subject?: string;
  locale?: string;
  credit?: string;
  wordmark?: string;
  look?: "draw" | "slide" | "color";
  className?: string;
};

/** The marker on a placeholder door's element. */
const mark = (door: Door) => (door.placeholder ? { "data-door-placeholder": "" } : {});

/** One door: a Pressable for a booking, a shop or a quote, a HoverLink for any other link, plain text without an href. */
function DoorItem({ door, size, look }: { door: Door; size: "large" | "small"; look: Props["look"] }) {
  const type = size === "large" ? "font-display text-h2" : "font-body text-h3 font-medium";
  if (!door.href) return <p {...mark(door)} className={`m-0 text-ink ${type}`}>{door.label}</p>;
  if (PRESSED.has(door.kind)) {
    return (
      <Pressable
        {...mark(door)}
        href={door.href}
        press="fill"
        className={`w-fit px-8 py-4 text-ink shadow-[inset_0_0_0_1px_var(--line)] ${size === "large" ? "font-body text-h3 font-medium" : "font-body text-lead font-medium"}`}
      >
        {door.label}
      </Pressable>
    );
  }
  return (
    <HoverLink {...mark(door)} href={door.href} look={look} className={`w-fit text-ink ${type}`}>
      {door.label}
    </HoverLink>
  );
}

function Doors({ doors, size, look, className = "" }: { doors?: readonly Door[]; size: "large" | "small"; look: Props["look"]; className?: string }) {
  if (!doors || doors.length === 0) return null;
  return (
    <ul className={`m-0 flex list-none flex-col items-start p-0 ${size === "large" ? "gap-6 md:gap-8" : "gap-4"} ${className}`}>
      {doors.map((door) => (
        <li key={`${door.kind ?? "link"}:${door.label}`}>
          <DoorItem door={door} size={size} look={look} />
        </li>
      ))}
    </ul>
  );
}

/** The arrow in the primary door: it travels a little on hover, the one movement the door makes besides its press. */
function DoorArrow() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[1.1em] w-[1.1em] shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5">
      <path d="M3 12h17M14 5.5 20.5 12 14 18.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    </svg>
  );
}

/** The columns for the plates: one for one item, two for two or four, three for three, five or six on a wide screen. */
const plateCols = (n: number) => (n <= 1 ? "grid-cols-1" : n === 2 || n === 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3");

/** One item with its image: the plate, then the name and the price on one baseline, the line under them. */
function Plate({ item, locale, offset }: { item: OrderItem; locale: string; offset: boolean }) {
  return (
    <li data-order-item="" className={`m-0 flex flex-col ${offset ? "sm:mt-[min(14vh,8rem)]" : ""}`}>
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        {item.image ? (
          <Image src={item.image.src} alt={item.image.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" unoptimized={item.image.unoptimized} className="object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 shadow-[inset_0_0_0_1px_var(--line)]" />
        )}
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-6 md:mt-6">
        <h3 className="m-0 font-display text-[clamp(1.625rem,1.1rem+1.4vw,2.5rem)] leading-[1.05] tracking-[-0.015em] text-ink">{item.name}</h3>
        {item.price ? (
          <p className="m-0 shrink-0 font-body text-lead tabular-nums text-ink">
            <PriceText price={item.price} locale={locale} />
          </p>
        ) : null}
      </div>
      {item.text ? <p className="m-0 mt-2 max-w-[38ch] font-body text-body text-ink-muted">{item.text}</p> : null}
    </li>
  );
}

/** One item without an image: a row of the index, the name large, the line beside it, the price on the right edge. */
function IndexRow({ item, locale }: { item: OrderItem; locale: string }) {
  return (
    <li data-order-item="" className="m-0 grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-2 border-b border-line py-7 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_auto] md:py-10">
      <h3 className="m-0 font-display text-[clamp(2rem,1.2rem+2.6vw,3.75rem)] leading-[1] tracking-[-0.02em] text-ink">{item.name}</h3>
      <p className="m-0 justify-self-end whitespace-nowrap font-body text-lead tabular-nums text-ink md:order-last">
        {item.price ? <PriceText price={item.price} locale={locale} /> : null}
      </p>
      {item.text ? (
        <p className="col-span-2 m-0 max-w-[38ch] font-body text-body text-ink-muted md:col-span-1">{item.text}</p>
      ) : (
        <span aria-hidden className="hidden md:block" />
      )}
    </li>
  );
}

/**
 * The order shape: the items, then the door. With images the items are plates in a loose grid (every second one set
 * lower on a wide screen); without, a large index on hairlines. Beside them on a wide screen, under them on a phone,
 * the door: filled, large, full width in its column, the arrow travelling on hover; the other doors as HoverLinks and
 * the note under it.
 */
function Order({
  items = [],
  doors,
  note,
  subject,
  locale,
  look,
}: {
  items?: readonly OrderItem[];
  doors?: readonly Door[];
  note?: string;
  subject?: string;
  locale: string;
  look: Props["look"];
}) {
  const shown = items.slice(0, 6);
  const plates = shown.some((item) => item.image);
  const primary = doors?.find((door) => door.href);
  const rest = (doors ?? []).filter((door) => door !== primary);
  const mailSubject = subject ?? shown.map((item) => item.name).join(", ");
  const twoUp = shown.length === 2 || shown.length === 4;
  return (
    <>
      {shown.length ? (
        plates ? (
          <Rise as="ul" each className={`col-span-12 m-0 grid list-none gap-x-sheet-gutter gap-y-14 p-0 md:col-span-8 md:gap-y-20 ${plateCols(shown.length)}`}>
            {shown.map((item, i) => (
              <Plate key={item.name} item={item} locale={locale} offset={twoUp && i % 2 === 1} />
            ))}
          </Rise>
        ) : (
          <Rise as="ul" each className="col-span-12 m-0 list-none border-t border-line p-0 md:col-span-8">
            {shown.map((item) => (
              <IndexRow key={item.name} item={item} locale={locale} />
            ))}
          </Rise>
        )
      ) : null}
      <Rise className={`col-span-12 flex flex-col gap-8 md:sticky md:top-28 md:self-start ${shown.length ? "md:col-span-4 md:col-start-9" : "md:col-span-6"}`}>
        {primary?.href ? (
          <Pressable
            {...mark(primary)}
            data-door=""
            href={primary.kind === "email" || primary.href.startsWith("mailto:") ? withSubject(primary.href, mailSubject) : primary.href}
            press="sink"
            className="group min-h-16 w-full gap-6 bg-ink px-7 py-5 font-body text-lead font-medium text-surface-0 transition-colors duration-500 hover:bg-accent hover:text-accent-ink md:min-h-20 md:px-8 md:py-6 [&>[data-press-label]]:flex [&>[data-press-label]]:w-full [&>[data-press-label]]:items-center [&>[data-press-label]]:justify-between [&>[data-press-label]]:gap-6"
          >
            <span>{primary.label}</span>
            <DoorArrow />
          </Pressable>
        ) : null}
        {rest.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rest.map((door) => (
              <li key={`${door.kind ?? "link"}:${door.label}`}>
                {door.href ? (
                  <HoverLink {...mark(door)} href={door.href} look={look} className="inline-flex min-h-11 items-center font-body text-lead text-ink">
                    {door.label}
                  </HoverLink>
                ) : (
                  <p {...mark(door)} className="m-0 font-body text-lead text-ink">{door.label}</p>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {note ? <p className="m-0 max-w-[34ch] border-t border-line pt-6 font-body text-body text-ink-muted">{note}</p> : null}
      </Rise>
    </>
  );
}

function Foot({ credit, wordmark }: { credit?: string; wordmark?: string }) {
  if (!credit && !wordmark) return null;
  return (
    <div className="col-span-12 flex flex-col gap-1 border-t border-line pt-5 md:flex-row md:items-baseline md:justify-between">
      {wordmark ? <p className="m-0 font-body text-body font-medium text-ink">{wordmark}</p> : null}
      {credit ? <p className={LABEL}>{credit}</p> : null}
    </div>
  );
}

export function Close({
  shape = "idea",
  line,
  accent,
  echo,
  motif,
  doors,
  items,
  note,
  subject,
  locale = "en-GB",
  credit,
  wordmark,
  look = "draw",
  className = "",
}: Props) {
  return (
    <section data-scene="close" data-energy="1" data-close-shape={shape} className={`text-ink ${SCENE_SPACE} ${className}`}>
      <div className={`items-start gap-y-12 md:gap-y-20 ${SHEET_GRID}`}>
        {shape === "idea" ? (
          <>
            {line ? (
              <RevealText as="h2" by="lines" className="col-span-12 m-0 max-w-[20ch] font-display text-h2 md:col-span-9">
                {withAccent(line, accent)}
              </RevealText>
            ) : null}
            <div className="col-span-12 text-accent">
              {motif?.path ? (
                <ScrubLine path={motif.path} viewBox={motif.viewBox ?? "0 0 400 80"} className="h-16 w-full md:h-24" />
              ) : (
                <ScrubLine />
              )}
            </div>
            <Doors doors={doors} size="small" look={look} className="col-span-12 md:col-span-6 md:col-start-7" />
          </>
        ) : null}

        {shape === "echo" ? (
          <>
            {echo?.media ? (
              (echo.reveal ?? "curtain") === "curtain" ? (
                <ImageCurtain className={`col-span-12 md:col-span-6 ${echo.className ?? "aspect-[4/3]"}`}>{echo.media}</ImageCurtain>
              ) : (
                <MaskWipe from="left" settle className={`relative col-span-12 overflow-hidden md:col-span-6 ${echo.className ?? "aspect-[4/3]"}`}>
                  {echo.media}
                </MaskWipe>
              )
            ) : null}
            {echo?.line ? (
              <MaskWipe from="left" className={`col-span-12 ${echo.media ? "md:col-span-6" : "md:col-span-9"}`}>
                <p className="m-0 max-w-[20ch] font-display text-h2">{withAccent(echo.line, accent)}</p>
              </MaskWipe>
            ) : null}
            <div className={`col-span-12 flex flex-col gap-8 ${echo?.media && !echo.line ? "md:col-span-5 md:col-start-8 md:self-end" : "md:col-span-6 md:col-start-7"}`}>
              {line ? (
                <RevealText as="p" by="lines" className="m-0 max-w-[32ch] font-body text-lead text-ink-muted">
                  {withAccent(line, accent)}
                </RevealText>
              ) : null}
              <Doors doors={doors} size="small" look={look} />
            </div>
          </>
        ) : null}

        {shape === "door" ? (
          <>
            {line ? (
              <RevealText as="p" by="lines" className="col-span-12 m-0 max-w-[40ch] font-body text-lead text-ink-muted md:col-span-8">
                {withAccent(line, accent)}
              </RevealText>
            ) : null}
            <Doors doors={doors} size="large" look={look} className="col-span-12" />
          </>
        ) : null}

        {shape === "order" ? (
          <>
            {line ? (
              // Display scale, a step under poster size (look's display moments start at 72px and 7vw), so the close is
              // the page's last big line without counting against the scale ladder.
              <RevealText as="h2" by="lines" className="col-span-12 m-0 max-w-[16ch] pb-[0.08em] font-display text-[clamp(2.75rem,1.2rem+5.2vw,6rem)] leading-[1] tracking-[-0.025em] md:col-span-10 md:mb-6">
                {withAccent(line, accent)}
              </RevealText>
            ) : null}
            <Order items={items} doors={doors} note={note} subject={subject} locale={locale} look={look} />
          </>
        ) : null}

        <Foot credit={credit} wordmark={wordmark} />
      </div>
    </section>
  );
}
