"use client";
// components/struq/kit/subject/Ticket.tsx (Struq recipe)
// Event and print collateral: a ticket with its stub and perforation, a lanyard badge, or a type-only poster on a
// strong grid. Filled from the event's own name, city, venue and dates, and only those the caller passes: nothing is
// invented. Behind the ticket and badge stands a typographic poster grid whose pattern is drawn from the letters of
// the event's name, so every event gets its own pattern and the same one on every render.
//
// <Ticket event="Dutch Design Week" city="Eindhoven" venue="Klokgebouw" dates={["2026-10-17", "2026-10-25"]}
//   holder={{ name: "Sanne Visser", role: "Bezoeker" }} serial="0042" tier="Weekpas" locale="nl-NL" />
//
// Props
// - event: the event's name, set large; its letters make the pattern unless `pattern` gives others.
// - kind: "ticket" (default), "badge" or "poster".
// - city, venue, time ("Doors 19:30"), edition ("12th edition"), tier ("Day pass", "Speaker"): each only when the
//   caller has it. serial: the ticket's own number, on the stub in tabular figures.
// - dates: ISO dates (2026-10-17). One date, or the first and last of a run; written in the locale. Never guessed.
// - holder: { name, role?, org? }: the person a ticket admits or a badge names.
// - stock: "field" (default) the palette's loud colour, "paper" the palette's light colour, "ink" its dark one.
// - pattern: optional letters for the pattern instead of the event's own.
// - labels: { admit?, serial? }: the two fixed words ("Admit", "No."); English or Dutch by locale otherwise.
// - locale (default "en-GB"), caption (a line under it, in the scene's ink), build ("scroll" default, or "static").
// - className: on the figure.
//
// Mounting: inside any section. A ticket wants six or more of twelve columns on a wide screen and turns upright on a
// phone, its stub under a perforation across; a badge or a poster wants four. The root is a <figure
// data-subject="ticket">.
//
// Motion: tied to the scroll and quiet. The poster grid's cells fill in a seeded order as the piece comes up, the
// ticket rises a little and settles to its slight tilt. Reduced motion, build="static" or no scripts: the finished
// piece.
import { useRef, type CSSProperties } from "react";
import { useScrollBuild } from "./build";
import { dateParts, FIGURES, languageOf, lettersOf, seed } from "./format";

type Holder = { name: string; role?: string; org?: string };

type Props = {
  event: string;
  kind?: "ticket" | "badge" | "poster";
  city?: string;
  venue?: string;
  dates?: string[];
  time?: string;
  edition?: string;
  tier?: string;
  serial?: string;
  holder?: Holder;
  stock?: "field" | "paper" | "ink";
  pattern?: string;
  labels?: { admit?: string; serial?: string };
  locale?: string;
  caption?: string;
  build?: "scroll" | "static";
  className?: string;
};

const WORDS: Record<string, { admit: string; serial: string }> = {
  en: { admit: "Admit", serial: "No." },
  nl: { admit: "Toegang", serial: "Nr." },
};

const SMALL = "text-[0.75rem] leading-[1.45]";

/** A seeded generator (mulberry32), so a pattern is the same on the server and in the browser. */
function random(start: number) {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The letters of a name set on a grid, one per cell, read left to right like a line of type. "loud": solid letters,
 * some cells turned (an ink cell with the ground's letter), a few in outline. "quiet": outline letters only, on the
 * grid's hairlines, for a ground that something else stands on.
 */
function LetterGrid({
  text,
  cols,
  rows,
  loud,
  fit = "slice",
  className = "",
  style,
}: {
  text: string;
  cols: number;
  rows: number;
  loud: boolean;
  fit?: "slice" | "meet";
  className?: string;
  style?: CSSProperties;
}) {
  const letters = lettersOf(text);
  const next = random(seed(text));
  const cell = 10;
  const cells = Array.from({ length: cols * rows }, (_, i) => {
    const roll = next();
    return { i, ch: letters[i % Math.max(letters.length, 1)] ?? "", mode: loud ? (roll < 0.26 ? "turn" : roll < 0.4 ? "line" : "solid") : "line" };
  });
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${cols * cell} ${rows * cell}`}
      preserveAspectRatio={fit === "meet" ? "xMinYMid meet" : "xMidYMid slice"}
      className={`block ${className}`}
      style={style}
    >
      {loud ? null : (
        <g style={{ stroke: "var(--line)", strokeWidth: 0.08 }}>
          {Array.from({ length: cols + 1 }, (_, c) => (
            <line key={`c${c}`} x1={c * cell} y1={0} x2={c * cell} y2={rows * cell} />
          ))}
          {Array.from({ length: rows + 1 }, (_, r) => (
            <line key={`r${r}`} x1={0} y1={r * cell} x2={cols * cell} y2={r * cell} />
          ))}
        </g>
      )}
      {cells.map(({ i, ch, mode }) => {
        const x = (i % cols) * cell;
        const y = Math.floor(i / cols) * cell;
        return (
          <g key={i} data-ticket-cell="">
            {mode === "turn" ? <rect x={x} y={y} width={cell} height={cell} style={{ fill: "var(--ink)" }} /> : null}
            <text
              x={x + cell / 2}
              y={y + cell * 0.5 + 3.05}
              textAnchor="middle"
              className="font-display"
              style={{
                fontSize: 8.6,
                fontWeight: 600,
                fill: mode === "turn" ? "var(--surface-0)" : mode === "solid" ? "var(--ink)" : "none",
                stroke: mode === "line" ? (loud ? "var(--ink)" : "color-mix(in oklab, var(--ink) 26%, transparent)") : "none",
                strokeWidth: mode === "line" ? 0.14 : 0,
              }}
            >
              {ch}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const STOCK: Record<NonNullable<Props["stock"]>, { className: string; paper?: "print" }> = {
  field: { className: "scene-field" },
  ink: { className: "scene-inverse" },
  paper: { className: "subject-paper", paper: "print" },
};

/** One date, or the first and last of a run, as large day figures with the month under them. */
function Dates({ dates, locale, size }: { dates: string[]; locale: string; size: string }) {
  const first = dateParts(dates[0], locale);
  const last = dates.length > 1 ? dateParts(dates[dates.length - 1], locale) : null;
  if (!first) return null;
  const month = last && last.month !== first.month ? `${first.month} / ${last.month}` : first.month;
  const year = last && last.year !== first.year ? `${first.year} / ${last.year}` : first.year;
  return (
    <div>
      <p className={`m-0 flex items-center gap-[0.18em] font-display leading-none tracking-[-0.02em] ${size} ${FIGURES}`}>
        <span>{first.day}</span>
        {last ? (
          <>
            <span aria-hidden="true" className="inline-block h-[0.06em] w-[0.5em] translate-y-[0.02em] bg-[color:var(--ink)]" />
            <span className="sr-only"> / </span>
            <span>{last.day}</span>
          </>
        ) : null}
      </p>
      <p className={`m-0 mt-1.5 ${SMALL} ${FIGURES}`}>
        {last ? `${month} ${year}` : `${first.weekday} ${month} ${year}`}
      </p>
    </div>
  );
}

export function Ticket({
  event,
  kind = "ticket",
  city,
  venue,
  dates,
  time,
  edition,
  tier,
  serial,
  holder,
  stock = "field",
  pattern,
  labels,
  locale = "en-GB",
  caption,
  build = "scroll",
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const words = { ...(WORDS[languageOf(locale)] ?? WORDS.en), ...labels };
  const source = pattern ?? event;
  const look = STOCK[stock];
  const where = [venue, city].filter(Boolean).join(", ");

  useScrollBuild(
    root,
    build === "scroll",
    (el, tl) => {
      const cells = Array.from(el.querySelectorAll("[data-ticket-ground] [data-ticket-cell]"));
      const order = random(seed(source));
      for (let i = cells.length - 1; i > 0; i -= 1) {
        const j = Math.floor(order() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      if (cells.length) tl.from(cells, { autoAlpha: 0, stagger: { each: 0.03 }, duration: 0.3 });
      const piece = el.querySelector("[data-ticket-piece]");
      if (piece) tl.from(piece, { y: 40, autoAlpha: 0, duration: 0.8, ease: "power2.out" }, 0.15);
      const poster = el.querySelectorAll("[data-ticket-poster] [data-ticket-cell]");
      if (poster.length) tl.from(poster, { autoAlpha: 0, stagger: { each: 0.025, from: "random" }, duration: 0.3 }, 0);
    },
    [event, kind],
    { start: "top 85%", end: "center 55%" },
  );

  if (kind === "poster") {
    return (
      <figure ref={root} data-subject="ticket" data-kind="poster" className={`@container m-0 ${className}`}>
        <div
          data-paper={look.paper}
          className={`${look.className} mx-auto grid aspect-[1/1.414] w-full max-w-[34rem] grid-rows-[auto_1fr_auto] overflow-hidden p-[6cqi] text-ink`}
        >
          <div className="grid grid-cols-4 gap-x-[3cqi] border-b-[0.35cqi] border-[color:var(--ink)] pb-[2.5cqi]">
            <p className={`col-span-2 m-0 ${SMALL} font-medium`}>{edition ?? ""}</p>
            <p className={`col-span-2 m-0 text-right ${SMALL} ${FIGURES}`}>{serial ? `${words.serial} ${serial}` : ""}</p>
          </div>
          <div data-ticket-poster="" className="relative min-h-0 py-[4cqi]">
            <LetterGrid text={source} cols={4} rows={4} loud className="h-full w-full" />
          </div>
          <div className="grid grid-cols-4 gap-x-[3cqi] gap-y-[3cqi] border-t-[0.35cqi] border-[color:var(--ink)] pt-[3cqi]">
            <p className="col-span-4 m-0 font-display text-[clamp(1.75rem,10cqi,3.5rem)] leading-[0.92] tracking-[-0.02em]">{event}</p>
            {dates?.length ? (
              <div className="col-span-2">
                <Dates dates={dates} locale={locale} size="text-[clamp(1.5rem,8cqi,2.75rem)]" />
              </div>
            ) : null}
            <div className={`col-span-2 ${SMALL}`}>
              {time ? <p className={`m-0 ${FIGURES}`}>{time}</p> : null}
              {venue ? <p className="m-0">{venue}</p> : null}
              {city ? <p className="m-0 font-medium">{city}</p> : null}
            </div>
          </div>
        </div>
        {caption ? <figcaption className="mx-auto mt-4 max-w-[34rem] font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
      </figure>
    );
  }

  const ground = (
    <div data-ticket-ground="" aria-hidden="true" className="absolute inset-0">
      <LetterGrid text={source} cols={kind === "badge" ? 5 : 9} rows={kind === "badge" ? 6 : 5} loud={false} className="h-full w-full" />
    </div>
  );

  if (kind === "badge") {
    return (
      <figure ref={root} data-subject="ticket" data-kind="badge" className={`@container m-0 ${className}`}>
        <div className="relative mx-auto w-full max-w-[34rem] overflow-hidden px-[10cqi] py-[8cqi]">
          {ground}
          <div
            data-ticket-piece=""
            data-paper={look.paper}
            className={`${look.className} relative mx-auto flex aspect-[5/7] w-full max-w-[19rem] rotate-[-2.5deg] flex-col overflow-hidden rounded-[0.875rem] text-ink`}
          >
            <span aria-hidden="true" className="subject-slot mx-auto mt-[5%] h-[0.875rem] w-[3.5rem] shrink-0 rounded-full" />
            <div className="flex items-baseline justify-between gap-3 px-[8%] pt-[7%]">
              <p className={`m-0 ${SMALL} font-medium`}>{event}</p>
              {edition ? <p className={`m-0 shrink-0 ${SMALL}`}>{edition}</p> : null}
            </div>
            <div className="mt-[6%] h-[24%] border-y border-[color:var(--ink)]">
              <LetterGrid text={source} cols={6} rows={2} loud className="h-full w-full" />
            </div>
            <div className="flex flex-1 flex-col justify-end px-[8%] pb-[8%]">
              {holder ? (
                <>
                  <p className="m-0 font-display text-[clamp(1.75rem,9cqi,2.5rem)] leading-[0.98] tracking-[-0.015em]">{holder.name}</p>
                  {holder.role || holder.org ? (
                    <p className={`m-0 mt-2 ${SMALL}`}>{[holder.role, holder.org].filter(Boolean).join(", ")}</p>
                  ) : null}
                </>
              ) : null}
              <div className={`mt-[7%] flex items-end justify-between gap-3 border-t border-[color:var(--ink)] pt-2.5 ${SMALL}`}>
                <span>{[tier, city].filter(Boolean).join(", ")}</span>
                {serial ? <span className={FIGURES}>{`${words.serial} ${serial}`}</span> : null}
              </div>
            </div>
          </div>
        </div>
        {caption ? <figcaption className="mx-auto mt-4 max-w-[34rem] font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure ref={root} data-subject="ticket" data-kind="ticket" className={`@container m-0 ${className}`}>
      <div className="relative overflow-hidden px-[6cqi] py-[9cqi] @xl:px-[7cqi] @xl:py-[8cqi]">
        {ground}
        <div
          data-ticket-piece=""
          data-paper={look.paper}
          className={`${look.className} subject-ticket relative mx-auto grid w-full max-w-[44rem] text-ink @xl:rotate-[-2deg] @xl:grid-cols-[72%_28%]`}
        >
          <div className="flex flex-col gap-6 p-6 @xl:gap-8 @xl:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className={`m-0 ${SMALL}`}>{tier ?? words.admit}</p>
              {edition ? <p className={`m-0 ${SMALL}`}>{edition}</p> : null}
            </div>
            <p className="m-0 font-display text-[clamp(2rem,8.5cqi,3.75rem)] leading-[0.92] tracking-[-0.02em]">{event}</p>
            <div className="mt-auto grid grid-cols-2 items-end gap-x-6 gap-y-5 border-t border-[color:var(--ink)] pt-4">
              {dates?.length ? <Dates dates={dates} locale={locale} size="text-[clamp(1.75rem,6cqi,2.5rem)]" /> : <span />}
              <div className={SMALL}>
                {time ? <p className={`m-0 ${FIGURES}`}>{time}</p> : null}
                {where ? <p className="m-0">{where}</p> : null}
              </div>
              {holder ? (
                <div className="col-span-2">
                  <p className={`m-0 ${SMALL} opacity-80`}>{words.admit}</p>
                  <p className="m-0 font-display text-[1.375rem] leading-[1.15]">{holder.name}</p>
                  {holder.role || holder.org ? <p className={`m-0 ${SMALL}`}>{[holder.role, holder.org].filter(Boolean).join(", ")}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="subject-perforation flex h-[7rem] items-center justify-between gap-4 p-6 @xl:h-auto @xl:flex-col @xl:items-stretch @xl:p-7">
            <div className="h-full w-[6rem] shrink-0 overflow-hidden @xl:h-auto @xl:w-full @xl:flex-1">
              <LetterGrid text={source} cols={3} rows={2} loud fit="meet" className="h-full w-full" />
            </div>
            <div className="text-right @xl:text-left">
              {serial ? (
                <p className="m-0 flex items-baseline justify-end gap-2 @xl:block">
                  <span className={`block ${SMALL}`}>{words.serial}</span>
                  <span className={`block font-display text-[clamp(1.75rem,5cqi,2.25rem)] leading-none ${FIGURES}`}>{serial}</span>
                </p>
              ) : null}
              {city ? <p className={`m-0 mt-2 ${SMALL} font-medium`}>{city}</p> : null}
            </div>
          </div>
        </div>
      </div>
      {caption ? <figcaption className="mt-4 font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}
