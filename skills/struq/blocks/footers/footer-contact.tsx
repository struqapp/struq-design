"use client";
// footer-contact (Struq footer recipe)
// A footer whose hero is the way to reach the studio: the mail address as a real mailto link, the studio's city and
// its opening hours, a phone line, the address, three or four plain links and a small foot line. With `clock` the city
// also keeps its live local time and a calm marker of whether the studio is open (computed from that time and the
// opening hours, never invented); without it nothing reads the time and the hours stand as plain text. One live clock
// per site at most, so the clock is off unless asked. Three compositions:
//
// - address: the mail address is the footer's headline, set at the top and fitted to the width with the loaded face
//   (on a phone it breaks at the @ when one line would set too small). Its characters roll up into their own slots
//   from blank as the footer arrives, staggered across the width, and on hover or focus each rolls up again to the
//   same character, staggered from the side the pointer came in. The details close the footer as one ruled line.
// - clock: the studio's city at display size is the centre, fitted to the width and sliding out of its mask. With
//   `clock` it is a large live clock instead, hours and minutes at display size, the colon breathing once a second and
//   a changed digit rolling over on the minute (every digit in a slot as wide as the face's widest, so nothing shifts);
//   without scripts that slot holds the opening hours instead of a time. The mail address leads the ruled rows under
//   it, the phone, the address and the hours beneath it, like a timetable.
// - columns: a quiet editorial grid. A short closing line at display size, then three columns (Contact, Studio, Volg
//   ons); the address is a link whose underline draws from the side the pointer came in. The most restrained.
//
// <FooterContact variant="address" studio="Noord" email="hallo@noord.studio" phone={{ label: "010 214 63 80",
//   href: "tel:+31102146380" }} address={["Maashaven Noordzijde 12", "3072 AA Rotterdam"]} city="Rotterdam"
//   hours={{ days: [1, 2, 3, 4, 5], from: "9:00", to: "18:00" }} links={[...]} foot="..." />
// Add `clock timeZone="Europe/Amsterdam"` for the live time and the open marker.
//
// The entrance is scrubbed to the scroll over the footer's own arrival (from its top meeting the bottom of the screen
// to its bottom meeting it), with 0.4 s of smoothing, so scrolling back runs it backwards and a flick never stacks
// states. In the address and clock variants every part starts its move at the scroll position where it comes into
// view (its own offset in the footer), so nothing plays out below the fold. Each variant enters its own way: the
// address's characters roll into their slots; the clock's hours and minutes slide out from the colon; the closing
// line rises line by line and the columns follow. Transforms
// are whole pixels. Start states wait behind the `.sq-js` gate with a 3 s CSS fallback (blocks.css, "--- footer-contact
// ---"); the fitted type stays unseen until it is measured with the face it is read in (capped), and refits when a face
// lands or the width changes.
//
// With `clock` the time is never rendered on the server: the first paint holds a stable placeholder (an unseen 00:00,
// an empty marker) and the real time arrives after mount, so there is nothing to mismatch. It ticks on the minute.
// Reduced motion: the composed footer, no travel; the colon holds and the digits cut; hovers show a plain underline.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "../kit/gsap";

export const FOOTER_CONTACT_VARIANTS = [
  { id: "address", title: "Adres" },
  { id: "clock", title: "Klok" },
  { id: "columns", title: "Kolommen" },
] as const;

export type FooterContactVariant = (typeof FOOTER_CONTACT_VARIANTS)[number]["id"];

type Link = { href: string; label: string };

type Props = {
  variant?: FooterContactVariant;
  studio: string;
  email: string;
  phone: Link;
  /** The visiting address, one entry per line. */
  address: string[];
  city: string;
  /** The city's live local time and the open marker computed from it. Off unless asked: one clock per site at most. */
  clock?: boolean;
  /** IANA zone for the clock. */
  timeZone?: string;
  /** Opening hours: weekdays 1 (Monday) to 7 (Sunday), times as "9:00". */
  hours: { days: number[]; from: string; to: string };
  /** The closing line the columns variant opens with. */
  line?: string;
  /** Three or four plain links (the studio's channels). */
  links: Link[];
  /** The small foot line. */
  foot: string;
  className?: string;
};

/** Seconds of smoothing on the scrub: a camera settling, never a delay. */
/** The address on one line, with a Dutch postcode (1234 AB) kept together so it never breaks across lines. */
const oneLine = (parts: string[]) => parts.map((l) => l.replace(/(\d{4}) ([A-Z]{2})/, "$1\u00A0$2")).join(", ");

const SMOOTH = 0.4;
/** The longest the fit and the line cut wait for the display face, in ms. */
const FONT_CAP = 1200;
/** Below this fitted size (px) the address breaks at the @ and fits its longer half instead. */
const BREAK_BELOW = 56;
/** The address never sets taller than this share of the screen's height. */
const ADDRESS_CAP = 0.3;
/** The clock fills this share of the width, and never more than this share of the height. */
const CLOCK_WIDTH = 0.82;
const CLOCK_CAP = 0.4;
/** The whole hover roll, first character to last, in seconds. */
const ROLL_SPAN = 0.36;
/** The soft rise of the details, in px. */
const SOFT = 24;

const DAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const toMinutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const within = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const out3 = gsap.parseEase("power3.out");
const out2 = gsap.parseEase("power2.out");
const inOut2 = gsap.parseEase("power2.inOut");

/** Staggered windows for n items inside [from, to]: each runs `span` of it, the last one ends at `to`. */
function windows(n: number, from: number, to: number, span: number) {
  const len = to - from;
  if (n <= 1) return [[from, to]];
  const step = (len * (1 - span)) / (n - 1);
  return Array.from({ length: n }, (_, i) => [from + i * step, from + i * step + len * span]);
}

/** A node's distance from the top of `root` in px, from layout (offsets ignore the transforms the scrub writes). */
function offsetIn(node: HTMLElement, root: HTMLElement) {
  let y = 0;
  let n: HTMLElement | null = node;
  while (n && n !== root) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return n === root ? y : node.getBoundingClientRect().top - root.getBoundingClientRect().top;
}

/** The window a part enters in: from just before the scroll position where it comes into view (t), a little later the
 * further right it stands (x), over about a quarter of the arrival, never shorter than 0.12 and never past the end. */
function ownWindow(t: number, x: number) {
  const s = t - 0.04 + x * 0.08;
  const end = Math.min(1, s + 0.28);
  return [Math.min(s, end - 0.12), end] as const;
}

/** The widest of the digits 0 to 9 in the clock's own face, written to --fc-dw (in em) so every digit gets that slot. */
function setDigitWidth(clock: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font-size:100px";
  clock.appendChild(probe);
  let w = 0;
  for (let d = 0; d < 10; d += 1) {
    probe.textContent = String(d);
    w = Math.max(w, probe.getBoundingClientRect().width);
  }
  probe.remove();
  if (w > 0) clock.style.setProperty("--fc-dw", `${(w / 100).toFixed(4)}em`);
}

/** The display face, waited for at most FONT_CAP ms. */
function faceReady() {
  const fonts = typeof document !== "undefined" ? document.fonts?.ready : undefined;
  return Promise.race([fonts ?? Promise.resolve(), new Promise((res) => window.setTimeout(res, FONT_CAP))]);
}

/** The time now, only when `on` and only after mount (null on the server and the first paint), ticking on the minute. */
function useNow(on: boolean) {
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

type Wall = { dow: number; h: number; m: number; hh: string; mm: string; date: string };

/** The studio's wall clock and whether it is open, from the real time and the given hours. */
function useWall(now: Date | null, timeZone: string, hours: Props["hours"]) {
  const fmt = useMemo(
    () => ({
      parts: new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      date: new Intl.DateTimeFormat("nl-NL", { timeZone, weekday: "long", day: "numeric", month: "long" }),
    }),
    [timeZone],
  );
  return useMemo(() => {
    if (!now) return { wall: null, status: null };
    const parts = fmt.parts.formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const h = Number(get("hour")) % 24;
    const m = Number(get("minute"));
    const wall: Wall = {
      dow: WEEKDAY[get("weekday")] ?? 1,
      h,
      m,
      hh: String(h).padStart(2, "0"),
      mm: String(m).padStart(2, "0"),
      date: fmt.date.format(now),
    };
    const mins = h * 60 + m;
    const from = toMinutes(hours.from);
    const to = toMinutes(hours.to);
    const openDay = (d: number) => hours.days.includes(d);
    let status: { open: boolean; text: string };
    if (openDay(wall.dow) && mins >= from && mins < to) status = { open: true, text: `Nu open, tot ${hours.to}` };
    else if (openDay(wall.dow) && mins < from) status = { open: false, text: `Vandaag vanaf ${hours.from}` };
    else {
      let text = "";
      for (let k = 1; k <= 7; k += 1) {
        const d = ((wall.dow - 1 + k) % 7) + 1;
        if (openDay(d)) {
          text = k === 1 ? `Morgen vanaf ${hours.from}` : `${cap(DAYS[d - 1])} vanaf ${hours.from}`;
          break;
        }
      }
      status = { open: false, text };
    }
    return { wall, status };
  }, [now, fmt, hours]);
}

/** "Maandag tot en met vrijdag, 9:00 tot 18:00" from the hours. */
function hoursText(hours: Props["hours"]) {
  const days = [...hours.days].sort((a, b) => a - b);
  if (!days.length) return "";
  const first = DAYS[days[0] - 1];
  const last = DAYS[days[days.length - 1] - 1];
  const run = days.length === 1 ? cap(first) : `${cap(first)} tot en met ${last}`;
  return `${run}, ${hours.from} tot ${hours.to}`;
}

/** The open marker: a small ring, filled while the studio is open, and the words. Empty until the time is known. */
function OpenMark({ status }: { status: { open: boolean; text: string } | null }) {
  return (
    <span data-fc-mark="" className="inline-flex items-center gap-[0.6em]">
      <span aria-hidden data-fc-dot="" data-open={status?.open ? "" : undefined} data-pending={status ? undefined : ""} />
      <span data-fc-fade="" data-pending={status ? undefined : ""}>{status ? status.text : " "}</span>
    </span>
  );
}

/** "Rotterdam 14:32": the city, and with the clock its local time once it is known (an unseen placeholder until then). */
function CityTime({ city, wall, clock }: { city: string; wall: Wall | null; clock: boolean }) {
  if (!clock) return <span>{city}</span>;
  return (
    <span className="tabular-nums">
      {city}{" "}
      <time data-fc-fade="" data-pending={wall ? undefined : ""} dateTime={wall ? `${wall.hh}:${wall.mm}` : undefined}>
        {wall ? `${wall.hh}:${wall.mm}` : "00:00"}
      </time>
    </span>
  );
}

/** A plain link whose underline draws from the side the pointer came in, and retracts toward the side it leaves. */
function DrawLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const entered = useRef(0);
  const side = (e: PointerEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2 ? "left" : "right";
  };
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      data-fc-draw=""
      className={`relative inline-block ${className}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onPointerEnter={(e) => {
        entered.current = performance.now();
        e.currentTarget.style.setProperty("--fc-o", side(e));
      }}
      onPointerLeave={(e) => {
        // Only a finished line changes side; one still drawing goes back the way it came.
        if (performance.now() - entered.current > 480) e.currentTarget.style.setProperty("--fc-o", side(e));
      }}
    >
      {children}
    </a>
  );
}

/** The address as rolling characters: each in its own mask, a second copy waiting below it. `parts` splits it in
 * halves that can stand on two lines (at the @). With `enter`, every character also sits on a layer the scroll lifts
 * into its slot from blank. Read once by screen readers, from the hidden plain copy. */
function RollAddress({ email, parts, className = "", enter = false }: { email: string; parts: string[]; className?: string; enter?: boolean }) {
  const total = parts.join("").length;
  let index = 0;
  const onPointer = (e: PointerEvent<HTMLAnchorElement>) => {
    // Every character's delay from its distance to the edge the pointer is on, so two lines stagger by column.
    const a = e.currentTarget;
    const r = a.getBoundingClientRect();
    const fromLeft = e.clientX - r.left < r.width / 2;
    a.querySelectorAll<HTMLElement>("[data-fc-ch]").forEach((c) => {
      const b = c.getBoundingClientRect();
      const x = (b.left + b.width / 2 - r.left) / (r.width || 1);
      c.style.setProperty("--d", `${((fromLeft ? x : 1 - x) * ROLL_SPAN).toFixed(3)}s`);
    });
  };
  return (
    <a href={`mailto:${email}`} data-fc-address="" data-fc-roll-host="" className={className} onPointerEnter={onPointer} onPointerLeave={onPointer}>
      <span className="sr-only">{email}</span>
      <span aria-hidden data-fc-parts="">
        {parts.map((part, p) => (
          <span key={p} data-fc-part="">
            {Array.from(part).map((ch) => {
              const i = index++;
              const roll = (
                <span data-fc-roll="">
                  <span>{ch}</span>
                  <span data-fc-copy="">{ch}</span>
                </span>
              );
              return (
                <span key={i} data-fc-ch="" className="struq-char-mask" style={{ "--d": `${((i / Math.max(1, total - 1)) * ROLL_SPAN).toFixed(3)}s` } as CSSProperties}>
                  {enter ? <span data-fc-enter="">{roll}</span> : roll}
                </span>
              );
            })}
          </span>
        ))}
      </span>
    </a>
  );
}

/** One clock digit in its mask: on a change the old one rolls up and out and the new one rises in after it. */
function Digit({ ch }: { ch: string }) {
  const [s, setS] = useState<{ cur: string; prev: string | null; n: number }>({ cur: ch, prev: null, n: 0 });
  if (s.cur !== ch) setS({ cur: ch, prev: s.cur, n: s.n + 1 });
  return (
    <span data-fc-digit="">
      {s.prev !== null ? (
        <span key={`o${s.n}`} data-fc-out="">
          {s.prev}
        </span>
      ) : null}
      <span key={`i${s.n}`} data-fc-in={s.n ? "" : undefined} className="block">
        {s.cur}
      </span>
    </span>
  );
}

/** Fits `el` (measured at 100px) into `room` px, capped. Returns the size it set. */
function fitTo(el: HTMLElement, width: () => number, room: number, max: number) {
  el.style.fontSize = "100px";
  const w = width() || 1;
  const size = Math.min((100 * room) / w, max);
  el.style.fontSize = `${Math.floor(size * 100) / 100}px`;
  return size;
}

export function FooterContact({
  variant = "address",
  studio,
  email,
  phone,
  address,
  city,
  clock = false,
  timeZone = "Europe/Amsterdam",
  hours,
  line = "Zullen we een keer komen kijken?",
  links,
  foot,
  className = "",
}: Props) {
  const root = useRef<HTMLElement>(null);
  const now = useNow(clock);
  const { wall, status } = useWall(now, timeZone, hours);
  const known = wall !== null;
  const at = email.indexOf("@");
  const halves = at > 0 ? [email.slice(0, at), email.slice(at)] : [email];

  // The colon breathes on the second: its cycle starts where the current second already is.
  const colon = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (now && colon.current && !colon.current.dataset.synced) {
      colon.current.style.animationDelay = `${-(now.getMilliseconds() / 1000).toFixed(3)}s`;
      colon.current.dataset.synced = "1";
    }
  }, [now]);

  // Fit with the face it is read in: the address to the width (breaking at the @ on a narrow screen), the clock to its
  // share of the width. Unseen until fitted; refits when a face lands or the width changes.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (variant === "columns") {
      el.dataset.fit = "1";
      return;
    }
    let alive = true;
    let lastWidth = -1;
    let raf = 0;
    const fit = () => {
      if (!alive) return;
      if (variant === "address") {
        const link = el.querySelector<HTMLElement>("[data-fc-address]");
        const box = link?.parentElement;
        const parts = Array.from(el.querySelectorAll<HTMLElement>("[data-fc-address] [data-fc-part]"));
        if (!link || !box || !parts.length) return;
        const room = box.clientWidth;
        const max = window.innerHeight * ADDRESS_CAP;
        link.dataset.lines = "1";
        let size = fitTo(link, () => parts.reduce((s, p) => s + p.getBoundingClientRect().width, 0), room, max);
        if (size < BREAK_BELOW && parts.length > 1) {
          link.dataset.lines = "2";
          size = fitTo(link, () => Math.max(...parts.map((p) => p.getBoundingClientRect().width)), room, max);
        }
      } else {
        const clock = el.querySelector<HTMLElement>("[data-fc-clock]");
        if (!clock) return;
        setDigitWidth(clock);
        const room = (clock.parentElement?.clientWidth ?? el.clientWidth) * CLOCK_WIDTH;
        fitTo(clock, () => clock.scrollWidth, room, window.innerHeight * CLOCK_CAP);
      }
      el.dataset.fit = "1";
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    faceReady().then(fit);
    const onFonts = () => fit();
    document.fonts?.addEventListener?.("loadingdone", onFonts);
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      if (el.dataset.fit) fit();
    });
    ro.observe(el);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", onFonts);
    };
  }, [variant, email, city, clock]);

  // The clock refits once the real digits replace the placeholder.
  useEffect(() => {
    if (variant !== "clock" || !known) return;
    const el = root.current;
    const clock = el?.querySelector<HTMLElement>("[data-fc-clock]");
    if (!el?.dataset.fit || !clock) return;
    setDigitWidth(clock);
    const room = (clock.parentElement?.clientWidth ?? el.clientWidth) * CLOCK_WIDTH;
    fitTo(clock, () => clock.scrollWidth, room, window.innerHeight * CLOCK_CAP);
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [variant, known]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const kind = (el.dataset.footerContact ?? "address") as FooterContactVariant;
      const rules = Array.from(el.querySelectorAll<HTMLElement>("[data-fc-rule]"));
      const softs = Array.from(el.querySelectorAll<HTMLElement>("[data-fc-soft]"));
      const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-fc-enter]"));
      const clockEl = el.querySelector<HTMLElement>("[data-fc-clock]");
      const head = el.querySelector<HTMLElement>("[data-fc-split]");
      const hSlide = el.querySelector<HTMLElement>("[data-fc-h]");
      const mSlide = el.querySelector<HTMLElement>("[data-fc-m]");
      const colonWrap = el.querySelector<HTMLElement>("[data-fc-colon-wrap]");

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        el.dataset.ready = "1";
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let alive = true;
        let split: SplitText | null = null;
        let lines: HTMLElement[] = [];
        let heights: number[] = [];
        let hW = 0;
        let mW = 0;
        // Where each part comes into view, as scroll progress over the footer's arrival (its offset / the height),
        // and how far right it stands (0 to 1), so every move starts once its part is on screen.
        let charAt: number[] = [];
        let charX: number[] = [];
        let charH = 0;
        let softAt: number[] = [];
        let softX: number[] = [];
        let ruleAt: number[] = [];
        let ruleX: number[] = [];
        let clockAt = 0;
        const prog = { p: 0 };

        const measure = () => {
          hW = hSlide?.parentElement?.offsetWidth ?? 0;
          mW = mSlide?.parentElement?.offsetWidth ?? 0;
          if (lines.length) heights = lines.map((l) => l.offsetHeight);
          const H = el.offsetHeight || 1;
          const box = el.getBoundingClientRect();
          const at = (n: HTMLElement) => offsetIn(n, el) / H;
          const x = (n: HTMLElement) => clamp01((n.getBoundingClientRect().left - box.left) / (box.width || 1));
          softAt = softs.map(at);
          softX = softs.map(x);
          ruleAt = rules.map(at);
          ruleX = rules.map(x);
          clockAt = clockEl ? at(clockEl) : 0;
          // The characters stagger across the address's own width, so two lines on a phone stagger by column.
          const host = chars[0]?.closest<HTMLElement>("[data-fc-address]")?.getBoundingClientRect();
          charAt = chars.map(at);
          charX = chars.map((c) => {
            const b = c.getBoundingClientRect();
            return host ? clamp01((b.left + b.width / 2 - host.left) / (host.width || 1)) : 0;
          });
          charH = chars[0]?.offsetHeight ?? 0;
        };

        const rise = (items: HTMLElement[], hs: number[], from: number, to: number, span: number) => {
          const spans = windows(items.length, from, to, span);
          items.forEach((it, i) => {
            const e = out3(within(prog.p, spans[i][0], spans[i][1]));
            it.style.transform = `translate3d(0, ${Math.round((1 - e) * (hs[i] ?? 0) * 1.08)}px, 0)`;
          });
        };
        const draw = (from: number, to: number) => {
          const spans = windows(rules.length, from, to, 0.75);
          rules.forEach((r, i) => {
            r.style.transform = `scaleX(${inOut2(within(prog.p, spans[i][0], spans[i][1])).toFixed(4)})`;
          });
        };
        const soften = (from: number, to: number) => {
          const spans = windows(softs.length, from, to, 0.6);
          softs.forEach((s, i) => {
            const e = out2(within(prog.p, spans[i][0], spans[i][1]));
            s.style.transform = `translate3d(0, ${Math.round((1 - e) * SOFT)}px, 0)`;
            s.style.opacity = e.toFixed(3);
          });
        };

        // Rules and details each from where they come into view.
        const drawOwn = () => {
          rules.forEach((r, i) => {
            const [a, b] = ownWindow(ruleAt[i] ?? 0, ruleX[i] ?? 0);
            r.style.transform = `scaleX(${inOut2(within(prog.p, a, b)).toFixed(4)})`;
          });
        };
        const softenOwn = () => {
          softs.forEach((s, i) => {
            const [a, b] = ownWindow(softAt[i] ?? 0, softX[i] ?? 0);
            const e = out2(within(prog.p, a, b));
            s.style.transform = `translate3d(0, ${Math.round((1 - e) * SOFT)}px, 0)`;
            s.style.opacity = e.toFixed(3);
          });
        };

        const paint = () => {
          if (!alive) return;
          if (kind === "address") {
            // Every character rolls up into its slot from blank, starting once its line is on screen and running
            // left to right across the width; the last one lands just before the footer's foot reaches the edge.
            chars.forEach((c, i) => {
              const from = (charAt[i] ?? 0) + 0.03;
              const len = Math.min(1, Math.max(0.92, from + 0.25)) - from;
              const s = from + (charX[i] ?? 0) * len * 0.5;
              const e = out3(within(prog.p, s, s + len * 0.5));
              c.style.transform = `translate3d(0, ${Math.round((1 - e) * charH)}px, 0)`;
            });
            drawOwn();
            softenOwn();
          } else if (kind === "clock") {
            const p0 = clockAt;
            if (colonWrap) colonWrap.style.opacity = out2(within(prog.p, p0, p0 + 0.1)).toFixed(3);
            // The hours slide out from behind the colon to the left, the minutes to the right.
            const e = out3(within(prog.p, p0 + 0.05, Math.min(1, Math.max(0.8, p0 + 0.35))));
            if (hSlide) hSlide.style.transform = `translate3d(${Math.round((1 - e) * hW)}px, 0, 0)`;
            if (mSlide) mSlide.style.transform = `translate3d(${-Math.round((1 - e) * mW)}px, 0, 0)`;
            drawOwn();
            softenOwn();
          } else {
            rise(lines, heights, 0.02, 0.5, 0.7);
            draw(0.3, 0.7);
            soften(0.4, 1);
          }
        };

        gsap.to(prog, {
          p: 1,
          ease: "none",
          onUpdate: paint,
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom bottom", scrub: SMOOTH },
        });
        const remeasure = () => {
          measure();
          paint();
        };
        ScrollTrigger.addEventListener("refresh", remeasure);
        measure();

        if (kind === "columns" && head) {
          // The closing line is cut with the face it is read in; until then it stays unseen (the CSS gate).
          faceReady().then(() => {
            if (!alive) return;
            split = SplitText.create(head, {
              type: "lines",
              mask: "lines",
              linesClass: "struq-line",
              autoSplit: true,
              onSplit(self) {
                lines = self.lines as HTMLElement[];
                heights = lines.map((l) => l.offsetHeight);
                paint();
              },
            });
            el.dataset.ready = "1";
          });
          paint();
        } else {
          paint();
          el.dataset.ready = "1";
        }

        return () => {
          alive = false;
          ScrollTrigger.removeEventListener("refresh", remeasure);
          split?.revert();
          for (const n of [...rules, ...softs, ...chars, hSlide, mSlide, colonWrap]) {
            if (!n) continue;
            n.style.transform = "";
            n.style.opacity = "";
          }
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [variant] },
  );

  const time = wall ? `${wall.hh}:${wall.mm}` : "";
  const telLink = <DrawLink href={phone.href}>{phone.label}</DrawLink>;
  const linkList = (cls: string) => (
    <ul className={cls}>
      {links.map((l) => (
        <li key={l.href}>
          <DrawLink href={l.href}>{l.label}</DrawLink>
        </li>
      ))}
    </ul>
  );

  if (variant === "clock") {
    const digits = (s: string) => Array.from(s).map((c, i) => <Digit key={i} ch={c} />);
    // The mail address leads as a full-width row; the phone, the address and the hours stand beneath it.
    const rows: { label: string; value: ReactNode }[] = [
      { label: "Bel", value: telLink },
      { label: "Adres", value: oneLine(address) },
      { label: "Open", value: hoursText(hours) },
    ];
    const row = (label: string, value: ReactNode, valueClass = "text-body") => (
      <div key={label} className="relative grid grid-cols-[5.5rem_1fr] items-baseline gap-x-6 py-4 md:grid-cols-[7rem_1fr]">
        <span aria-hidden data-fc-rule="" className="absolute inset-x-0 top-0 h-px bg-line" />
        <span data-fc-soft="" className="text-small text-ink-muted">
          {label}
        </span>
        <div data-fc-soft="" className={`min-w-0 ${valueClass}`}>
          {value}
        </div>
      </div>
    );
    return (
      <footer
        ref={root}
        data-footer-contact="clock"
        className={`relative flex min-h-svh flex-col bg-surface-0 px-sheet-margin pb-6 pt-16 text-ink md:pt-[10svh] ${className}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-4 text-body">
          <p data-fc-soft="">{clock ? `${studio}, ${city}` : studio}</p>
          {clock ? (
            <p data-fc-soft="" className="text-ink-muted">
              <OpenMark status={status} />
            </p>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-[8svh]">
          {clock ? (
            <p className="relative w-full text-center">
              <span className="sr-only">{wall ? `Het is nu ${time} in ${city}.` : `De tijd in ${city}.`}</span>
              <span aria-hidden data-fc-clock="" data-pending={known ? undefined : ""} className="font-display">
                <span data-fc-hmask="">
                  <span data-fc-h="" className="block">
                    {known ? digits(wall.hh) : "00"}
                  </span>
                </span>
                <span data-fc-colon-wrap="">
                  <span ref={colon} data-fc-colon="">
                    :
                  </span>
                </span>
                <span data-fc-mmask="">
                  <span data-fc-m="" className="block">
                    {known ? digits(wall.mm) : "00"}
                  </span>
                </span>
              </span>
              <noscript>
                <span className="block font-display text-h2">{hoursText(hours)}</span>
              </noscript>
            </p>
          ) : (
            // Without the clock the city holds the centre at display size, sliding out of its mask as the hours do.
            <p className="relative w-full text-center">
              <span className="sr-only">{city}</span>
              <span aria-hidden data-fc-clock="" className="font-display">
                <span data-fc-hmask="">
                  <span data-fc-h="" className="block">
                    {city}
                  </span>
                </span>
              </span>
            </p>
          )}
          <p data-fc-soft="" hidden={!clock} className="mt-4 text-body text-ink-muted">
            <span data-fc-fade="" data-pending={known ? undefined : ""}>{wall ? cap(wall.date) : " "}</span>
          </p>
        </div>

        {row("Mail", <RollAddress email={email} parts={halves} className="font-display" />, "text-h3")}
        <div className="grid md:grid-cols-3 md:gap-x-[3vw]">{rows.map((r) => row(r.label, r.value))}</div>
        <div className="relative mt-2 flex flex-col gap-3 pt-4 text-small text-ink-muted md:flex-row md:items-baseline md:justify-between">
          <span aria-hidden data-fc-rule="" className="absolute inset-x-0 top-0 h-px bg-line" />
          <p data-fc-soft="">{foot}</p>
          <div data-fc-soft="">{linkList("flex flex-wrap gap-x-6 gap-y-2 text-ink")}</div>
        </div>
      </footer>
    );
  }

  if (variant === "columns") {
    return (
      <footer
        ref={root}
        data-footer-contact="columns"
        className={`relative bg-surface-0 px-sheet-margin pb-6 pt-[14svh] text-ink md:pt-[18svh] ${className}`}
      >
        <h2 data-fc-split="" className="font-display max-w-[13ch] text-display">
          {line}
        </h2>
        <div className="relative mt-[10svh] grid gap-10 pt-8 md:grid-cols-12 md:gap-x-[2vw]">
          <span aria-hidden data-fc-rule="" className="absolute inset-x-0 top-0 h-px bg-line" />
          <div data-fc-soft="" className="md:col-span-5">
            <h3 className="text-small text-ink-muted">Contact</h3>
            <p className="mt-4">
              <DrawLink href={`mailto:${email}`} className="text-h3 font-display">
                {email}
              </DrawLink>
            </p>
            <p className="mt-3 text-body">{telLink}</p>
          </div>
          <div data-fc-soft="" className="md:col-span-4 md:col-start-7">
            <h3 className="text-small text-ink-muted">Studio</h3>
            <address className="mt-4 text-body not-italic">
              {address.map((a) => (
                <span key={a} className="block">
                  {a}
                </span>
              ))}
            </address>
            <p className="mt-4 text-body">
              <CityTime city={city} wall={wall} clock={clock} />
            </p>
            {clock ? (
              <p className="mt-1 text-small text-ink-muted">
                <OpenMark status={status} />
              </p>
            ) : null}
          </div>
          <div data-fc-soft="" className="md:col-span-2 md:col-start-11">
            <h3 className="text-small text-ink-muted">Volg ons</h3>
            {linkList("mt-4 flex flex-col gap-1 text-body")}
          </div>
        </div>
        <div className="mt-[12svh] flex flex-col gap-2 text-small text-ink-muted md:flex-row md:justify-between">
          <p data-fc-soft="">{foot}</p>
          <p data-fc-soft="">{hoursText(hours)}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer
      ref={root}
      data-footer-contact="address"
      className={`relative bg-surface-0 px-sheet-margin pb-6 pt-[14svh] text-ink ${className}`}
    >
      <div>
        <RollAddress email={email} parts={halves} enter className="font-display" />
      </div>
      <div className="relative mt-[12svh] flex flex-wrap items-baseline gap-x-8 gap-y-2 pt-5 text-small text-ink-muted md:justify-between">
        <span aria-hidden data-fc-rule="" className="absolute inset-x-0 top-0 h-px bg-line" />
        <p data-fc-soft="" className="text-ink">
          {telLink}
        </p>
        <p data-fc-soft="">{oneLine(address)}</p>
        <p data-fc-soft="" className="flex flex-wrap gap-x-4">
          <CityTime city={city} wall={wall} clock={clock} />
          {clock ? <OpenMark status={status} /> : <span>{hoursText(hours)}</span>}
        </p>
        <div data-fc-soft="">{linkList("flex gap-x-5 text-ink")}</div>
        <p data-fc-soft="">{foot}</p>
      </div>
    </footer>
  );
}
