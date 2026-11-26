"use client";
// header-bar (Struq header recipe): the bar a site wears on every screen when it shows its links
// The wordmark, three or four links and one quiet action as a text link. The bar has no ground on the first screen; once
// the page has scrolled it takes a solid ground in the tone of whatever is under it (the page's own surface, the
// inverse, or the photo band's dark), so body text never runs through its ink and it still reads as part of the page.
//
//   quiet   wordmark left, links right; each label rolls through its mask on hover, letter by letter. The bar hides
//           as the page scrolls down and returns as it scrolls up, scrubbed to the scroll with a short ease and
//           settling to fully shown or fully hidden when the scroll stops; a hairline appears once the page scrolls.
//   settle  on the first screen the wordmark is set large across the hero's top at a light weight, from the first
//           paint, rising out of its mask; the scroll shrinks it (scale geometric, path straight, whole pixels) into
//           its place in the bar, and the links fade in beside it as it lands (a phone's "Menu" stays). The ground
//           comes in only once it fits the bar. Scrolling back sets it large again. Hover draws a line from the side
//           the pointer came in.
//   split   three parts: wordmark left, the links centred, and the studio's place on the right (with `clock`, its live
//           local time beside it); one line glides under the hovered link, and a thin rule under the bar fills with
//           the page's progress. The clock is off unless asked: one live clock per site at most.
//
// The bar turns its ink with what is under it, exactly at the edge, per pixel: it is drawn three times (ink for the
// page ground, on-photo, on-inverse), each copy clipped to the stretches of the bar its own sections cover. Sections
// opt in with data-bar-tone="photo" or data-bar-tone="inverse" (the menu curtain's contract); anything else is ground.
// Mark a section "photo" only where a photo really runs under the bar's band (a full-bleed hero); a poster or a framed
// photo with ground above it is ground. The start tone is read from the page too, never passed: before the script,
// the first section's data-bar-tone (the element right after the bar, or that element's first child) sets the ink.
// Over a "photo" section the bar reads the photo itself (kit/photo-read): the band of the photo under the bar, with
// any data-veil over it and the bar's own ground at the strength it has come in, is held against each ink, and the
// on-photo ink stays while it keeps 3:1; over a bright window the bar takes the ink (and the scrolled ground) that
// reads instead, and keeps it while that still holds 3:1, so it never flickers. A photo that cannot be read (not
// loaded yet, another origin) keeps the declared tone. No scrim is ever added for it.
// The real bar (the links) sits on top with transparent text: one focusable bar, never three. Hover and keyboard focus
// on a real link are mirrored onto the copies, so the focus ring is drawn in the right ink too.
//
// Mount it once at the top of the page, right before the first section; it is fixed and needs no wrapper:
//   <HeaderBar variant="quiet" name="Noord" links={[{ label: "Werk", href: "/werk" }]}
//     action={{ label: "Plan een gesprek", href: "/contact" }} menuHref="#menu" />
// Keep the hero's type below var(--hb-top) (set on the nearest [data-blocks]: the bar's height, or for settle the
// bottom of the large wordmark). On phones the bar is the wordmark and one "Menu" link: pass onMenu to open a menu
// (the menu curtain's job) or menuHref to go to one.
//
// Lenis is never driven, only read: the bar follows the scroll the page already has. Reduced motion: no hiding and no
// travel (settle starts as the plain bar), the scrolled ground cuts in, and a hover underlines instead of rolling.
// Without JavaScript the plain bar stands in the start tone's ink, and nothing waits.
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type HTMLAttributes, type PointerEvent } from "react";
import { feel } from "../kit/feel";
import { gsap, ScrollTrigger, useGSAP } from "../kit/gsap";
import { photoLuminances } from "../kit/photo-read";
import { scrubIn, timeIn } from "../kit/tempo";

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
// Once the page scrolls the bar stands on a solid ground, so nothing that passes under it ever prints through its ink:
// the page's own surface, the inverse, and over a photo the palette's own dark for bands over photos (--photo-ground:
// the inverse on a light palette, the page ground on a dark one). Never a blur, a see-through tint or a shadow.
const TONE_GROUND: Record<BarTone, string> = {
  ground: "bg-surface-0",
  photo: "bg-[var(--photo-ground,var(--inverse))]",
  inverse: "bg-inverse",
};
const NONE = "polygon(0px 0px, 0px 0px, 0px 0px)";
/** The display face is waited for at most this long before the large wordmark is measured. */
const FONT_CAP = 800;
/** The wordmark and the links against what is under them over a photo: at least this much. */
const PHOTO_RATIO = 3;

const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const encode = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
/** A layer of luminance `top` at opacity `a` over `under`, composited in sRGB as the browser does. */
const over = (under: number, top: number, a: number) => linear(encode(under) * (1 - a) + encode(top) * a);

/** Any CSS colour's relative luminance and alpha, through a one-pixel canvas so every colour syntax resolves. */
const colours = new Map<string, { y: number; a: number }>();
function colourOf(css: string) {
  const kept = colours.get(css);
  if (kept) return kept;
  let out = { y: 0, a: 0 };
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (ctx) {
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    out = { y: 0.2126 * linear(r / 255) + 0.7152 * linear(g / 255) + 0.0722 * linear(b / 255), a: a / 255 };
  }
  colours.set(css, out);
  return out;
}

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
  menuLabel: string;
  navLabel: string;
  onMenu?: () => void;
  place: string;
  clock: boolean;
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
        <span key={k} data-hb-ch="" className="struq-char-mask" style={{ "--i": k } as CSSProperties}>
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
function Face({ real = false, tone = "ground", variant, name, homeHref, links, action, menuHref, menuLabel, navLabel, onMenu, place, clock, time, bind }: FaceProps) {
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

  const link = (i: number, item: HeaderLink, isAction = false, extra = "") => {
    const cls = `relative inline-flex whitespace-nowrap py-2 text-small leading-none ${isAction ? "ml-3" : ""} ${extra}`;
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
    <span data-hb-wmask="" className="struq-line-mask block">
      <span data-hb-wroll="" className="relative block">
        <span className="block">{name}</span>
        <span aria-hidden="true" className="absolute left-0 block">
          {name}
        </span>
      </span>
    </span>
  );
  // The menu is a phone visitor's way round the page: a 44px hit area, the word centred in it.
  const TAP = "min-h-11 min-w-11 items-center justify-center";
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
    <button type="button" data-hb-link={n + 1} onClick={onMenu} className={`relative inline-flex cursor-pointer bg-transparent py-2 text-small leading-none ${TAP}`} {...on(n + 1)}>
      {label(menuLabel)}
    </button>
  ) : (
    link(n + 1, { label: menuLabel, href: menuHref }, false, TAP)
  );

  const Nav = real ? "nav" : "div";

  return (
    <div
      data-hb-face=""
      className={`relative h-[var(--hb-h)] items-center gap-6 px-sheet-margin ${split ? "grid grid-cols-[1fr_auto_1fr]" : "flex justify-between"}`}
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
          <Nav data-hb-fade="" {...(real ? { "aria-label": navLabel } : {})} className={`relative justify-self-center ${wide}`}>
            {list}
          </Nav>
          <div data-hb-fade="" className={`relative flex items-center gap-8 justify-self-end ${wide}`}>
            <span className="whitespace-nowrap text-small leading-none">
              <span data-hb-place="">{place}</span>
              {clock ? (
                <>
                  {" "}
                  <time data-hb-time="" data-pending={time ? undefined : ""} className="tabular-nums">
                    {time ?? "00:00"}
                  </time>
                </>
              ) : null}
            </span>
            {act}
          </div>
        </>
      ) : (
        <Nav data-hb-fade="" {...(real ? { "aria-label": navLabel } : {})} className={`relative flex items-center gap-x-7 ${wide}`}>
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
  menuLabel = "Menu",
  navLabel = "Hoofdmenu",
  onMenu,
  place = "Rotterdam",
  clock = false,
  timeZone = "Europe/Amsterdam",
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
  /** The phone menu link's label, in the site's language. */
  menuLabel?: string;
  /** The nav's accessible name, in the site's language. */
  navLabel?: string;
  /** Opens the site's menu (the menu curtain); the phone's "Menu" is then a button. */
  onMenu?: () => void;
  /** split: the studio's place, on the right of the bar. */
  place?: string;
  /** split: the place's live local time beside it. Off unless asked: one live clock per site at most. */
  clock?: boolean;
  /** IANA zone for the clock. */
  timeZone?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<{ hot: (i: number, on: boolean, from?: "left" | "right") => void; focus: (on: boolean) => void } | null>(null);
  const time = useWallTime(variant === "split" && clock, timeZone);

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
      const mood = feel(el);
      const host = el.closest<HTMLElement>("[data-blocks]") ?? document.documentElement;

      const move = q("[data-hb-move]")[0] as HTMLElement;
      const copies = TONES.map((t) => q(`[data-hb-copy="${t}"]`)[0] as HTMLElement);
      const realFace = q("[data-hb-real] [data-hb-face]")[0] as HTMLElement;
      const realWord = q("[data-hb-real] [data-hb-word]")[0] as HTMLElement;
      const words = q("[data-hb-word]");
      const fades = q("[data-hb-fade]");
      const fills = q("[data-hb-fill]");
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
          fitTw = gsap.to(fit, { s: S, duration: timeIn(mood, 0.45), ease: "power2.out", onUpdate: paint });
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

      // --- over a photo: the ink the photo under the bar asks for ---
      // Each copy's ink and its scrolled ground, as the page resolves them.
      const inkY = {} as Record<BarTone, number>;
      const groundY = {} as Record<BarTone, number>;
      const readInks = () => {
        TONES.forEach((t, i) => {
          inkY[t] = colourOf(getComputedStyle(copies[i]).color).y;
          const g = copies[i].querySelector<HTMLElement>("[data-hb-ground]");
          groundY[t] = g ? colourOf(getComputedStyle(g).backgroundColor).y : inkY[t];
        });
      };
      // The last pick per photo section: kept while it still holds, so a band near the line never flickers.
      const picked = new WeakMap<HTMLElement, BarTone>();
      const photoTone = (sec: HTMLElement, top: number, bottom: number, k: number): BarTone => {
        const band = { x: 0, y: top, w: window.innerWidth, h: bottom - top };
        let lo = 0;
        let hi = 0;
        if (k < 1) {
          // The photo with the most of the band under it, read as object-cover of its own box.
          let img: HTMLImageElement | null = null;
          let f: DOMRect | null = null;
          let most = 0;
          for (const im of Array.from(sec.querySelectorAll("img"))) {
            const r = im.getBoundingClientRect();
            const w = Math.min(r.right, band.w) - Math.max(r.left, 0);
            const h = Math.min(r.bottom, bottom) - Math.max(r.top, top);
            if (w > 0 && h > 0 && w * h > most) {
              most = w * h;
              img = im;
              f = r;
            }
          }
          if (!img || !f) return "photo";
          const ys = photoLuminances(img, { x: f.left, y: f.top, w: f.width, h: f.height }, band);
          if (!ys) return "photo";
          lo = ys[Math.floor(ys.length * 0.1)];
          hi = ys[Math.floor(ys.length * 0.9)];
          // The block's own veils over the photo (data-veil), where they cover the band.
          const mid = (top + bottom) / 2;
          sec.querySelectorAll<HTMLElement>("[data-veil]").forEach((v) => {
            const r = v.getBoundingClientRect();
            if (r.top > mid || r.bottom < mid) return;
            const cs = getComputedStyle(v);
            const c = colourOf(cs.backgroundColor);
            const a = (parseFloat(cs.opacity) || 0) * c.a;
            if (a <= 0) return;
            lo = over(lo, c.y, a);
            hi = over(hi, c.y, a);
          });
        }
        // Each ink over the band with its own scrolled ground at the strength it has come in, the worse end counted.
        const score = (t: BarTone) => {
          const a = Math.min(1, k);
          return Math.min(contrast(inkY[t], over(lo, groundY[t], a)), contrast(inkY[t], over(hi, groundY[t], a)));
        };
        const was = picked.get(sec);
        let tone: BarTone = "photo";
        if (was && score(was) >= PHOTO_RATIO) tone = was;
        else if (score("photo") < PHOTO_RATIO) {
          for (const t of TONES) if (score(t) > score(tone)) tone = t;
        }
        picked.set(sec, tone);
        return tone;
      };

      // --- the ink, cut where the sections under the bar meet, in the bar's own coordinates ---
      const ink = (o: number, extent: number, k: number) => {
        const segs: Array<[number, number, BarTone]> = [[0, extent, "ground"]];
        document.querySelectorAll<HTMLElement>("[data-bar-tone]").forEach((sec) => {
          const declared = sec.dataset.barTone;
          if ((declared !== "photo" && declared !== "inverse") || el.contains(sec)) return;
          const r = sec.getBoundingClientRect();
          const a = Math.max(0, r.top + o);
          const b = Math.min(extent, r.bottom + o);
          if (b <= a) return;
          const tone: BarTone = declared === "photo" ? photoTone(sec, a - o, b - o, k) : declared;
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
      };

      // The plain bar's ink until the copies show (settle waits for its face): the tone of the section under the bar's
      // middle now, read from the page's own data-bar-tone, so it can never disagree with the hero.
      const startTone = (): BarTone => {
        let tone: BarTone = "ground";
        const h = realFace.offsetHeight;
        const mid = h / 2;
        document.querySelectorAll<HTMLElement>("[data-bar-tone]").forEach((sec) => {
          const t = sec.dataset.barTone;
          if ((t !== "photo" && t !== "inverse") || el.contains(sec)) return;
          const r = sec.getBoundingClientRect();
          if (r.top <= mid && r.bottom > mid) tone = t === "photo" ? photoTone(sec, Math.max(0, r.top), Math.min(h, r.bottom), 0) : t;
        });
        return tone;
      };
      readInks();
      el.dataset.start = startTone();

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
        ink(o, extent, k);
      };

      // quiet: the wish follows the scroll pixel for pixel, the bar eases after it; at rest it settles to a side.
      let tw: gsap.core.Tween | null = null;
      const ease = (to: number, duration: number) => {
        tw?.kill();
        tw = gsap.to(shown, { o: to, duration, ease: "power3.out", onUpdate: paint });
      };
      const settleTo = (to: number) => {
        aim = to;
        ease(to, timeIn(mood, 0.32));
      };
      const onScroll = () => {
        const y = Math.max(0, window.scrollY);
        const dy = y - lastY;
        lastY = y;
        if (dy === 0) return;
        if (variant === "quiet" && !reduce) {
          const cap = Math.min(barH + 1, y);
          aim = focusIn ? 0 : Math.min(cap, Math.max(0, aim + dy));
          if (Math.abs(aim - shown.o) > 0.01) ease(aim, scrubIn(mood, 0.18, "flow"));
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
        readInks();
        paint();
      };
      window.addEventListener("resize", onResize);
      // A photo under the bar that arrives after the bar has painted: read it as soon as it is there.
      const onLoad = (e: Event) => {
        if (e.target instanceof HTMLImageElement && e.target.closest('[data-bar-tone="photo"]')) paint();
      };
      document.addEventListener("load", onLoad, true);

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
          fitTw = gsap.to(fit, { s: target, duration: timeIn(mood, 0.6), ease: "power2.out", onUpdate: paint });
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
        document.removeEventListener("load", onLoad, true);
        real.removeEventListener("focusin", onFocusIn);
        real.removeEventListener("focusout", onFocusOut);
        host.style.removeProperty("--hb-top");
        api.current = null;
      };
    },
    { scope: root, dependencies: [variant, links.length] },
  );

  const face = { variant, name, homeHref, links, action, menuHref, menuLabel, navLabel, onMenu, place, clock, time };

  return (
    <div ref={root} data-header-bar={variant} style={{ "--hb-adv": advanceEm(name).toFixed(3) } as CSSProperties}>
      <div data-hb-move="" className="pointer-events-none fixed inset-x-0 top-0 z-[70]">
        {/* The bar's ink over the page: one copy per ground, each clipped to the stretches it covers. */}
        {TONES.map((tone) => (
          <div
            key={tone}
            aria-hidden="true"
            data-hb-copy={tone}
            className={`absolute inset-x-0 top-0 ${TONE_INK[tone]}`}
            style={{ clipPath: NONE }}
          >
            <Face {...face} tone={tone} />
          </div>
        ))}
        {/* The real bar: the links, on top, their ink drawn by the copies under them once those show. Until then its
            ink is the start tone's (blocks.css, "--- header-bar ---"). */}
        <header data-hb-real="" className={`relative ${TONE_INK.ground}`}>
          <Face {...face} real bind={bind} />
        </header>
      </div>
    </div>
  );
}
