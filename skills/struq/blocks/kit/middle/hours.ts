// components/struq/kit/middle/hours.ts (Struq recipe)
// Opening hours as data: the rows a page prints and the open marker computed from the given hours and the real local
// time in a given time zone. Never invented: with no hours there is nothing to print and no marker; with hours but no
// time zone the hours print and the marker stays off. Lifted from footers/footer-contact (one copy: the footer and
// kit/middle/PlaceHours both import it).
//
// const rows: HoursRow[] = [{ days: [1, 2, 3, 4, 5], from: "7:00", to: "18:00" }, { days: [6], from: "8:00", to: "16:00" }];
// hoursLines(rows, "en");                                   // [{ days: "Monday to Friday", time: "7:00 to 18:00" }, ...]
// openStatus(rows, wallClock(new Date(), "Europe/Amsterdam"), "en"); // { open: true, text: "Open now, until 18:00" }
// const now = useNow(Boolean(hours && timeZone));          // null on the server and the first paint, then every minute
//
// Exports
// - HoursRow: { days, from, to }. days are weekdays 1 (Monday) to 7 (Sunday); from and to are "9:00" style times.
// - HoursLang: "en" (default) or "nl". The words only; the times print as given.
// - toMinutes(time): minutes since midnight. daysText(days, lang): "Monday to Friday", "Monday, Wednesday and Friday".
// - hoursText(row, lang): one row as one line, "Monday to Friday, 9:00 to 18:00".
// - hoursLines(rows, lang): each row as { days, time } for a timetable.
// - wallClock(now, timeZone): the weekday and time on the wall in that zone ({ dow, h, m, hh, mm }).
// - openStatus(rows, wall, lang): { open, text } ("Open now, until 18:00", "Today from 9:00", "Tomorrow from 9:00",
//   "Saturday from 8:00"); text is "" when no row has a day.
// - useNow(on): the current Date after mount, ticking on the minute; null when off, on the server and on first paint,
//   so nothing time-dependent is ever rendered on the server.
import { useEffect, useState } from "react";

export type HoursRow = { days: number[]; from: string; to: string };
export type HoursLang = "en" | "nl";
export type Wall = { dow: number; h: number; m: number; hh: string; mm: string };
export type OpenStatus = { open: boolean; text: string };

const WORDS: Record<HoursLang, { days: string[]; through: string; and: string; to: string; openUntil: string; today: string; tomorrow: string; from: string }> = {
  en: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    through: "to",
    and: "and",
    to: "to",
    openUntil: "Open now, until",
    today: "Today",
    tomorrow: "Tomorrow",
    from: "from",
  },
  nl: {
    days: ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"],
    through: "tot en met",
    and: "en",
    to: "tot",
    openUntil: "Nu open, tot",
    today: "Vandaag",
    tomorrow: "Morgen",
    from: "vanaf",
  },
};

const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Minutes since midnight for "9:00" or "18:30". */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** The days as words: a run of three or more as "Monday to Friday", other days listed ("Saturday and Sunday"). */
export function daysText(days: number[], lang: HoursLang = "en"): string {
  const w = WORDS[lang];
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (!sorted.length) return "";
  const runs: number[][] = [];
  for (const d of sorted) {
    const run = runs[runs.length - 1];
    if (run && d === run[run.length - 1] + 1) run.push(d);
    else runs.push([d]);
  }
  const parts = runs.flatMap((run) =>
    run.length >= 3
      ?[`${w.days[run[0] - 1]} ${w.through} ${w.days[run[run.length - 1] - 1]}`]
      : run.map((d) => w.days[d - 1]),
  );
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} ${w.and} ${parts[parts.length - 1]}`;
  return cap(text);
}

/** One row as one line: "Monday to Friday, 9:00 to 18:00". */
export function hoursText(row: HoursRow, lang: HoursLang = "en"): string {
  const days = daysText(row.days, lang);
  if (!days) return "";
  return `${days}, ${row.from} ${WORDS[lang].to} ${row.to}`;
}

/** Each row as its days and its time, for a timetable. Rows without a valid day are dropped. */
export function hoursLines(rows: readonly HoursRow[], lang: HoursLang = "en"): { days: string; time: string }[] {
  return rows
    .map((row) => ({ days: daysText(row.days, lang), time: `${row.from} ${WORDS[lang].to} ${row.to}` }))
    .filter((line) => line.days !== "");
}

/** The weekday (1 Monday to 7 Sunday) and the time on the wall in `timeZone` at `now`. */
export function wallClock(now: Date, timeZone: string): Wall {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const h = Number(get("hour")) % 24;
  const m = Number(get("minute"));
  return { dow: WEEKDAY[get("weekday")] ?? 1, h, m, hh: String(h).padStart(2, "0"), mm: String(m).padStart(2, "0") };
}

/** Whether the place is open on the wall clock, from the given rows only, and the words for it. */
export function openStatus(rows: readonly HoursRow[], wall: Wall, lang: HoursLang = "en"): OpenStatus {
  const w = WORDS[lang];
  const mins = wall.h * 60 + wall.m;
  const on = (d: number) => rows.filter((row) => row.days.includes(d));
  const today = on(wall.dow);
  const now = today.filter((row) => mins >= toMinutes(row.from) && mins < toMinutes(row.to));
  if (now.length) {
    const until = now.reduce((a, b) => (toMinutes(b.to) > toMinutes(a.to) ? b : a));
    return { open: true, text: `${w.openUntil} ${until.to}` };
  }
  const earliest = (list: HoursRow[]) => list.reduce((a, b) => (toMinutes(b.from) < toMinutes(a.from) ? b : a));
  const later = today.filter((row) => mins < toMinutes(row.from));
  if (later.length) return { open: false, text: `${w.today} ${w.from} ${earliest(later).from}` };
  for (let k = 1; k <= 7; k += 1) {
    const d = ((wall.dow - 1 + k) % 7) + 1;
    const next = on(d);
    if (next.length) {
      const from = earliest(next).from;
      return { open: false, text: k === 1 ? `${w.tomorrow} ${w.from} ${from}` : `${cap(w.days[d - 1])} ${w.from} ${from}` };
    }
  }
  return { open: false, text: "" };
}

/** The time now, only when `on` and only after mount (null on the server and the first paint), ticking on the minute. */
export function useNow(on: boolean): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!on) return;
    let timer = 0;
    const tick = () => {
      const d = new Date();
      setNow(d);
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 30);
    };
    tick();
    // A background tab's timers are held back; on return the clock catches up at once.
    const onShow = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [on]);
  return on ? now : null;
}
