"use client";
// header-bar (Struq header recipe): the bar a site wears on every screen when it shows its links
// The wordmark, three or four links and one quiet action as a text link. The bar has no ground on the first screen; once
// the page has scrolled it takes the ground of whatever is under it (the page's own surface, the inverse, or none over a
// photo), so it reads as a window onto the page, never as a coloured strip.
//
//   quiet   wordmark left, links right; each label rolls through its mask on hover, letter by letter. The bar hides
//           as the page scrolls down and returns as it scrolls up, scrubbed to the scroll with a short ease and
//           settling to fully shown or fully hidden when the scroll stops; a hairline appears once the page scrolls.
//   settle  on the first screen the wordmark is set large across the hero's top at a light weight, from the first
//           paint, rising out of its mask; the scroll shrinks it (scale geometric, path straight, whole pixels) into
//           its place in the bar, and the links fade in beside it as it lands (a phone's "Menu" stays). The ground
//           comes in only once it fits the bar. Scrolling back sets it large again. Hover draws a line from the side
//           the pointer came in.
//   split   three parts: wordmark left, the links centred, and the studio's place and live local time on the right;
//           one line glides under the hovered link, and a thin rule under the bar fills with the page's progress.
//
// The bar turns its ink with what is under it, exactly at the edge, per pixel: it is drawn three times (ink for the
// page ground, on-photo, on-inverse), each copy clipped to the stretches of the bar its own sections cover. Sections
// opt in with data-bar-tone="photo" or data-bar-tone="inverse" (the menu curtain's contract); anything else is ground.
// The real bar (the links) sits on top with transparent text: one focusable bar, never three. Hover and keyboard focus
// on a real link are mirrored onto the copies, so the focus ring is drawn in the right ink too.
//
// Mount it once at the top of the page; it is fixed and needs no wrapper:
//   <HeaderBar variant="quiet" name="Noord" links={[{ label: "Werk", href: "/werk" }]} startTone="photo"
//     action={{ label: "Plan een gesprek", href: "/contact" }} menuHref="#menu" />
// Keep the hero's type below var(--hb-top) (set on the nearest [data-blocks]: the bar's height, or for settle the
// bottom of the large wordmark). On phones the bar is the wordmark and one "Menu" link: pass onMenu to open a menu
// (the menu curtain's job) or menuHref to go to one.
//
// Lenis is never driven, only read: the bar follows the scroll the page already has. Reduced motion: no hiding and no
// travel (settle starts as the plain bar), the scrolled ground cuts in, and a hover underlines instead of rolling.
// Without JavaScript the plain bar stands in the start tone's ink, and nothing waits.
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type HTMLAttributes, type PointerEvent } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../kit/gsap";

export const HEADER_BAR_VARIANTS = [
  { id: "quiet", title: "De stille balk" },
  { id: "settle", title: "Het landende woordmerk" },
  { id: "split", title: "De gedeelde balk" },
] as const;
export type HeaderBarVariant = (typeof HEADER_BAR_VARIANTS)[number]["id"];

export type HeaderLink = { label: string; href: string };
export type BarTone = "ground" | "photo" | "inverse";

const TONES: BarTone[] = ["ground", "photo", "inverse"];
const TONE_INK: Record<BarTone, string> = { ground: "text-ink", photo: "text-on-photo", inverse: "text-on-inverse" };
// Over a photo the scrolled bar takes the palette's own dark for bands over photos (--photo-ground: the inverse on a
// light palette, the page ground on a dark one), nearly opaque, over a blur of what passes under it, so the hero's type
// runs under the bar quiet and soft and the band never reads as a letterbox beside the page.
const TONE_GROUND: Record<BarTone, string> = {
  ground: "bg-surface-0",
  photo: "bg-[color-mix(in_oklab,var(--photo-ground,var(--inverse))_88%,transparent)]",
  inverse: "bg-inverse",
};
const NONE = "polygon(0px 0px, 0px 0px, 0px 0px)";
/** The display face is waited for at most this long before the large wordmark is measured. */
const FONT_CAP = 800;

/**
 * settle: the wordmark's advance, estimated from its letters, so the CSS can set it large across the hero from the
 * first paint, before any script. The CSS reads it against the face actually on screen (half em, half ch, whose
 * errors run opposite ways between a narrow serif and a wide sans: about two percent on the lab's faces); the script
 * measures the real face and eases out what is left. Widths for a face of average width, tracking included.
 */
function advanceEm(text: string) {
  let w = 0;
  for (const c of Array.from(text)) {
    if (c === " ") w += 0.28;
    else if ("ijl.,'".includes(c)) w += 0.3;
    else if ("ftrI".includes(c)) w += 0.42;
    else if ("mMW".includes(c)) w += 0.95;
    else if (c === "w") w += 0.82;
    else if (c !== c.toLowerCase()) w += 0.8;
    else w += 0.63;
  }
  return Math.max(0.5, w - 0.02 * text.length);
}

type FaceProps = {
  real?: boolean;
  variant: HeaderBarVariant;
  name: string;
  homeHref: string;
  links: HeaderLink[];
  action?: HeaderLink;
  menuHref: string;
  onMenu?: () => void;
  place: string;
  time: string | null;
  /** The copy's ground, for the copies only. */
  tone?: BarTone;
  bind?: (i: number) => HTMLAttributes<HTMLElement>;
};

/** A label set letter by letter, each letter in its own mask with its copy waiting below (quiet's roll). */
function Letters({ text }: { text: string }) {
  return (
    <>
      {Array.from(text).map((c, k) => (
        <span key={k} data-hb-ch="" style={{ "--i": k } as CSSProperties}>
          <span>{c}</span>
          <span>{c}</span>
        </span>
      ))}
    </>
  );
}

/**
 * The bar's face. Drawn once for real (links, transparent text once the copies show) and as aria-hidden copies in every
 * ink, so all of them lay out alike to the pixel.
 */
function Face({ real = false, tone = "ground", variant, name, homeHref, links, action, menuHref, onMenu, place, time, bind }: FaceProps) {
  const n = links.length;
  const split = variant === "split";
  // Where the full bar starts: split needs the room for three parts.
  const wide = split ? "max-lg:hidden" : "max-md:hidden";
  const narrow = split ? "lg:hidden" : "md:hidden";
  const on = (i: number) => (real && bind ? bind(i) : {});

  const label = (text: string) =>
    variant === "quiet" ? (
      <>
        {real ? <span className="sr-only">{text}</span> : null}
        <span aria-hidden={real || undefined} data-hb-label="" className="inline-flex">
          <Letters text={text} />
        </span>
      </>
    ) : (
      <span data-hb-label="">{text}</span>
    );

  const link = (i: number, item: HeaderLink, isAction = false) => {
    const cls = `relative inline-flex whitespace-nowrap py-2 text-small leading-none ${isAction ? "ml-3" : ""}`;
    const flag = isAction ? { "data-hb-action": "" } : {};
    return real ? (
      <a href={item.href} data-hb-link={i} {...flag} className={cls} {...on(i)}>
        {label(item.label)}
      </a>
    ) : (
      <span data-hb-link={i} {...flag} className={cls}>
        {label(item.label)}
      </span>
    );
  };

  const word = (
    <span data-hb-wmask="" className="block">
      <span data-hb-wroll="" className="relative block">
        <span className="block">{name}</span>
        <span aria-hidden="true" className="absolute left-0 block">
          {name}
        </span>
      </span>
    </span>
  );
  const wordCls = "relative block origin-top-left font-display text-[1.375rem] leading-none tracking-[-0.02em] [justify-self:start]";

  const list = (
    <ul data-hb-list="" className={`relative m-0 flex list-none items-center p-0 ${split ? "gap-x-8" : "gap-x-7"}`}>
      {links.map((item, i) => (
        <li key={item.label}>{link(i, item)}</li>
      ))}
      {split ? <li aria-hidden="true" data-hb-mark="" className="pointer-events-none absolute left-0 h-px bg-current" /> : null}
    </ul>
  );
  const act = action ? link(n, action, true) : null;

  const menu = onMenu && real ? (
    <button type="button" data-hb-link={n + 1} onClick={onMenu} className="relative inline-flex cursor-pointer bg-transparent py-2 text-small leading-none" {...on(n + 1)}>
      {label("Menu")}
    </button>
  ) : (
    link(n + 1, { label: "Menu", href: menuHref })
  );

  const Nav = real ? "nav" : "div";

  return (
    <div
      data-hb-face=""
      className={`relative h-[var(--hb-h)] items-center gap-6 px-6 md:px-[3vw] ${split ? "grid grid-cols-[1fr_auto_1fr]" : "flex justify-between"}`}
    >
      {real ? null : <div data-hb-ground="" aria-hidden="true" className={`absolute inset-0 ${TONE_GROUND[tone]}`} />}
      {real ? (
        <a href={homeHref} data-hb-word="" data-hb-link="w" className={wordCls} {...on(-1)}>
          {word}
        </a>
      ) : (
        <span data-hb-word="" data-hb-link="w" className={wordCls}>
          {word}
        </span>
      )}

      {split ? (
        <>
          <Nav data-hb-fade="" {...(real ? { "aria-label": "Hoofdmenu" } : {})} className={`relative justify-self-center ${wide}`}>
            {list}
          </Nav>
          <div data-hb-fade="" className={`relative flex items-center gap-8 justify-self-end ${wide}`}>
            <span className="whitespace-nowrap text-small leading-none">
              <span data-hb-place="">{place}</span>{" "}
              <time data-hb-time="" data-pending={time ? undefined : ""} className="tabular-nums">
                {time ?? "00:00"}
              </time>
            </span>
            {act}
          </div>
        </>
      ) : (
        <Nav data-hb-fade="" {...(real ? { "aria-label": "Hoofdmenu" } : {})} className={`relative flex items-center gap-x-7 ${wide}`}>
          {list}
          {act}
        </Nav>
      )}
      <div className={`relative ${narrow} ${split ? "justify-self-end" : ""}`}>
        {menu}
      </div>

      {real ? null : variant === "split" ? (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px">
          <div data-hb-track="" className="absolute inset-0 bg-current" />
          <div data-hb-fill="" className="absolute inset-0 origin-left bg-current" style={{ transform: "scaleX(0)" }} />
        </div>
      ) : variant === "quiet" ? (
        <div data-hb-line="" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-current" />
      ) : null}
    </div>
  );
}

/** The studio's wall time: none on the server and the first paint, the real one after mount, kept on the minute. */
function useWallTime(on: boolean, timeZone: string) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    if (!on) return;
    const fmt = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
    let timer = 0;
    const tick = () => {
      const now = new Date();
      setTime(fmt.format(now));
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 40);
    };
    tick();
    // Timers in a background tab are held back; on return the time is set at once.
    const onShow = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [on, timeZone]);
  return time;
}

export function HeaderBar({
  variant = "quiet",
  name,
  homeHref = "/",
  links,
  action,
  menuHref = "#menu",
  onMenu,
  place = "Rotterdam",
  timeZone = "Europe/Amsterdam",
  startTone = "ground",
}: {
  variant?: HeaderBarVariant;
  /** The wordmark. */
  name: string;
  homeHref?: string;
  /** Three or four links. */
  links: HeaderLink[];
  /** The one quiet action, set as a text link after the links. */
  action?: HeaderLink;
  /** Where the phone's "Menu" link goes, when there is no onMenu. */
  menuHref?: string;
  /** Opens the site's menu (the menu curtain); the phone's "Menu" is then a button. */
  onMenu?: () => void;
  /** split: the place whose local time the bar keeps. */
  place?: string;
  timeZone?: string;
  /** The ground under the bar on the first paint, before the script measures it (the hero's, usually "photo"). */
  startTone?: BarTone;
}) {
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<{ hot: (i: number, on: boolean, from?: "left" | "right") => void; focus: (on: boolean) => void } | null>(null);
  const time = useWallTime(variant === "split", timeZone);

  const bind = (i: number) => ({
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "touch") return;
      const r = e.currentTarget.getBoundingClientRect();
      api.current?.hot(i, true, e.clientX < r.left + r.width / 2 ? "left" : "right");
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.currentTarget === document.activeElement && e.currentTarget.matches(":focus-visible")) return;
      const r = e.currentTarget.getBoundingClientRect();
      api.current?.hot(i, false, e.clientX < r.left + r.width / 2 ? "left" : "right");
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.matches(":focus-visible")) return;
      e.currentTarget.setAttribute("data-kb", "");
      api.current?.hot(i, true, "left");
      api.current?.focus(true);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      e.currentTarget.removeAttribute("data-kb");
      api.current?.hot(i, false, "right");
      api.current?.focus(false);
    },
  });

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const host = el.closest<HTMLElement>("[data-blocks]") ?? document.documentElement;

      const move = q("[data-hb-move]")[0] as HTMLElement;
      const copies = TONES.map((t) => q(`[data-hb-copy="${t}"]`)[0] as HTMLElement);
      const realFace = q("[data-hb-real] [data-hb-face]")[0] as HTMLElement;
      const realWord = q("[data-hb-real] [data-hb-word]")[0] as HTMLElement;
      const words = q("[data-hb-word]");
      const fades = q("[data-hb-fade]");
      const fills = q("[data-hb-fill]");
      const blur = q("[data-hb-blur]")[0] as HTMLElement | undefined;
      if (!move || !realFace || !realWord) return;

      let barH = realFace.offsetHeight;
      let maxY = 1;
      // settle: the large wordmark's scale, its two tops and the stretch of scroll it lands over
      let S = 1;
      let smallTop = 0;
      let bigTop = 0;
      let wordH = 0;
      let D = 1;
      // settle: the scroll at which the shrinking wordmark first fits inside the bar; the ground waits for it.
      let yFit = 0;
      // settle: the scale shown on the first screen, eased from the CSS estimate to the measured S once.
      const fit = { s: 1 };
      let fitTw: gsap.core.Tween | null = null;
      let measured = variant !== "settle" || reduce;

      // quiet: how far the bar is pushed up, wished (aim) and shown (o, eased toward the wish)
      let aim = 0;
      const shown = { o: 0 };
      let lastY = window.scrollY;
      let focusIn = false;
      let rest = 0;

      const measure = () => {
        barH = realFace.offsetHeight;
        maxY = Math.max(1, ScrollTrigger.maxScroll(window));
        if (variant !== "settle") {
          host.style.setProperty("--hb-top", `${barH}px`);
          return;
        }
        const left = realWord.offsetLeft;
        smallTop = realWord.offsetTop;
        wordH = realWord.offsetHeight;
        const wordW = realWord.offsetWidth;
        if (reduce || !wordW || !wordH) {
          fitTw?.kill();
          S = 1;
          fit.s = 1;
          yFit = 0;
          host.style.setProperty("--hb-top", `${barH}px`);
          return;
        }
        // Across the hero's top, from gutter to gutter, but never taller than about four tenths of the screen.
        S = Math.max(1, Math.min((window.innerWidth - 2 * left) / wordW, (window.innerHeight * 0.55) / wordH));
        // A refresh while the first-paint estimate is still easing in carries the ease on to the new size, never a cut.
        if (fitTw?.isActive()) {
          fitTw.kill();
          fitTw = gsap.to(fit, { s: S, duration: 0.45, ease: "power2.out", onUpdate: paint });
        } else fit.s = S;
        bigTop = Math.round(barH * 0.5);
        D = Math.max(barH, Math.round(bigTop + S * wordH - barH));
        // The wordmark's bottom shrinks with the scroll; find where it first sits inside the bar's own height.
        const bottom = (p: number) => smallTop + (bigTop - smallTop) * (1 - p) + Math.pow(S, 1 - p) * wordH;
        let lo = 0;
        let hi = 1;
        if (bottom(0) <= barH) hi = 0;
        else
          for (let i = 0; i < 24; i += 1) {
            const mid = (lo + hi) / 2;
            if (bottom(mid) > barH) lo = mid;
            else hi = mid;
          }
        yFit = Math.round(hi * D);
        host.style.setProperty("--hb-top", `${Math.round(bigTop + S * wordH + barH * 0.25)}px`);
      };

      // --- the ink, cut where the sections under the bar meet, in the bar's own coordinates ---
      const ink = (o: number, extent: number) => {
        const segs: Array<[number, number, BarTone]> = [[0, extent, "ground"]];
        document.querySelectorAll<HTMLElement>("[data-bar-tone]").forEach((sec) => {
          const tone = sec.dataset.barTone;
          if ((tone !== "photo" && tone !== "inverse") || el.contains(sec)) return;
          const r = sec.getBoundingClientRect();
          const a = Math.max(0, r.top + o);
          const b = Math.min(extent, r.bottom + o);
          if (b <= a) return;
          // Later sections in document order (the nested ones) paint over earlier ones.
          for (let k = segs.length - 1; k >= 0; k -= 1) {
            const [s0, s1, t] = segs[k];
            if (s1 <= a || s0 >= b) continue;
            const parts: Array<[number, number, BarTone]> = [];
            if (s0 < a) parts.push([s0, a, t]);
            parts.push([Math.max(s0, a), Math.min(s1, b), tone]);
            if (s1 > b) parts.push([b, s1, t]);
            segs.splice(k, 1, ...parts);
          }
        });
        TONES.forEach((tone, i) => {
          const pts: string[] = [];
          for (const [a, b, t] of segs) {
            if (t !== tone || b - a <= 0) continue;
            pts.push(`0px ${a}px`, `100% ${a}px`, `100% ${b}px`, `0px ${b}px`);
          }
          copies[i].style.clipPath = pts.length ? `polygon(${pts.join(", ")})` : NONE;
        });
        // The blur sits under the copies (a clipped copy would blur nothing), cut to the photo's stretches like its ink.
        if (blur) blur.style.clipPath = copies[1].style.clipPath;
      };

      const paint = () => {
        const y = Math.max(0, window.scrollY);
        let o = 0;
        let extent = barH + 1;

        if (variant === "quiet") {
          o = shown.o;
          move.style.transform = `translate3d(0, ${-Math.round(o)}px, 0)`;
        }

        if (variant === "settle" && measured) {
          const p = fit.s > 1 ? Math.min(1, y / D) : 1;
          const s = Math.pow(fit.s, 1 - p);
          const dy = Math.round((bigTop - smallTop) * (1 - p));
          const tf = p >= 1 ? "" : `translate3d(0, ${dy}px, 0) scale(${s.toFixed(5)})`;
          words.forEach((w) => (w.style.transform = tf));
          extent = Math.max(extent, smallTop + dy + s * wordH + 8);
          // The links arrive over the last quarter of the landing; a link in focus is always shown.
          const a = focusIn ? 1 : Math.min(1, Math.max(0, (p - 0.72) / 0.28));
          const lift = Math.round((1 - a) * 6);
          fades.forEach((f) => {
            f.style.opacity = String(a);
            f.style.transform = lift ? `translate3d(0, ${lift}px, 0)` : "";
          });
          el.toggleAttribute("data-links-off", a < 0.5);
        }

        if (variant === "split") {
          const prog = Math.min(1, y / maxY);
          fills.forEach((f) => (f.style.transform = `scaleX(${prog.toFixed(4)})`));
        }

        // The scrolled state (the ground under the bar, quiet's hairline) arrives over the bar's own height of scroll;
        // settle's only once the wordmark fits inside the bar, and it is gone again before the wordmark grows out of it.
        const from = variant === "settle" && S > 1 ? yFit : 0;
        const k = reduce ? (y > 2 ? 1 : 0) : Math.min(1, Math.max(0, (y - from) / barH));
        el.style.setProperty("--hb-k", k.toFixed(3));
        ink(o, extent);
      };

      // quiet: the wish follows the scroll pixel for pixel, the bar eases after it; at rest it settles to a side.
      let tw: gsap.core.Tween | null = null;
      const ease = (to: number, duration: number) => {
        tw?.kill();
        tw = gsap.to(shown, { o: to, duration, ease: "power3.out", onUpdate: paint });
      };
      const settleTo = (to: number) => {
        aim = to;
        ease(to, 0.32);
      };
      const onScroll = () => {
        const y = Math.max(0, window.scrollY);
        const dy = y - lastY;
        lastY = y;
        if (dy === 0) return;
        if (variant === "quiet" && !reduce) {
          const cap = Math.min(barH + 1, y);
          aim = focusIn ? 0 : Math.min(cap, Math.max(0, aim + dy));
          if (Math.abs(aim - shown.o) > 0.01) ease(aim, 0.18);
          window.clearTimeout(rest);
          rest = window.setTimeout(() => {
            if (aim > 0 && aim < barH + 1) settleTo(aim > (barH + 1) / 2 ? Math.min(barH + 1, window.scrollY) : 0);
          }, 160);
        }
        paint();
      };

      // On Lenis this runs inside its scroll (ScrollTrigger.update), so the bar never trails the page by a frame.
      const watch = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: onScroll,
        onRefresh: () => {
          measure();
          paint();
        },
      });
      window.addEventListener("scroll", onScroll, { passive: true });

      // --- hover and focus, mirrored onto every copy ---
      const linksOf = (i: number) => q(`[data-hb-link="${i < 0 ? "w" : i}"]`);
      let hotCount = 0;
      let markOn = false;
      const hot = (i: number, on: boolean, from: "left" | "right" = "left") => {
        const els = linksOf(i);
        const was = els[0]?.hasAttribute("data-hot") ?? false;
        if (was === on) return;
        hotCount = Math.max(0, hotCount + (on ? 1 : -1));
        els.forEach((a) => {
          a.style.setProperty("--hb-o", from);
          a.toggleAttribute("data-hot", on);
        });
        el.toggleAttribute("data-hot-any", hotCount > 0);
        if (variant === "split" && i >= 0 && i < links.length) {
          if (on) {
            const a = els[els.length - 1];
            const realLink = q(`[data-hb-real] [data-hb-link="${i}"]`)[0] as HTMLElement | undefined;
            const src = realLink ?? a;
            if (!markOn) {
              el.setAttribute("data-mark-snap", "");
              requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute("data-mark-snap")));
            }
            el.style.setProperty("--hb-mx", `${src.offsetLeft}px`);
            el.style.setProperty("--hb-mw", `${src.offsetWidth}px`);
            el.setAttribute("data-mark", "");
            markOn = true;
          } else {
            // Leaving one link for the next keeps the line; leaving the list lets it go.
            window.setTimeout(() => {
              if (!q("[data-hb-real] [data-hb-list] [data-hot]").length) {
                el.removeAttribute("data-mark");
                markOn = false;
              }
            }, 60);
          }
        }
      };
      const focus = (on: boolean) => {
        // Mirror the keyboard's ring.
        q("[data-hb-link][data-focus]").forEach((a) => a.removeAttribute("data-focus"));
        const cur = document.activeElement;
        if (on && cur instanceof HTMLElement && el.contains(cur)) {
          const id = cur.getAttribute("data-hb-link");
          if (id !== null) q(`[data-hb-link="${id}"]`).forEach((a) => a.setAttribute("data-focus", ""));
        }
      };
      api.current = { hot, focus };

      const real = q("[data-hb-real]")[0] as HTMLElement;
      const onFocusIn = () => {
        focusIn = true;
        if (variant === "quiet") settleTo(0);
        paint();
      };
      const onFocusOut = (e: globalThis.FocusEvent) => {
        if (e.relatedTarget instanceof Node && real.contains(e.relatedTarget)) return;
        focusIn = false;
        paint();
      };
      real.addEventListener("focusin", onFocusIn);
      real.addEventListener("focusout", onFocusOut);

      const onResize = () => {
        measure();
        paint();
      };
      window.addEventListener("resize", onResize);

      // --- start: settle's large wordmark already stands from the first paint at the CSS estimate (its scale from the
      // estimated advance); the script waits for the display face (capped), measures the real width and eases the
      // estimate into it, a few pixels, while the wordmark is still rising into view. ---
      let alive = true;
      const start = () => {
        if (!alive) return;
        const shownScale = variant === "settle" ? parseFloat(getComputedStyle(realWord).scale) : NaN;
        measure();
        measured = true;
        lastY = window.scrollY;
        const target = fit.s;
        if (variant === "settle" && !reduce && target > 1 && shownScale > 1 && Math.abs(shownScale - target) > 0.001) {
          fit.s = shownScale;
          fitTw = gsap.to(fit, { s: target, duration: 0.6, ease: "power2.out", onUpdate: paint });
        }
        paint();
        el.setAttribute("data-ready", "");
      };
      if (variant === "settle" && !reduce) {
        const fonts = document.fonts?.ready ?? Promise.resolve();
        Promise.race([fonts, new Promise((res) => window.setTimeout(res, FONT_CAP))]).then(start);
      } else start();

      return () => {
        alive = false;
        fitTw?.kill();
        tw?.kill();
        watch.kill();
        window.clearTimeout(rest);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        real.removeEventListener("focusin", onFocusIn);
        real.removeEventListener("focusout", onFocusOut);
        host.style.removeProperty("--hb-top");
        api.current = null;
      };
    },
    { scope: root, dependencies: [variant, links.length] },
  );

  const face = { variant, name, homeHref, links, action, menuHref, onMenu, place, time };

  return (
    <div ref={root} data-header-bar={variant} data-start={startTone} style={{ "--hb-adv": advanceEm(name).toFixed(3) } as CSSProperties}>
      <div data-hb-move="" className="pointer-events-none fixed inset-x-0 top-0 z-[70]">
        {/* Over a photo the scrolled ground is see-through at its edge: what passes under it is blurred, not sharp. */}
        <div
          aria-hidden="true"
          data-hb-blur=""
          className="absolute inset-x-0 top-0 h-[var(--hb-h)] backdrop-blur-md"
          style={{ clipPath: startTone === "photo" ? "none" : NONE }}
        />
        {/* The bar's ink over the page: one copy per ground, each clipped to the stretches it covers. */}
        {TONES.map((tone) => (
          <div
            key={tone}
            aria-hidden="true"
            data-hb-copy={tone}
            className={`absolute inset-x-0 top-0 ${TONE_INK[tone]}`}
            style={{ clipPath: tone === startTone ? "none" : NONE }}
          >
            <Face {...face} tone={tone} />
          </div>
        ))}
        {/* The real bar: the links, on top, their ink drawn by the copies under them once those show. */}
        <header data-hb-real="" className={`relative ${TONE_INK[startTone]}`}>
          <Face {...face} real bind={bind} />
        </header>
      </div>
    </div>
  );
}
