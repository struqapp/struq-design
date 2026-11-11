"use client";
// menu-curtain (Struq header recipe): the bar, and the full-screen menu it opens as a curtain
// A minimal bar: the wordmark on the left, one button on the right that reads "Menu" and rolls to "Sluiten". The menu
// opens as a curtain in the language of one of the page transitions, the links rise in a stagger through their masks,
// the hovered or focused link shows its photo on the menu's calm side, and a foot line carries the contact line and
// the studio's place (with `clock`, its live local time; off unless asked, one live clock per site at most). It closes the same way, reversed: every part moves from where it is to where it is going,
// so a close overtaken by an open turns round instead of starting over.
//
//   gate    a line draws from the middle of the screen and the menu opens from it, two edges parting up and down;
//           the photo opens from its own middle line, the gate's line, as the links are hovered.
//   slices  the menu falls in vertical slices, left to right, each led by a 5px accent edge; the photo stands in the
//           last slice as a tall print and falls with it, and a new photo falls over the last one on hover.
//   stack   three panels grow one after another from the button, the last one the menu; a small portrait frame
//           appears on a hard cut, flips through a few prints and then cuts to the hovered link's photo.
//
// The bar turns its ink with what is under it, exactly at the edge: it is drawn three times (ink for the page ground,
// on-photo, on-inverse), each copy clipped to the stretch of the bar its own sections cover. Sections opt in with
// data-bar-tone="photo" or data-bar-tone="inverse"; anything else is ground. The curtain carries its own copy of the
// bar, so while it travels the bar's ink splits along its edge. The real bar (the link and the button) sits on top
// with transparent text: one focusable bar, never three.
//
// Mount it once at the top of the page; it is fixed and needs no wrapper:
//   <MenuCurtain variant="gate" name="Noord" items={[{ label: "Werk", href: "/werk", image }]} startTone="photo"
//     contact={{ label: "hallo@noord.studio", href: "mailto:hallo@noord.studio" }} place="Rotterdam" />
// Keep the hero's type out of the top var(--menu-bar-h) of the screen; the bar never gets a ground of its own.
//
// While open, the page under it does not move (Lenis stopped, or the root's overflow held without Lenis) and is
// inert; Tab cycles the bar and the menu, Escape closes and gives focus back to where it was. A link to a spot on the
// same page closes the menu and scrolls there. Photos are decoded before they can show; one that is not ready is
// waited for under an id, so a later hover always wins. Reduced motion: the same states, the curtain fading in and
// out, cuts for the photos. Without JavaScript (and 3 seconds into a page whose script never arrives) the bar shows
// its links in a row instead of the button.
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type ReactNode, type Ref } from "react";
import { gsap, ScrollTrigger, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { getLenis } from "../kit/SmoothScroll";

export const MENU_CURTAIN_VARIANTS = [
  { id: "gate", title: "De poort" },
  { id: "slices", title: "De repen" },
  { id: "stack", title: "De stapel" },
] as const;
export type MenuCurtainVariant = (typeof MENU_CURTAIN_VARIANTS)[number]["id"];

export type MenuItem = { label: string; href: string; image?: StruqImage };
export type BarTone = "ground" | "photo" | "inverse";

const TONES: BarTone[] = ["ground", "photo", "inverse"];
const TONE_INK: Record<BarTone, string> = { ground: "text-ink", photo: "text-on-photo", inverse: "text-on-inverse" };
const EMPTY = "inset(0px 0px 100% 0px)";
const SLICES = [0, 1, 2, 3];
const PANELS = [
  { ground: "bg-[color-mix(in_srgb,var(--surface-1),var(--ink)_7%)]", ink: "text-ink" },
  { ground: "bg-[color-mix(in_srgb,var(--surface-1),var(--ink)_16%)]", ink: "text-ink" },
  { ground: "bg-[var(--menu)]", ink: "text-[var(--on-menu)]" },
];
/** The accent edge that leads each slice. */
const EDGE = 5;

type Sched = readonly [delay: number, duration: number, ease: string];
type Part = { o: { v: number }; open: Sched; close: Sched; cut?: boolean };
type Api = { go: (open: boolean) => void; show: (i: number, cut?: boolean) => void };

function sameDocumentHash(href: string): string | null {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return null;
  return decodeURIComponent(url.hash.slice(1));
}

/** Makes everything outside `el` inert, up to the body, and returns the undo. */
function inertOutside(el: HTMLElement) {
  const done: HTMLElement[] = [];
  let node: HTMLElement = el;
  while (node.parentElement && node !== document.body) {
    const parent: HTMLElement = node.parentElement;
    for (const sib of Array.from(parent.children)) {
      if (sib === node || !(sib instanceof HTMLElement) || sib.inert) continue;
      if (sib.tagName === "SCRIPT" || sib.tagName === "STYLE" || sib.tagName === "LINK") continue;
      sib.inert = true;
      done.push(sib);
    }
    node = parent;
  }
  return () => done.forEach((n) => (n.inert = false));
}

/**
 * The bar's face. Drawn once for real (a link and a button, transparent text, on top) and as aria-hidden copies in
 * every ink, so all of them lay out alike to the pixel.
 */
function BarFace({
  real = false,
  name,
  homeHref,
  items,
  open = false,
  controls,
  toggleRef,
  onToggle,
}: {
  real?: boolean;
  name: string;
  homeHref: string;
  items: MenuItem[];
  open?: boolean;
  controls?: string;
  toggleRef?: Ref<HTMLButtonElement>;
  onToggle?: () => void;
}) {
  const word = "font-display text-[1.375rem] leading-none tracking-[-0.02em]";
  const toggle = "[grid-area:1/1] -my-3 inline-flex cursor-pointer items-center gap-3 py-3 text-small font-medium leading-none";
  const inner = (
    <>
      <span aria-hidden="true" className="block h-[1.25em] overflow-hidden leading-[1.25em]">
        <span data-roll="" className="flex flex-col items-end">
          <span>Menu</span>
          <span>Sluiten</span>
        </span>
      </span>
      <span aria-hidden="true" className="relative block h-2 w-6">
        <span data-ico="a" className="absolute inset-x-0 top-0 h-px bg-current" />
        <span data-ico="b" className="absolute inset-x-0 bottom-0 h-px bg-current" />
      </span>
    </>
  );
  return (
    <div className="flex h-[var(--menu-bar-h)] items-center justify-between gap-6 px-sheet-margin">
      {real ? (
        <a href={homeHref} className={word}>
          {name}
        </a>
      ) : (
        <span className={word}>{name}</span>
      )}
      <div className="grid justify-items-end">
        <ul data-menu-fallback="" className="m-0 flex list-none flex-wrap justify-end gap-x-4 gap-y-1 p-0 text-small [grid-area:1/1]">
          {items.map((item) => (
            <li key={item.label}>{real ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}</li>
          ))}
        </ul>
        {real ? (
          <button
            ref={toggleRef}
            type="button"
            data-menu-toggle=""
            aria-expanded={open}
            aria-controls={controls}
            onClick={onToggle}
            className={`${toggle} bg-transparent`}
          >
            <span className="sr-only">{open ? "Sluiten" : "Menu"}</span>
            {inner}
          </button>
        ) : (
          <span data-menu-toggle="" className={toggle}>
            {inner}
          </span>
        )}
      </div>
    </div>
  );
}

export function MenuCurtain({
  variant = "gate",
  name,
  homeHref = "/",
  items,
  contact,
  place = "Rotterdam",
  clock = false,
  timeZone = "Europe/Amsterdam",
  startTone = "ground",
}: {
  variant?: MenuCurtainVariant;
  /** The wordmark. */
  name: string;
  homeHref?: string;
  /** Four or five links; each one's photo shows on the menu's calm side while it is hovered or focused. */
  items: MenuItem[];
  /** The foot line's contact: a mailto, a phone or a page. */
  contact: { label: string; href: string };
  /** The studio's place, on the foot line. */
  place?: string;
  /** The place's live local time beside it. Off unless asked: one live clock per site at most. */
  clock?: boolean;
  /** IANA zone for the clock. */
  timeZone?: string;
  /** The ground under the bar on the first paint, before the script measures it (the hero's, usually "photo"). */
  startTone?: BarTone;
}) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const api = useRef<Api | null>(null);
  const isOpen = useRef(false);
  const active = useRef(0);
  const opener = useRef<HTMLElement | null>(null);
  const release = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const menuId = useId();

  // The clock, only when asked: empty on the server and the first paint, set after mount.
  useEffect(() => {
    if (!clock) return;
    const fmt = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [clock, timeZone]);

  /** Holds the page still and inert while the menu is open; the undo runs on every way out, unmount included. */
  const hold = useCallback(() => {
    const el = root.current;
    if (!el || release.current) return;
    const lenis = getLenis();
    const html = document.documentElement;
    const overflow = html.style.overflow;
    if (lenis) lenis.stop();
    else html.style.overflow = "hidden";
    const unInert = inertOutside(el);
    release.current = () => {
      if (lenis) getLenis()?.start();
      else html.style.overflow = overflow;
      unInert();
      release.current = null;
    };
  }, []);

  useEffect(() => () => release.current?.(), []);

  const setMenu = useCallback(
    (next: boolean, giveFocusBack = true) => {
      if (next === isOpen.current) return;
      isOpen.current = next;
      setOpen(next);
      if (next) {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        hold();
        api.current?.show(active.current, true);
      } else {
        release.current?.();
        if (giveFocusBack) (opener.current?.isConnected ? opener.current : toggleRef.current)?.focus({ preventScroll: true });
      }
      api.current?.go(next);
    },
    [hold],
  );

  // Escape closes; Tab goes round the bar and the menu only.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenu(false);
        return;
      }
      if (e.key !== "Tab" || !root.current) return;
      const ring = Array.from(
        root.current.querySelectorAll<HTMLElement>("[data-menu-real] a[href], [data-menu-real] button, [data-menu-panel] a[href]"),
      ).filter((n) => !n.closest("[data-menu-fallback]"));
      if (ring.length === 0) return;
      const i = ring.indexOf(document.activeElement as HTMLElement);
      if (i < 0) {
        e.preventDefault();
        ring[e.shiftKey ? ring.length - 1 : 0].focus();
      } else if (e.shiftKey && i === 0) {
        e.preventDefault();
        ring[ring.length - 1].focus();
      } else if (!e.shiftKey && i === ring.length - 1) {
        e.preventDefault();
        ring[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setMenu]);

  const onLink = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = sameDocumentHash(e.currentTarget.href);
    setMenu(false, false);
    if (id === null) return;
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target);
    else target.scrollIntoView();
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };

  const pick = (i: number) => {
    active.current = i;
    panel.current
      ?.querySelectorAll<HTMLElement>("[data-menu-link]")
      .forEach((a, j) => a.toggleAttribute("data-on", j === i));
    api.current?.show(i);
  };

  useGSAP(
    () => {
      const el = root.current;
      const overlay = panel.current;
      if (!el || !overlay) return;
      const nav = overlay.querySelector<HTMLElement>("nav");
      el.setAttribute("data-ready", "");
      const q = gsap.utils.selector(el);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // --- the bar's ink, cut exactly where the sections under it meet ---
      const faces = TONES.map((t) => q(`[data-tone-face="${t}"]`)[0] as HTMLElement);
      let barH = faces[0].offsetHeight;
      const ink = () => {
        const spans: Record<BarTone, [number, number] | null> = { ground: null, photo: null, inverse: null };
        document.querySelectorAll<HTMLElement>("[data-bar-tone]").forEach((sec) => {
          const tone = sec.dataset.barTone as BarTone;
          if ((tone !== "photo" && tone !== "inverse") || el.contains(sec)) return;
          const r = sec.getBoundingClientRect();
          const a = Math.max(0, r.top);
          const b = Math.min(barH, r.bottom);
          if (b <= a) return;
          const cur = spans[tone];
          spans[tone] = cur ? [Math.min(cur[0], a), Math.max(cur[1], b)] : [a, b];
        });
        // The ground takes the longest stretch the marked sections leave.
        const taken = [spans.photo, spans.inverse].filter((s): s is [number, number] => s !== null).sort((x, y) => x[0] - y[0]);
        let best: [number, number] | null = null;
        let y = 0;
        for (const [a, b] of taken) {
          if (a - y > (best ? best[1] - best[0] : 0)) best = [y, a];
          y = Math.max(y, b);
        }
        if (barH - y > (best ? best[1] - best[0] : 0)) best = [y, barH];
        spans.ground = best;
        faces.forEach((face, i) => {
          const s = spans[TONES[i]];
          face.style.clipPath = s ? `inset(${s[0]}px 0px ${barH - s[1]}px 0px)` : EMPTY;
        });
      };
      // On Lenis this runs inside its scroll (ScrollTrigger.update), so the split never trails the page by a frame.
      const watch = ScrollTrigger.create({ start: 0, end: "max", onUpdate: ink, onRefresh: ink });
      window.addEventListener("scroll", ink, { passive: true });
      ink();

      // --- the menu ---
      const rolls = q("[data-roll]");
      const icoA = q('[data-ico="a"]');
      const icoB = q('[data-ico="b"]');
      const rises = q("[data-rise]");
      const foot = q("[data-foot]")[0] as HTMLElement;
      const frame = q("[data-frame]")[0] as HTMLElement | undefined;
      const layers = q("[data-photo]");
      const cover = q("[data-cover]")[0] as HTMLElement | undefined;
      const edges = q("[data-gate-edge]");
      const grounds = q("[data-slice-ground]");
      const sliceEdges = q("[data-slice-edge]");
      const panels = q("[data-panel]");

      const P = { roll: { v: 0 }, line: { v: 0 }, cover: { v: 0 }, frame: { v: 0 }, foot: { v: 0 } };
      const rise = rises.map(() => ({ v: 0 }));
      const sl = SLICES.map(() => ({ v: 0 }));
      const pn = PANELS.map(() => ({ v: 0 }));
      const fade = { v: reduce ? 0 : 1 };

      let W = overlay.clientWidth;
      let H = overlay.clientHeight;
      let fh = frame?.offsetHeight ?? 0;
      let fTop = frame?.getBoundingClientRect().top ?? 0;
      let btn = toggleRef.current?.getBoundingClientRect() ?? new DOMRect(W - 80, 20, 60, 24);
      const measure = () => {
        W = overlay.clientWidth;
        H = overlay.clientHeight;
        barH = faces[0].offsetHeight;
        fh = frame?.offsetHeight ?? 0;
        fTop = frame?.getBoundingClientRect().top ?? 0;
        if (toggleRef.current) btn = toggleRef.current.getBoundingClientRect();
      };

      const paintLayer = (i: number, p: number) => {
        const L = layers[i];
        if (p <= 0) L.style.clipPath = EMPTY;
        else if (p >= 1) L.style.clipPath = "none";
        else if (variant === "gate") {
          const c = (fh / 2) * (1 - p);
          L.style.clipPath = `inset(${c}px 0px ${c}px 0px)`;
        } else L.style.clipPath = `inset(0px 0px ${fh * (1 - p)}px 0px)`;
      };

      const paint = () => {
        const r = P.roll.v;
        rolls.forEach((e) => (e.style.transform = `translate3d(0, ${-50 * r}%, 0)`));
        icoA.forEach((e) => (e.style.transform = `translate3d(0, ${3.5 * r}px, 0) rotate(${20 * r}deg)`));
        icoB.forEach((e) => (e.style.transform = `translate3d(0, ${-3.5 * r}px, 0) rotate(${-20 * r}deg)`));
        rises.forEach((e, i) => (e.style.transform = `translate3d(0, ${(1 - rise[i].v) * 110}%, 0)`));
        foot.style.opacity = String(P.foot.v);
        foot.style.transform = `translate3d(0, ${Math.round((1 - P.foot.v) * 16)}px, 0)`;

        let shown = false;
        if (variant === "gate" && cover) {
          const t = (H / 2) * (1 - P.cover.v);
          cover.style.clipPath = P.cover.v <= 0 ? "inset(50% 0px 50% 0px)" : `inset(${t}px 0px ${t}px 0px)`;
          const [top, bottom] = edges;
          const fadeOut = Math.min(1, (1 - P.cover.v) / 0.2);
          top.style.transform = `translate3d(0, ${Math.round(t - 1)}px, 0) scaleX(${P.line.v})`;
          bottom.style.transform = `translate3d(0, ${Math.round(H - t - 1)}px, 0) scaleX(${P.line.v})`;
          top.style.opacity = bottom.style.opacity = String(fadeOut);
          if (frame) {
            const c = (fh / 2) * (1 - P.frame.v);
            frame.style.clipPath = P.frame.v <= 0 ? "inset(50% 0px 50% 0px)" : `inset(${c}px 0px ${c}px 0px)`;
          }
          shown = P.line.v > 0 || P.cover.v > 0;
        } else if (variant === "slices") {
          sl.forEach((o, k) => {
            const y = Math.round(o.v * (H + EDGE) - EDGE);
            grounds[k].style.clipPath = o.v <= 0 ? EMPTY : `inset(0px 0px ${H - Math.max(0, y)}px 0px)`;
            sliceEdges[k].style.transform = `translate3d(0, ${y}px, 0)`;
            if (o.v > 0) shown = true;
          });
          if (frame) {
            // The print stands in the last slice and falls with it.
            const y = Math.round(sl[3].v * (H + EDGE) - EDGE);
            const seen = Math.min(fh, Math.max(0, y - fTop));
            frame.style.clipPath = seen <= 0 ? EMPTY : `inset(0px 0px ${fh - seen}px 0px)`;
          }
        } else {
          pn.forEach((o, k) => {
            const e = 1 - o.v;
            panels[k].style.clipPath =
              o.v <= 0
                ? EMPTY
                : `inset(${btn.top * e}px ${(W - btn.right) * e}px ${(H - btn.bottom) * e}px ${btn.left * e}px)`;
          });
          if (frame) frame.style.clipPath = P.frame.v >= 0.5 ? "none" : EMPTY;
          shown = pn[0].v > 0;
        }
        // The links live inside the curtain: the nav is clipped to whatever of the menu is open, so a rising link
        // never shows over the page before the curtain reaches it.
        if (nav) {
          if (variant === "gate" && cover) nav.style.clipPath = cover.style.clipPath;
          else if (variant === "slices") {
            const n = sl.length;
            const top: string[] = [];
            const bottom: string[] = [];
            sl.forEach((o, k) => {
              const x0 = Math.round((W * k) / n);
              const x1 = Math.round((W * (k + 1)) / n);
              const y = o.v <= 0 ? 0 : Math.max(0, Math.round(o.v * (H + EDGE) - EDGE));
              top.push(`${x0}px 0px`, `${x1}px 0px`);
              bottom.unshift(`${x1}px ${y}px`, `${x0}px ${y}px`);
            });
            nav.style.clipPath = `polygon(${[...top, ...bottom].join(", ")})`;
          } else nav.style.clipPath = panels[2]?.style.clipPath ?? "";
        }
        overlay.style.visibility = shown ? "visible" : "";
        overlay.style.opacity = String(fade.v);
        overlay.style.pointerEvents = isOpen.current ? "auto" : "";
      };

      // --- the photos: decoded before they can show; a newer wish always wins ---
      const decoding: Array<Promise<boolean> | null> = layers.map(() => null);
      const ready = layers.map(() => false);
      const decode = (i: number) => {
        if (!decoding[i]) {
          const img = layers[i].querySelector("img");
          decoding[i] = img
            ? img.decode().then(
                () => (ready[i] = true),
                () => false,
              )
            : Promise.resolve(false);
        }
        return decoding[i]!;
      };
      const idle = window.setTimeout(() => layers.forEach((_, i) => decode(i)), 300);

      const pv = layers.map(() => ({ p: 0 }));
      const aim = layers.map(() => 0);
      const z = layers.map(() => 0);
      const wipes: Array<gsap.core.Tween | null> = layers.map(() => null);
      let top = 0;
      let base = -1;
      let wish = 0;
      let flip: gsap.core.Tween | null = null;

      const cutTo = (k: number) => {
        wipes.forEach((t) => t?.kill());
        pv.forEach((o, i) => {
          o.p = i === k ? 1 : 0;
          aim[i] = o.p;
          paintLayer(i, o.p);
        });
        base = k;
      };
      const wipe = (i: number, to: number, done?: () => void) => {
        wipes[i]?.kill();
        aim[i] = to;
        const d = Math.abs(to - pv[i].p);
        wipes[i] = gsap.to(pv[i], {
          p: to,
          duration: Math.max(0.14, 0.6 * d),
          ease: "power3.out",
          onUpdate: () => paintLayer(i, pv[i].p),
          onComplete: done,
        });
      };
      const show = (k: number, cut = false) => {
        if (k < 0 || k >= layers.length) return;
        const id = ++wish;
        flip?.kill();
        if (!ready[k]) {
          // Waited for under its id: shown only if it is still the newest wish, and then never as a cut.
          decode(k).then((ok) => {
            if (ok && id === wish) show(k);
          });
          return;
        }
        if (cut || reduce || variant === "stack") {
          cutTo(k);
          return;
        }
        if (k === base) {
          // Back to the photo underneath: whatever was wiping over it draws back the way it came.
          pv.forEach((o, i) => {
            if (i !== base && (o.p > 0 || aim[i] > 0)) wipe(i, 0);
          });
          return;
        }
        if (aim[k] === 1 && wipes[k]?.isActive()) return;
        z[k] = ++top;
        layers[k].style.zIndex = String(z[k]);
        wipe(k, 1, () => {
          base = k;
          pv.forEach((o, i) => {
            if (i === k || z[i] > z[k]) return;
            wipes[i]?.kill();
            o.p = 0;
            aim[i] = 0;
            paintLayer(i, 0);
          });
        });
      };

      /** The stack's frame, once it appears: a thumb through a few decoded prints, landing on the active one. */
      const flipIn = () => {
        const id = ++wish;
        const others = layers.map((_, i) => i).filter((i) => i !== active.current && ready[i]).slice(0, 3);
        const run = [...others, active.current];
        let step = 0;
        const next = () => {
          if (id !== wish) return;
          const k = run[step];
          if (ready[k]) cutTo(k);
          step += 1;
          if (step < run.length) flip = gsap.delayedCall(0.075 + step * 0.012, next);
        };
        next();
      };

      // --- open and close: every part from where it is to where it is going ---
      const lead = variant === "slices" ? 0.42 : 0.5;
      const plan = (): { parts: Part[]; ref: () => number } => {
        const n = rise.length;
        const parts: Part[] = [{ o: P.roll, open: [0, 0.55, "power3.inOut"], close: [0, 0.5, "power3.inOut"] }];
        rise.forEach((o, i) =>
          parts.push({ o, open: [lead + i * 0.06, 0.9, "expo.out"], close: [(n - 1 - i) * 0.04, 0.38, "power2.in"] }),
        );
        parts.push({ o: P.foot, open: [lead + 0.32, 0.7, "expo.out"], close: [0, 0.3, "power2.in"] });
        if (variant === "gate") {
          parts.push({ o: P.line, open: [0, 0.35, "expo.out"], close: [0.8, 0.22, "power2.in"] });
          parts.push({ o: P.cover, open: [0.2, 0.8, "power4.inOut"], close: [0.28, 0.6, "power4.inOut"] });
          parts.push({ o: P.frame, open: [0.55, 0.75, "power3.inOut"], close: [0.1, 0.45, "power3.inOut"] });
          return { parts, ref: () => P.cover.v };
        }
        if (variant === "slices") {
          sl.forEach((o, k) =>
            parts.push({ o, open: [k * 0.07, 0.6, "power3.inOut"], close: [0.26 + (3 - k) * 0.06, 0.5, "power3.inOut"] }),
          );
          return { parts, ref: () => sl.reduce((a, o) => a + o.v, 0) / sl.length };
        }
        pn.forEach((o, k) =>
          parts.push({ o, open: [k * 0.08, 0.7, "power4.inOut"], close: [0.26 + (2 - k) * 0.08, 0.55, "power4.inOut"] }),
        );
        parts.push({ o: P.frame, open: [0.62, 0, "none"], close: [0.02, 0, "none"], cut: true });
        return { parts, ref: () => pn[2].v };
      };

      let tl: gsap.core.Timeline | null = null;
      const go = (opening: boolean) => {
        tl?.kill();
        if (!opening) flip?.kill();
        measure();
        const { parts, ref } = plan();
        const target = opening ? 1 : 0;
        tl = gsap.timeline({ onUpdate: paint, onComplete: paint });
        if (reduce) {
          // The same states without the travel: the curtain fades, nothing moves.
          if (opening) {
            parts.forEach((p) => (p.o.v = 1));
            tl.to(fade, { v: 1, duration: 0.2, ease: "power1.out" });
          } else {
            tl.to(fade, { v: 0, duration: 0.16, ease: "power1.in" }).call(() => parts.forEach((p) => (p.o.v = 0)));
          }
          paint();
          return;
        }
        const f = opening ? 1 - ref() : ref();
        for (const p of parts) {
          const [delay, duration, ease] = opening ? p.open : p.close;
          if (Math.abs(target - p.o.v) < 1e-4) continue;
          if (p.cut) tl.set(p.o, { v: target }, delay * f);
          else tl.to(p.o, { v: target, duration: Math.max(0.12, duration * Math.abs(target - p.o.v)), ease }, delay * f);
        }
        if (variant === "stack" && opening && P.frame.v < 0.5) tl.call(flipIn, [], 0.62 * f);
        paint();
      };

      api.current = { go, show };
      paint();

      const onResize = () => {
        measure();
        paint();
        layers.forEach((_, i) => paintLayer(i, pv[i].p));
      };
      window.addEventListener("resize", onResize);

      return () => {
        tl?.kill();
        flip?.kill();
        wipes.forEach((t) => t?.kill());
        watch.kill();
        window.clearTimeout(idle);
        window.removeEventListener("scroll", ink);
        window.removeEventListener("resize", onResize);
        api.current = null;
      };
    },
    { scope: root, dependencies: [variant, items.length] },
  );

  const bar = (children: ReactNode) => <div className="absolute inset-x-0 top-0">{children}</div>;
  const face = { name, homeHref, items };
  const frameBox =
    variant === "gate"
      ? "right-sheet-margin top-1/2 aspect-[4/5] h-[min(58svh,40vw)] -translate-y-1/2"
      : variant === "slices"
        ? "bottom-[4.5rem] right-sheet-margin top-[var(--menu-bar-h)] left-[calc(75cqw+1.5rem)]"
        : "right-[13vw] top-1/2 aspect-[4/5] h-[min(46svh,30vw)] -translate-y-1/2"; // sheet-allow: the stack frame floats inside the page, a composition offset
  const frameSizes = variant === "gate" ? "32vw" : "24vw";
  const frameStart = variant === "gate" ? "inset(50% 0px 50% 0px)" : EMPTY;

  return (
    <div ref={root} data-menu-curtain="" data-variant={variant}>
      {/* The bar's ink over the page: one copy per ground, each clipped to the stretch it covers. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[79]">
        {TONES.map((tone) => (
          <div
            key={tone}
            data-tone-face={tone}
            className={`absolute inset-x-0 top-0 ${TONE_INK[tone]}`}
            style={{ clipPath: tone === startTone ? "none" : EMPTY }}
          >
            <BarFace {...face} />
          </div>
        ))}
      </div>

      <div
        ref={panel}
        id={menuId}
        data-menu-panel=""
        inert={!open}
        data-lenis-prevent=""
        className="@container invisible pointer-events-none fixed inset-0 z-[80] text-[var(--on-menu)] [--n:4] max-md:[--n:3]"
      >
        {variant === "gate" ? (
          <>
            <div data-cover="" aria-hidden="true" className="absolute inset-0 bg-[var(--menu)]" style={{ clipPath: "inset(50% 0px 50% 0px)" }}>
              {bar(<BarFace {...face} />)}
            </div>
            {/* The line the gate opens from; it splits into the two parting edges. */}
            {["top", "bottom"].map((side) => (
              <div
                key={side}
                data-gate-edge={side}
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[2px] bg-accent"
                style={{ transform: "translate3d(0, 0px, 0) scaleX(0)" }}
              />
            ))}
          </>
        ) : null}

        {variant === "slices"
          ? SLICES.map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className={`absolute inset-y-0 ${i === 3 ? "max-md:hidden" : ""}`}
                style={{ left: `calc(${i} * 100cqw / var(--n))`, width: "calc(100cqw / var(--n) + 1px)" }}
              >
                <div data-slice-ground="" className="absolute inset-0 overflow-hidden bg-[var(--menu)]" style={{ clipPath: EMPTY }}>
                  <div className="absolute inset-y-0" style={{ left: `calc(${-i} * 100cqw / var(--n))`, width: "100cqw" }}>
                    {bar(<BarFace {...face} />)}
                  </div>
                </div>
                <div
                  data-slice-edge=""
                  className="absolute inset-x-0 top-0 bg-accent"
                  style={{ height: EDGE, transform: `translate3d(0, ${-EDGE}px, 0)` }}
                />
              </div>
            ))
          : null}

        {variant === "stack"
          ? PANELS.map((p, k) => (
              <div key={k} data-panel={k} aria-hidden="true" className={`absolute inset-0 ${p.ground} ${p.ink}`} style={{ clipPath: EMPTY }}>
                {bar(<BarFace {...face} />)}
              </div>
            ))
          : null}

        <nav aria-label="Menu" className="absolute inset-0">
          <ul
            data-menu-list=""
            // sheet-allow: the list's right bound at 45vw leaves the frame its side, a composition offset
            className={`absolute bottom-[4.5rem] left-sheet-margin top-[var(--menu-bar-h)] m-0 flex list-none flex-col justify-end p-0 pb-[4svh] md:justify-center md:pb-0 ${variant === "slices" ? "md:right-[calc(25cqw+1.5rem)]" : "md:right-[45vw]"}`}
          >
            {items.map((item, i) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  data-menu-link=""
                  onPointerEnter={() => pick(i)}
                  onFocus={() => pick(i)}
                  onClick={onLink}
                  className="inline-block font-display text-[min(15.5vw,9svh)] leading-[1.02] tracking-[-0.03em] md:text-[min(7.2vw,11svh)]"
                >
                  <span className="struq-line-mask block">
                    <span data-rise="" className="block" style={{ transform: "translate3d(0, 110%, 0)" }}>
                      {item.label}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div data-frame="" aria-hidden="true" className={`absolute overflow-hidden max-md:hidden ${frameBox}`} style={{ clipPath: frameStart }}>
            {items.map((item, i) =>
              item.image ? (
                <div key={item.label} data-photo={i} className="absolute inset-0" style={{ clipPath: EMPTY }}>
                  <Image
                    src={item.image.src}
                    alt=""
                    fill
                    sizes={frameSizes}
                    loading="eager"
                    unoptimized={item.image.unoptimized}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div key={item.label} data-photo={i} className="absolute inset-0" style={{ clipPath: EMPTY }} />
              ),
            )}
          </div>

          <div
            data-foot=""
            className="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-6 px-sheet-margin pb-5 text-small text-[var(--on-menu-muted)] md:pb-6"
            style={{ opacity: 0 }}
          >
            <a href={contact.href} className="underline-offset-4 hover:underline">
              {contact.label}
            </a>
            <span>
              {place}
              {clock ? (
                <>
                  {" "}
                  <span className="tabular-nums">{time}</span>
                </>
              ) : null}
            </span>
          </div>
        </nav>
      </div>

      {/* The real bar: the one link and the one button, on top of everything, its ink drawn by the copies under it. */}
      <header data-menu-real="" className="fixed inset-x-0 top-0 z-[82] text-transparent">
        <BarFace {...face} real open={open} controls={menuId} toggleRef={toggleRef} onToggle={() => setMenu(!isOpen.current)} />
      </header>
    </div>
  );
}
