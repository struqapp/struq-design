"use client";
// components/struq/kit/middle/PlaceHours.tsx (Struq recipe)
// Where to find the business and when, given real space instead of a footer line: the middle scene for a bakery, a
// restaurant, a guesthouse, the town a plumber serves. Three variants, each extracted from a source block:
//
// - "timetable": the city set large on the left, the ways in as ruled rows on the right like a timetable (address,
//   phone, then one row per run of opening hours), each only when given; with hours and a time zone a calm open marker
//   computed from the real local time sits over the rows. From footers/footer-contact (its ruled rows and open marker;
//   the hours logic is ./hours, shared with that footer).
// - "plate": a full-width photo of the street or the room opens out of the page margins to the edges, the place line
//   large under it and the given ways in beside it. From the plaat variant of sections/about-studio.
// - "line": type only: one sentence about the place at moment size, the city as its accent word, a small upright photo
//   hanging off the last line. From kit/quiet/Statement (rendered by it).
//
// <PlaceHours variant="timetable" city="Utrecht" area="Lombok, by the canal" line="Bread from four in the morning."
//   address={{ label: "Kanaalstraat 12", href: "https://maps.example/kanaalstraat-12" }}
//   phone={{ label: "030 123 45 67", href: "tel:+31301234567" }}
//   hours={[{ days: [2, 3, 4, 5, 6], from: "7:00", to: "17:00" }, { days: [7], from: "8:00", to: "13:00" }]}
//   timeZone="Europe/Amsterdam" />
// <PlaceHours variant="line" city="Utrecht" line="A family plumber for every street in Utrecht." image={images.column[0]} />
//
// Props
// - city: required, the town or city as the brief gives it.
// - line: required, one sentence about the place in the client's voice, naming the city (plate and line set it large
//   with the city as the accent word; timetable sets it under the city). A city alone read as a placeholder in the lab
//   (2026-11-15), and the sentence is copy the agent writes, never a fact it guesses.
// - area: optional, small, sentence case: the part of town, the street's character.
// - image: optional StruqImage: plate's wide photo (landscape works best), line's small upright photo.
// - address, phone: optional { label, href }; each a HoverLink door with a tap target of at least 44px.
// - hours: optional HoursRow[] ({ days: 1 Monday to 7 Sunday, from: "9:00", to: "18:00" }), printed as given.
// - timeZone: optional IANA zone. The open marker shows only with both hours and timeZone, and only after mount.
// - lang: "en" (default) or "nl": the words of the rows and the marker (labels, days, "Open now"). Times as given.
// - look: the site's one HoverLink look ("draw" default, "slide", "color").
// - variant: "line" (default), "timetable" or "plate". tone: "ground" (default), "inverse" or "field". className: root.
//
// Empty slots and fallbacks (code, not advice): no address, no phone and no hours, "timetable" renders "line"; no
// image, "plate" renders "line"; "line" without an image is the sentence alone, the city as its accent word. Every optional fact has no default:
// no hours means no hours rows, no marker and no "open daily"; a missing address is never a street, a postcode or a
// map pin; a missing phone is no row. resolvePlaceVariant() returns the variant that renders.
//
// Mounting: a page section of its own. The root carries data-scene="place", data-variant (the rendered one),
// data-energy="1" and data-middle.
//
// Motion (kit/feel.ts, data-temperament on <body>): one timeline from one trigger (./entrance): the city or the photo
// first, then the ways in one row at a time. The loud move is the plate opening out of the margins over
// dur("curtain") on the feel's curtain ease, the photo settling from the media scale: crisp is a hard curtain, slow a
// soft one, and slow lets the photo drift in its frame with the scroll after it settles. line moves as Statement does.
// Reduced motion: the composed scene. Without scripts: composed; the marker never renders on the server.
//
// Phones: the city wraps to two lines at most, then the photo, then the ways in as full-width rows, each a tap target
// of at least 44px.
import Image from "next/image";
import { useRef } from "react";
import { withAccent } from "../accent";
import { feel, prefersReduced } from "../feel";
import { gsap, useGSAP } from "../gsap";
import type { StruqImage } from "../images";
import { HoverLink } from "../motion/HoverLink";
import { Statement } from "../quiet/Statement";
import { LABEL, SHEET_GRID } from "../quiet/sheet";
import { entrance } from "./entrance";
import { hoursLines, openStatus, useNow, wallClock, type HoursLang, type HoursRow } from "./hours";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type PlaceDoor = { label: string; href: string };
export type PlaceVariant = "timetable" | "plate" | "line";

type Props = {
  city: string;
  line: string;
  area?: string;
  image?: StruqImage;
  address?: PlaceDoor;
  phone?: PlaceDoor;
  hours?: HoursRow[];
  timeZone?: string;
  lang?: HoursLang;
  look?: "draw" | "slide" | "color";
  variant?: PlaceVariant;
  tone?: SceneTone;
  className?: string;
};

const LABELS: Record<HoursLang, { address: string; phone: string }> = {
  en: { address: "Address", phone: "Phone" },
  nl: { address: "Adres", phone: "Telefoon" },
};

/** The variant that renders: timetable needs at least one way in, plate needs its photo. */
export function resolvePlaceVariant(variant: PlaceVariant, place: Pick<Props, "address" | "phone" | "hours" | "image">): PlaceVariant {
  const facts = Boolean(place.address || place.phone || place.hours?.length);
  if (variant === "timetable" && !facts) return "line";
  if (variant === "plate" && !place.image) return "line";
  return variant;
}

/** The open marker: a small ring, filled while open, and the words. Renders nothing until the time is known. */
function OpenMark({ hours, timeZone, lang }: { hours: HoursRow[]; timeZone: string; lang: HoursLang }) {
  const now = useNow(true);
  const status = now ? openStatus(hours, wallClock(now, timeZone), lang) : null;
  return (
    // The line keeps its height before the time is known, so the rows never move when the marker arrives.
    <p className="m-0 mb-4 min-h-[1lh] text-small text-ink-muted">
      {status?.text ? (
        <span data-open-mark="" className="inline-flex items-center gap-[0.6em]">
          <span aria-hidden data-open-dot="" data-open={status.open ? "" : undefined} />
          <span>{status.text}</span>
        </span>
      ) : null}
    </p>
  );
}

/** The ways in as ruled rows: address, phone, then each run of hours. Only what was given; nothing when nothing was. */
function Facts({ address, phone, hours, timeZone, lang, look, className = "" }: Pick<Props, "address" | "phone" | "hours" | "timeZone" | "look"> & { lang: HoursLang; className?: string }) {
  const lines = hours?.length ? hoursLines(hours, lang) : [];
  if (!address && !phone && !lines.length) return null;
  const row = "grid grid-cols-[6.5rem_1fr] items-baseline gap-x-6 border-t border-line py-2 md:grid-cols-[8rem_1fr]";
  const door = (d: PlaceDoor) => (
    <HoverLink href={d.href} look={look} className="inline-flex min-h-11 items-center text-ink">
      {d.label}
    </HoverLink>
  );
  return (
    <div className={className}>
      {hours?.length && timeZone ? <OpenMark hours={hours} timeZone={timeZone} lang={lang} /> : null}
      <dl className="m-0 border-b border-line text-body">
        {address ? (
          <div data-part="detail" className={row}>
            <dt className="text-small text-ink-muted">{LABELS[lang].address}</dt>
            <dd className="m-0 min-w-0">{door(address)}</dd>
          </div>
        ) : null}
        {phone ? (
          <div data-part="detail" className={row}>
            <dt className="text-small text-ink-muted">{LABELS[lang].phone}</dt>
            <dd className="m-0 min-w-0">{door(phone)}</dd>
          </div>
        ) : null}
        {lines.map((l) => (
          <div key={l.days} data-part="detail" className={row}>
            <dt className="text-small text-ink-muted">{l.days}</dt>
            <dd className="m-0 flex min-h-11 items-center">{l.time}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function useEntrance(ref: React.RefObject<HTMLElement | null>, key: string, drift = false) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const stop = entrance(el);
      const layer = el.querySelector<HTMLElement>("[data-drift]");
      // Slow only: once settled, the photo drifts in its frame with the scroll (its layer reaches past the frame).
      if (!drift || !layer || prefersReduced() || feel(el).name !== "slow") return stop;
      const f = feel(el);
      const tween = gsap.fromTo(
        layer,
        { yPercent: 4 },
        { yPercent: -4, ease: f.ease.scrub, scrollTrigger: { trigger: layer.parentElement, start: "top bottom", end: "bottom top", scrub: f.scrub.flow } },
      );
      return () => {
        stop();
        tween.scrollTrigger?.kill();
        tween.revert();
      };
    },
    { scope: ref, dependencies: [key] },
  );
}

function Timetable(props: Props & { tone: SceneTone; className: string; lang: HoursLang }) {
  const { city, area, line, tone, className, lang } = props;
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "timetable");
  return (
    <section ref={ref} data-scene="place" data-variant="timetable" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <div className={`items-start gap-y-12 ${SHEET_GRID}`}>
        <div className="col-span-12 md:col-span-7">
          <h2 data-part="heading" className="m-0 font-display text-display [overflow-wrap:break-word]">
            {city}
          </h2>
          {area ? (
            <p data-part="detail" className={`mt-6 ${LABEL}`}>
              {area}
            </p>
          ) : null}
          <p data-part="detail" className="m-0 mt-8 max-w-[34ch] text-lead text-ink-muted">
            {line}
          </p>
        </div>
        <Facts {...props} lang={lang} className="col-span-12 md:col-span-4 md:col-start-9 md:pt-[0.6rem]" />
      </div>
    </section>
  );
}

function Plate(props: Props & { image: StruqImage; tone: SceneTone; className: string; lang: HoursLang }) {
  const { city, area, line, image, tone, className, lang } = props;
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "plate", true);
  return (
    <section ref={ref} data-scene="place" data-variant="plate" data-energy="1" data-middle="" className={`pb-28 pt-16 text-ink md:pb-40 md:pt-24 ${TONE_CLASS[tone]} ${className}`}>
      <div data-part="media" data-open="margins" className="relative aspect-[4/3] w-full overflow-hidden md:aspect-[21/9]">
        {/* The photo sits on a layer larger than its frame, so its drift never shows an edge. */}
        <div data-drift="" className="absolute inset-x-0 -bottom-[10%] -top-[10%]">
          <Image src={image.src} alt={image.alt} fill sizes="100vw" unoptimized={image.unoptimized} className="object-cover" />
        </div>
      </div>
      <div className={`mt-12 items-start gap-y-10 md:mt-20 ${SHEET_GRID}`}>
        <h2 data-part="heading" className="col-span-12 m-0 max-w-[16ch] font-display text-display [overflow-wrap:break-word] md:col-span-7">
          {withAccent(line, city)}
        </h2>
        <div className="col-span-12 md:col-span-4 md:col-start-9 md:pt-[0.6rem]">
          <p data-part="detail" className={`mb-8 ${LABEL}`}>
            {area ? `${area}, ${city}` : city}
          </p>
          <Facts {...props} lang={lang} />
        </div>
      </div>
    </section>
  );
}

function Line(props: Props & { tone: SceneTone; className: string; lang: HoursLang }) {
  const { city, area, line, image, tone, className, lang } = props;
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "line");
  const facts = Boolean(props.address || props.phone || props.hours?.length);
  return (
    <section ref={ref} data-scene="place" data-variant="line" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Statement accent={city} label={area} image={image} className="py-0! md:py-0!">
        {line}
      </Statement>
      {facts ? (
        <div className={`mt-16 md:mt-24 ${SHEET_GRID}`}>
          <Facts {...props} lang={lang} className="col-span-12 md:col-span-5 md:col-start-8" />
        </div>
      ) : null}
    </section>
  );
}

export function PlaceHours({ variant = "line", tone = "ground", lang = "en", className = "", ...place }: Props) {
  const shown = resolvePlaceVariant(variant, place);
  const common = { ...place, tone, lang, className };
  if (shown === "timetable") return <Timetable {...common} />;
  if (shown === "plate" && place.image) return <Plate {...common} image={place.image} />;
  return <Line {...common} />;
}
