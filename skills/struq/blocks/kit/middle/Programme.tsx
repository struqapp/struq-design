"use client";
// components/struq/kit/middle/Programme.tsx (Struq recipe)
// The shape of an event or an offer when the brief gave no programme: a two-day conference in Lisbon next May, a yoga
// studio's kinds of class, a charity's open day. Never speakers, sessions, times, ticket prices or seat counts the
// caller did not pass. Three variants, each extracted from a source:
//
// - "halves": the event's two days or parts as two columns; the first stands large on the left, the second arrives on
//   the right sentence by sentence. From the split variant of sections/manifesto, without its pin.
// - "ticket": the event's own ticket from its name, city and dates (only those given), beside the parts in ruled rows.
//   From kit/subject/Ticket and kit/quiet/Rows.
// - "rows": the parts as hairline rows, each with what it is for in one sentence. From kit/quiet/Rows.
//
// <Programme variant="ticket" event="Tide" city="Lisbon" when="Two days, next May" parts={[
//   { name: "Day one", text: "Talks in the morning, the harbour walk in the afternoon." },
//   { name: "Day two", text: "Workshops, then the long table by the river." },
// ]} door={{ label: "Join the list", href: "https://tide.example/list" }} />
//
// Props
// - event: the event's or the offer's name, as given.
// - parts: { name, text, time? }[], two to five (only the first five render). name: "Day one", "Morning", "Vinyasa".
//   text: one or two sentences the agent may write (what the part is for). time: only when the caller gives it,
//   printed as given.
// - city: optional, as given. when: optional, the brief's own words ("next May"), printed as given, never resolved to
//   a date. dates: optional ISO dates (2027-05-13), only from the caller; the ticket writes them in the locale.
// - door: optional { label, href }: the one way in, a Pressable after the parts.
// - locale: for the ticket's dates and fixed words (default "en-GB").
// - variant: "rows" (default), "halves" or "ticket".
// - tone: "ground" (default), "inverse" or "field" (scene-inverse, scene-field in blocks.css). className: on the root.
//
// Empty slots and fallbacks (code, not advice): "halves" with other than two parts renders "rows". No city, when or
// dates: the ticket carries the name alone and the heading has no label beside it. No time: no time column. No door:
// the scene ends on the parts, never a dead "Register" button. There is no slot for a speaker, a session, a price or
// a seat count. resolveProgrammeVariant() returns the variant that renders.
//
// Mounting: a page section of its own. The root carries data-scene="programme", data-variant (the rendered one),
// data-energy="1" and data-middle. No pin.
//
// Motion (kit/feel.ts, data-temperament on <body>): one timeline from one trigger (./entrance): the event name's lines
// rise, then the parts in order. halves: the left half rises, then the right one sentence after another (crisp brings
// them in clause by clause, slow holds each before the next). ticket: the ticket builds on its own with the scroll (its
// poster grid filling, the scene's one loud move), the rows rise beside it. rows: the rows rise one after another.
// Reduced motion: the composed scene, the ticket finished. Without scripts: composed.
//
// Phones: halves stack, the first half at h2; the ticket turns upright with its stub under the perforation, then the
// rows; rows put the sentence under the name.
import { useRef } from "react";
import { useGSAP } from "../gsap";
import { Pressable } from "../motion/Pressable";
import { LABEL, SHEET_GRID } from "../quiet/sheet";
import { Ticket } from "../subject/Ticket";
import { entrance } from "./entrance";
import { TONE_CLASS, type SceneTone } from "./ServicesList";

export type ProgrammePart = { name: string; text: string; time?: string };
export type ProgrammeVariant = "halves" | "ticket" | "rows";
export type ProgrammeDoor = { label: string; href: string };

type Props = {
  event: string;
  parts: ProgrammePart[];
  city?: string;
  when?: string;
  dates?: string[];
  door?: ProgrammeDoor;
  locale?: string;
  variant?: ProgrammeVariant;
  tone?: SceneTone;
  className?: string;
};

/** The variant that renders: halves is two parts exactly. */
export function resolveProgrammeVariant(variant: ProgrammeVariant, parts: readonly ProgrammePart[]): ProgrammeVariant {
  if (variant === "halves" && parts.length !== 2) return "rows";
  return variant;
}

/** A text cut into its sentences, so they can arrive one by one. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The line beside the event's name: the city and the brief's own when, as given. */
function placeLine(city?: string, when?: string) {
  return [city, when].filter(Boolean).join(", ");
}

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

function Head({ event, line, className = "" }: { event: string; line: string; className?: string }) {
  return (
    <div className={`items-baseline gap-y-6 ${SHEET_GRID} ${className}`}>
      <h2 data-part="heading" className="col-span-12 m-0 max-w-[16ch] font-display text-h2 md:col-span-8">
        {event}
      </h2>
      {line ? (
        <p data-part="detail" className={`col-span-8 md:col-span-3 md:col-start-10 ${LABEL}`}>
          {line}
        </p>
      ) : null}
    </div>
  );
}

function Door({ door, className = "" }: { door?: ProgrammeDoor; className?: string }) {
  if (!door) return null;
  return (
    <div data-part="detail" className={`px-sheet-margin ${className}`}>
      <Pressable href={door.href} press="fill" className="min-h-11 border border-ink px-7 py-3 text-small font-medium text-ink">
        {door.label}
      </Pressable>
    </div>
  );
}

/** The parts as ruled rows: name, the given time beside it when there is one, the sentence. */
function PartRows({ parts, wide }: { parts: ProgrammePart[]; wide: boolean }) {
  return (
    <ol className={`m-0 grid list-none border-b border-line p-0 ${wide ? "md:grid-cols-12 md:gap-x-sheet-gutter" : ""}`}>
      {parts.map((part) => (
        <li
          key={part.name}
          data-part="detail"
          className={`grid gap-y-2 border-t border-line py-6 md:py-8 ${wide ? "md:col-span-12 md:grid-cols-subgrid md:items-baseline" : ""}`}
        >
          <h3 className={`m-0 text-h3 ${wide ? "md:col-span-4" : ""}`}>
            {part.name}
            {part.time ? <span className="mt-1 block font-body text-small text-ink-muted">{part.time}</span> : null}
          </h3>
          <p className={`m-0 max-w-[48ch] text-body text-ink-muted ${wide ? "md:col-span-6 md:col-start-6" : ""}`}>{part.text}</p>
        </li>
      ))}
    </ol>
  );
}

type VariantProps = Omit<Props, "variant" | "tone" | "className" | "locale"> & { tone: SceneTone; className: string; locale: string };

function Halves({ event, parts, city, when, door, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "halves");
  const [first, second] = parts;
  return (
    <section ref={ref} data-scene="programme" data-variant="halves" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Head event={event} line={placeLine(city, when)} className="mb-14 md:mb-24" />
      <div className={`items-end gap-y-14 ${SHEET_GRID}`}>
        <div className="col-span-12 md:col-span-7">
          <h3 data-part="heading" className="m-0 font-display text-h2 md:text-[clamp(2.5rem,1rem_+_4vw,6rem)] md:leading-[1.02]">
            {first.name}
          </h3>
          {first.time ? <p data-part="detail" className={`mt-4 ${LABEL}`}>{first.time}</p> : null}
          <p data-part="detail" className="m-0 mt-6 max-w-[30ch] text-lead text-ink-muted md:mt-8">
            {first.text}
          </p>
        </div>
        <div className="col-span-12 grid gap-5 md:col-span-4 md:col-start-9">
          <h3 data-part="detail" className="m-0 font-display text-h3">
            {second.name}
            {second.time ? <span className="mt-1 block font-body text-small text-ink-muted">{second.time}</span> : null}
          </h3>
          {sentencesOf(second.text).map((s, i) => (
            <p key={i} data-part="detail" className="m-0 max-w-[34ch] font-display text-[clamp(1.25rem,0.95rem+0.9vw,2rem)] leading-[1.2] tracking-[-0.01em]">
              {s}
            </p>
          ))}
        </div>
      </div>
      <Door door={door} className="mt-16 md:mt-24" />
    </section>
  );
}

function TicketSide({ event, parts, city, when, dates, door, locale, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, "ticket");
  return (
    <section ref={ref} data-scene="programme" data-variant="ticket" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Head event={event} line={placeLine(city, when)} className="mb-14 md:mb-20" />
      <div className={`items-start gap-y-14 ${SHEET_GRID}`}>
        <div className="col-span-12 md:col-span-6">
          <Ticket event={event} city={city} dates={dates} locale={locale} />
        </div>
        <div className="col-span-12 md:col-span-5 md:col-start-8">
          <PartRows parts={parts} wide={false} />
        </div>
      </div>
      <Door door={door} className="mt-16 md:mt-24" />
    </section>
  );
}

function Rows({ event, parts, city, when, door, tone, className }: VariantProps) {
  const ref = useRef<HTMLElement>(null);
  useEntrance(ref, `rows:${parts.length}`);
  return (
    <section ref={ref} data-scene="programme" data-variant="rows" data-energy="1" data-middle="" className={`py-28 text-ink md:py-40 ${TONE_CLASS[tone]} ${className}`}>
      <Head event={event} line={placeLine(city, when)} className="mb-12 md:mb-16" />
      <div className="px-sheet-margin">
        <PartRows parts={parts} wide />
      </div>
      <Door door={door} className="mt-16 md:mt-24" />
    </section>
  );
}

export function Programme({ variant = "rows", tone = "ground", className = "", locale = "en-GB", parts, ...rest }: Props) {
  const shown = parts.slice(0, 5);
  const v = resolveProgrammeVariant(variant, shown);
  const common = { ...rest, parts: shown, tone, className, locale };
  if (v === "halves") return <Halves {...common} />;
  if (v === "ticket") return <TicketSide {...common} />;
  return <Rows {...common} />;
}
