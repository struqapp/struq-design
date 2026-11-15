"use client";
// components/struq/kit/subject/AppScreen.tsx (Struq recipe)
// One designed screen of the client's own software, never a generic dashboard: a window or a phone drawn in the
// page's palette (no borrowed OS chrome, no brand marks but the client's), composed from a few typed slots: a list, a
// detail, a timeline, a form state, or any piece passed as children (a Document, set on paper="scene"). It reads as
// the client's product because it is their nouns, their statuses and their tokens.
//
// <AppScreen product="Kraan Werkbon" nav={["Werkbonnen", "Facturen", "Klanten", "Planning"]} active={1}
//   title="Facturen" action="Nieuwe factuur" columns={["Klant", "Bedrag", "Status"]}
//   list={[{ title: "Familie de Wit", meta: "2026-0142", value: "€ 213,57", status: "Verstuurd" }]}
//   statuses={{ Verstuurd: "open", Betaald: "done", "Te laat": "late" }} change={{ item: 0, to: "Betaald" }}
//   detail={{ title: "Familie de Wit", meta: "Lindelaan 4, Rotterdam", fields: [{ label: "Factuur", value: "2026-0142" }] }} />
//
// Props
// - product: the software's name, beside its mark in the top bar. logo: optional image src (otherwise a monogram).
// - frame: "window" (default) or "phone".
// - nav: up to six section names; active: the index shown as current. A window shows them in a side column, a
//   phone in its tab bar (the first four).
// - title: the screen's own heading. action: optional primary button label. user: optional name for the account disc.
// - list: { title, meta?, value?, status? }[], the screen's records. selected: the index shown open in the detail.
//   columns: optional head labels for the list's three columns (title, value, status).
// - detail: { title, meta?, fields?: { label, value }[], text? }: the selected record.
// - timeline: { time, text, done? }[]: the record's history, newest last.
// - form: { title?, fields: { label, value?, placeholder?, state?: "focus" | "error", hint? }[], submit }: a form
//   caught mid-fill (one field focused, one perhaps in error).
// - children: anything else for the detail pane, a <Document paper="scene" /> above all.
// - statuses: how each status word reads: "done" (a filled accent dot), "open" (a ring), "late" (a filled ink dot,
//   the word in medium weight) or "quiet". Words not listed read as "quiet".
// - change: { item, to }: the one state change. As the screen scrolls up past the middle of the view, the list's
//   item `item` moves from its status to `to` (Sent to Paid). One per screen, at most.
// - caption: a line under the frame, in the scene's ink. build: "scroll" (default) runs the change; "static" shows
//   the screen after it.
// - className: on the figure.
//
// Mounting: inside any section. A window wants eight or more of twelve columns on a wide screen and reflows on a
// phone (no side column, the panes stacked); a phone frame wants four. The root is a <figure data-subject="app">.
//
// Motion: one state change and nothing else: the row's status crossfades to its new word and dot while the row's
// ground warms for a moment, played forward as the screen passes the middle of the view and back when it leaves
// downward. Reduced motion, build="static" or no scripts: the screen as it stands after the change.
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "../gsap";
import { FIGURES } from "./format";
import { Mark } from "./Mark";

type Tone = "done" | "open" | "late" | "quiet";
type Item = { title: string; meta?: string; value?: string; status?: string };
type Detail = { title: string; meta?: string; fields?: { label: string; value: string }[]; text?: string };
type Moment = { time: string; text: string; done?: boolean };
type FormField = { label: string; value?: string; placeholder?: string; state?: "focus" | "error"; hint?: string };
type Form = { title?: string; fields: FormField[]; submit: string };

type Props = {
  product: string;
  logo?: string;
  frame?: "window" | "phone";
  nav?: string[];
  active?: number;
  title: string;
  action?: string;
  user?: string;
  list?: Item[];
  selected?: number;
  columns?: [string, string?, string?];
  detail?: Detail;
  timeline?: Moment[];
  form?: Form;
  children?: ReactNode;
  statuses?: Record<string, Tone>;
  change?: { item: number; to: string };
  caption?: string;
  build?: "scroll" | "static";
  className?: string;
};

const SMALL = "text-[0.75rem] leading-[1.45]";
const BODY = "text-[0.8125rem] leading-[1.5] @3xl:text-[0.875rem]";

function Status({ word, tone }: { word: string; tone: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${SMALL} ${tone === "late" ? "font-medium text-ink" : tone === "quiet" ? "text-ink-muted" : "text-ink"}`}>
      <span
        aria-hidden="true"
        className={`size-[0.4375rem] shrink-0 rounded-full ${
          tone === "done" ? "bg-accent" : tone === "late" ? "bg-[color:var(--ink)]" : tone === "open" ? "border border-[color:var(--ink-muted)]" : "bg-[color:var(--line)]"
        }`}
      />
      {word}
    </span>
  );
}

export function AppScreen({
  product,
  logo,
  frame = "window",
  nav = [],
  active = 0,
  title,
  action,
  user,
  list,
  selected,
  columns,
  detail,
  timeline,
  form,
  children,
  statuses = {},
  change,
  caption,
  build = "scroll",
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const toneOf = (word?: string): Tone => (word ? (statuses[word] ?? "quiet") : "quiet");
  const pick = selected ?? (change ? change.item : 0);

  useGSAP(
    () => {
      const el = root.current;
      if (!el || !change || build !== "scroll") return;
      const row = el.querySelector<HTMLElement>("[data-app-change]");
      const before = row?.querySelector<HTMLElement>("[data-app-before]");
      const after = row?.querySelector<HTMLElement>("[data-app-after]");
      if (!row || !before || !after) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(after, { autoAlpha: 0, y: 6 });
        gsap.set(before, { autoAlpha: 1, y: 0 });
        const tl = gsap.timeline({
          paused: true,
          defaults: { duration: 0.42, ease: "power2.out" },
          scrollTrigger: { trigger: row, start: "top 55%", toggleActions: "play none none reverse" },
        });
        tl.to(before, { autoAlpha: 0, y: -6 })
          .to(after, { autoAlpha: 1, y: 0 }, "<0.12")
          .fromTo(row, { "--app-glow": "0%" }, { "--app-glow": "9%", duration: 0.3 }, "<")
          .to(row, { "--app-glow": "0%", duration: 1.1, ease: "power1.inOut" }, ">0.15");
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [change?.item, change?.to, build] },
  );

  const rows = list ? (
    <ListPane items={list} columns={columns} pick={pick} change={change} toneOf={toneOf} motion={build === "scroll"} />
  ) : null;
  const side =
    children ??
    (detail || timeline || form ? (
      <div className="grid gap-7">
        {detail ? <DetailPane detail={detail} /> : null}
        {timeline ? <TimelinePane moments={timeline} /> : null}
        {form ? <FormPane form={form} /> : null}
      </div>
    ) : null);

  if (frame === "phone") {
    const tabs = nav.slice(0, 4);
    return (
      <figure ref={root} data-subject="app" data-frame-kind="phone" className={`@container m-0 ${className}`}>
        <div className="mx-auto w-full max-w-[22rem] rounded-[2.75rem] border border-line bg-surface-2 p-[0.5rem]">
          <div className="relative flex aspect-[9/19] flex-col overflow-hidden rounded-[2.3rem] bg-surface-0 text-ink">
            <div aria-hidden="true" className="mx-auto mt-2.5 h-[1.375rem] w-[5.5rem] shrink-0 rounded-full bg-surface-2" />
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-2">
                <Mark name={product} logo={logo} size={1.5} />
                <span className={`${SMALL} font-medium`}>{product}</span>
              </div>
              {user ? <Mark name={user} size={1.5} shape="round" className="opacity-90" /> : null}
            </div>
            <div className="flex items-end justify-between gap-3 px-5 pt-5">
              <p className="m-0 font-display text-[1.75rem] leading-[1.05] tracking-[-0.01em]">{title}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-5 pt-4">
              {rows}
              {side ? <div className={rows ? "mt-6" : ""}>{side}</div> : null}
            </div>
            {action ? (
              <div className="px-5 pb-3 pt-3">
                <span className={`block rounded-[0.625rem] bg-[color:var(--ink)] py-2.5 text-center ${SMALL} font-medium text-surface-0`}>{action}</span>
              </div>
            ) : null}
            {tabs.length ? (
              <nav aria-label={product} className="grid shrink-0 border-t border-line px-2 pb-5 pt-2.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                {tabs.map((tab, i) => (
                  <span key={tab} className={`flex flex-col items-center gap-1 text-center ${SMALL} ${i === active ? "font-medium text-ink" : "text-ink-muted"}`}>
                    <span aria-hidden="true" className={`size-[0.3125rem] rounded-full ${i === active ? "bg-accent" : "bg-transparent"}`} />
                    <span className="max-w-full truncate">{tab}</span>
                  </span>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
        {caption ? <figcaption className="mx-auto mt-4 max-w-[22rem] font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure ref={root} data-subject="app" data-frame-kind="window" className={`@container m-0 ${className}`}>
      <div className="overflow-hidden rounded-[0.875rem] border border-line bg-surface-1 text-ink">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 @3xl:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Mark name={product} logo={logo} size={1.625} shape="square" />
            <span className={`truncate ${BODY} font-medium`}>{product}</span>
          </div>
          {user ? (
            <span className="flex items-center gap-2">
              <span className={`hidden ${SMALL} text-ink-muted @2xl:inline`}>{user}</span>
              <Mark name={user} size={1.625} />
            </span>
          ) : null}
        </div>
        <div className="grid @3xl:grid-cols-[11.5rem_1fr]">
          {nav.length ? (
            <nav aria-label={product} className="hidden border-r border-line px-3 py-5 @3xl:block">
              <ul className="m-0 grid list-none gap-0.5 p-0">
                {nav.map((item, i) => (
                  <li
                    key={item}
                    className={`rounded-[0.4375rem] px-3 py-2 ${BODY} ${i === active ? "bg-surface-2 font-medium text-ink" : "text-ink-muted"}`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="min-w-0 bg-surface-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 @3xl:px-7 @3xl:py-5">
              <p className="m-0 font-display text-[1.5rem] leading-[1.1] tracking-[-0.01em] @3xl:text-[1.875rem]">{title}</p>
              {action ? (
                <span className={`rounded-[0.4375rem] bg-[color:var(--ink)] px-3.5 py-2 ${SMALL} font-medium text-surface-0`}>{action}</span>
              ) : null}
            </div>
            <div className={`grid ${rows && side ? "@4xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]" : ""}`}>
              {rows ? <div className="min-w-0 px-5 py-4 @3xl:px-7 @3xl:py-5">{rows}</div> : null}
              {side ? (
                <div className={`min-w-0 px-5 py-5 @3xl:px-7 @3xl:py-6 ${rows ? "border-t border-line @4xl:border-l @4xl:border-t-0" : ""}`}>{side}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {caption ? <figcaption className="mt-4 font-body text-sheet-label text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}

function ListPane({
  items,
  columns,
  pick,
  change,
  toneOf,
  motion,
}: {
  items: Item[];
  columns?: [string, string?, string?];
  pick: number;
  change?: { item: number; to: string };
  toneOf: (word?: string) => Tone;
  motion: boolean;
}) {
  return (
    <div>
      {columns ? (
        <div className={`grid grid-cols-[1fr_auto] gap-x-4 border-b border-line pb-2 ${SMALL} text-ink-muted @xl:grid-cols-[1fr_7rem_6.5rem]`}>
          <span>{columns[0]}</span>
          <span className="hidden text-right @xl:block">{columns[1]}</span>
          <span className="text-right @xl:text-left">{columns[2]}</span>
        </div>
      ) : null}
      <ul className="m-0 list-none p-0">
        {items.map((item, i) => {
          const changes = change?.item === i;
          const status = changes && !motion ? change.to : item.status;
          return (
            <li
              key={`${item.title}-${i}`}
              data-app-change={changes ? "" : undefined}
              className={`subject-app-row -mx-2 grid grid-cols-[1fr_auto] items-center gap-x-4 rounded-[0.4375rem] border-b border-line px-2 py-3 last:border-b-0 @xl:grid-cols-[1fr_7rem_6.5rem] ${
                i === pick ? "bg-surface-1" : ""
              }`}
            >
              <span className="min-w-0">
                <span className={`block truncate ${BODY} font-medium`}>{item.title}</span>
                {item.meta || item.value ? (
                  <span className={`block truncate ${SMALL} text-ink-muted`}>
                    {item.meta}
                    {item.value ? <span className={`@xl:hidden ${FIGURES}`}>{item.meta ? `, ${item.value}` : item.value}</span> : null}
                  </span>
                ) : null}
              </span>
              <span className={`hidden text-right ${BODY} @xl:block ${FIGURES}`}>{item.value}</span>
              <span className="grid justify-items-end @xl:justify-items-start">
                {changes && motion ? (
                  <>
                    <span data-app-before="" className="col-start-1 row-start-1 invisible">
                      {item.status ? <Status word={item.status} tone={toneOf(item.status)} /> : null}
                    </span>
                    <span data-app-after="" className="col-start-1 row-start-1">
                      <Status word={change.to} tone={toneOf(change.to)} />
                    </span>
                  </>
                ) : status ? (
                  <Status word={status} tone={toneOf(status)} />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DetailPane({ detail }: { detail: Detail }) {
  return (
    <div>
      <p className="m-0 font-display text-[1.25rem] leading-[1.2] @3xl:text-[1.5rem]">{detail.title}</p>
      {detail.meta ? <p className={`m-0 mt-1 ${SMALL} text-ink-muted`}>{detail.meta}</p> : null}
      {detail.fields?.length ? (
        <dl className="m-0 mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
          {detail.fields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className={`${SMALL} text-ink-muted`}>{field.label}</dt>
              <dd className={`m-0 mt-0.5 ${BODY} ${/\d/.test(field.value) ? FIGURES : ""}`}>{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {detail.text ? <p className={`m-0 mt-5 max-w-[48ch] ${BODY} text-ink-muted`}>{detail.text}</p> : null}
    </div>
  );
}

function TimelinePane({ moments }: { moments: Moment[] }) {
  return (
    <ol className="m-0 list-none p-0">
      {moments.map((moment, i) => (
        <li key={`${moment.time}-${i}`} className="relative grid grid-cols-[0.75rem_1fr] gap-x-3 pb-4 last:pb-0">
          {i < moments.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[0.34375rem] top-[1.1rem] w-px bg-[color:var(--line)]" /> : null}
          <span
            aria-hidden="true"
            className={`mt-[0.4rem] size-[0.75rem] rounded-full border ${moment.done === false ? "border-[color:var(--ink-muted)] bg-surface-0" : "border-[color:var(--ink)] bg-[color:var(--ink)]"}`}
          />
          <span>
            <span className={`block ${BODY}`}>{moment.text}</span>
            <span className={`block ${SMALL} text-ink-muted ${FIGURES}`}>{moment.time}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function FormPane({ form }: { form: Form }) {
  return (
    <div>
      {form.title ? <p className={`m-0 mb-4 ${BODY} font-medium`}>{form.title}</p> : null}
      <div className="grid gap-4">
        {form.fields.map((field) => (
          <div key={field.label}>
            <span className={`block ${SMALL} ${field.state === "error" ? "font-medium text-ink" : "text-ink-muted"}`}>{field.label}</span>
            <span
              className={`mt-1.5 flex min-h-[2.375rem] items-center rounded-[0.4375rem] bg-surface-0 px-3 ${BODY} ${
                field.state === "focus"
                  ? "border border-[color:var(--ink)] outline outline-2 outline-offset-0 outline-[color:var(--line)]"
                  : field.state === "error"
                    ? "border-[1.5px] border-[color:var(--ink)]"
                    : "border border-line"
              }`}
            >
              {field.value ? <span className="truncate">{field.value}</span> : <span className="truncate text-ink-muted">{field.placeholder}</span>}
              {field.state === "focus" ? <span aria-hidden="true" className="subject-caret ml-px h-[1.1em] w-px bg-[color:var(--ink)]" /> : null}
            </span>
            {field.hint ? <span className={`mt-1 block ${SMALL} ${field.state === "error" ? "text-ink" : "text-ink-muted"}`}>{field.hint}</span> : null}
          </div>
        ))}
        <span className={`mt-1 justify-self-start rounded-[0.4375rem] bg-[color:var(--ink)] px-4 py-2.5 ${SMALL} font-medium text-surface-0`}>{form.submit}</span>
      </div>
    </div>
  );
}
