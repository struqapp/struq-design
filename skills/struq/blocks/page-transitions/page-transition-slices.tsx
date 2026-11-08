"use client";
// page-transition-slices (Struq page-transition recipe)
// The slice language of preloader-slices on every navigation. The slices always travel one way, downward: they come
// in from above, left to right, a 5px accent line on each leading edge, and close over the page carrying the
// destination's name in the display face with the preloader's hairline under it; then they carry on down and off,
// so the new page shows from the top, its title first, while its own entrance starts (whenUncovered). About 0.35s to
// close and 0.4s to leave. A slow route keeps the hairline moving under the name.
//
// Clicks: the route is fetched from the click on, under the closing cover, and RouteWatch holds the new page back
// until the cover is shut (a router navigation is a transition, and a transition that suspends keeps the old page).
// Back and forward: React commits a navigation started in a popstate at once, so no hold can stop it there. The
// popstate is caught first instead, the slices cover the page being left, and only then is the event handed to the
// router. Either way the reader sees: the page they leave is covered, the page they reach is uncovered.
//
// Mount it once, in app/layout.tsx, around {children}:
//   <PageTransitionSlices name="Noord" labels={{ "/werk": "Werk", "/studio": "De studio" }}>{children}</PageTransitionSlices>
// Every same-origin link click is taken over (next/link or a plain <a>), so nothing else changes. A link opts out with
// data-no-transition; modified clicks, new tabs, downloads, other origins and links to a spot on the same page are left
// alone. For code that navigates: const go = useSliceNavigate(); go("/werk").
//
// The cover always names where you are going, never blank. In order: the link's data-transition-label, the `labels`
// map (by path), the name the page gave itself on an earlier visit (data-transition-title on any element, read on
// every arrival), the last part of the path in words ("/werk/de-spinnerij" reads "De spinnerij"), and for the home
// page `name`.
// whenUncovered (preloader-slices-uncovered.ts, shared with the preloader) times a page's entrance to the reveal.
//
// Scroll: the browser's own restoration is off while this is mounted, because it would jump the old page before the
// cover is down. A push lands at the top, or on its #hash; back and forward land where the reader left that page.
// Focus moves to the #hash target, else [data-transition-focus], else the h1, else main, without scrolling.
// Reduced motion and no JS: plain navigation, no cover.
import {
  Suspense,
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { gsap, useGSAP } from "../kit/gsap";
import { getLenis } from "../kit/SmoothScroll";
import { closeCurtain, liftCurtain, whenUncovered } from "../preloaders/preloader-slices-uncovered";

export { whenUncovered };

const T = {
  cover: 0.26, // one slice coming in
  leave: 0.3, // one slice leaving
  stagger: 0.03,
  settle: 0.06, // the longest the new page's first photos may hold the reveal
  stall: 8, // the longest the cover waits for a route that never arrives
} as const;

const SLICES = [0, 1, 2, 3];

/** Where a slice rests off screen: a little past it, so its 5px accent edge is out of view too. */
const PARK = 102;

/** The cover's ground, exactly as in preloader-slices: always the dark of the palette. */
const COVER = {
  "--slices-base": "oklch(from var(--surface-0) min(l + 0.07, 0.27) c h)",
  "--slices-ink": "oklch(from var(--inverse) l c h / clamp(0, (0.5 - l) * 100, 1))",
} as CSSProperties;
// Written out in full, so Tailwind finds the classes.
const COVER_BG = "bg-inverse supports-[color:oklch(from_red_l_c_h)]:bg-[var(--slices-base)]";
const COVER_INK = "absolute inset-0 hidden bg-[var(--slices-ink)] supports-[color:oklch(from_red_l_c_h)]:block";

type Navigate = (href: string, label?: string) => void;
const SlicesContext = createContext<Navigate | null>(null);

/** router.push through the slices, optionally with the name the cover shows. Outside the provider: router.push. */
export function useSliceNavigate(): Navigate {
  const navigate = useContext(SlicesContext);
  const router = useRouter();
  return navigate ?? ((href: string) => router.push(href));
}

type Phase = "idle" | "covering" | "covered" | "leaving";

/** A click's hold: the route on screen when it began, and the promise that settles when the cover is shut. */
type Gate = { from: string; shut: Promise<void> };

/** The history entry on screen: the Navigation API's key where there is one, else the URL. */
function entryKey(): string {
  const nav = (window as Window & { navigation?: { currentEntry?: { key?: string } } }).navigation;
  return nav?.currentEntry?.key ?? location.pathname + location.search;
}

/** Path and query, the query spelled the way useSearchParams spells it, so the two always compare equal. */
function routeOf(url: URL | Location): string {
  const search = new URLSearchParams(url.search).toString();
  return url.pathname + (search ? `?${search}` : "");
}

/** The last part of a path in words: "/werk/de-spinnerij" reads "De spinnerij". */
function wordsOf(pathname: string): string {
  const last = decodeURIComponent(pathname.split("/").filter(Boolean).pop() ?? "").replace(/[-_]+/g, " ").trim();
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : "";
}

export function PageTransitionSlices({
  children,
  name = "Home",
  labels,
}: {
  children: React.ReactNode;
  /** The site's name: the cover's word for the home page. */
  name?: string;
  /** The cover's word per path, for pages no link names (e.g. { "/werk": "Werk" }). */
  labels?: Record<string, string>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [gate, setGate] = useState<Gate | null>(null);
  const api = useRef<{ navigate: Navigate; arrived: (route: string) => void } | null>(null);
  // Read by the engine at click time; kept current without restarting it.
  const words = useRef({ name, labels });
  useEffect(() => {
    words.current = { name, labels };
  }, [name, labels]);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const q = gsap.utils.selector(el);
      const live = (list: Element[]) => list.filter((n) => getComputedStyle(n).display !== "none");
      const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // The engine's state between events.
      let phase: Phase = "idle";
      let kind: "push" | "pop" | null = null;
      let hash = "";
      let shown = routeOf(location); // the route on screen
      let shownKey = entryKey(); // its history entry
      let early = false; // the route arrived before the cover was shut
      let replaying = false;
      let stall = 0;
      let shut: Promise<void> | null = null;
      let open = () => {};
      const scrolls = new Map<string, number>();
      const learnt = new Map<string, string>(); // names pages gave themselves, by route

      /** Remember the name the page on screen gives itself, for the next time a cover leads back to it. */
      const learn = () => {
        const own = document.querySelector<HTMLElement>("[data-transition-title]")?.dataset.transitionTitle?.trim();
        if (own) learnt.set(shown, own);
      };
      learn();

      /** The cover's word for a destination: never blank. */
      const wordFor = (url: URL, given?: string | null) => {
        const { name: home, labels: map } = words.current;
        return (
          given?.trim() ||
          map?.[url.pathname] ||
          learnt.get(routeOf(url)) ||
          wordsOf(url.pathname) ||
          home
        );
      };

      const restoration = history.scrollRestoration;
      history.scrollRestoration = "manual";
      gsap.set(q("[data-sheet]"), { yPercent: -PARK });

      const scrollTo = (y: number) => {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      };

      // One motion at a time: a click while the slices leave turns them back from wherever they are.
      let motion: gsap.core.Timeline | null = null;
      let creep: gsap.core.Tween | null = null;
      const line = { p: 0 };
      const paintLine = () => {
        for (const f of q("[data-fill]")) f.style.transform = `scaleX(${line.p})`;
      };

      /** Close the cover over the page on screen; `then` runs once it is shut. */
      const cover = contextSafe((word: string, then?: () => void) => {
        for (const n of q("[data-label]")) n.textContent = word;
        if (!shut) shut = new Promise<void>((resolve) => (open = resolve));
        if (phase === "covered") {
          then?.();
          return;
        }
        afterShut = then ?? null;
        if (phase === "covering") return; // the running cover takes the newest route
        const wasLeaving = phase === "leaving";
        phase = "covering";
        el.dataset.active = "";
        const sheets = live(q("[data-sheet]"));
        motion?.kill();
        creep?.kill();
        // In from above. A cover that was still leaving turns back from where it is; anything else starts out of view.
        if (!wasLeaving) gsap.set(sheets, { yPercent: -PARK });
        line.p = 0;
        paintLine();
        motion = gsap
          .timeline({
            onComplete: () => {
              phase = "covered";
              closeCurtain();
              open();
              const next = afterShut;
              afterShut = null;
              next?.();
              if (early) return leave();
              // A slow route: the hairline keeps going under the name, so the closed cover is never a still slab.
              creep = gsap.to(line, { p: 0.94, duration: 4, ease: "power2.out", onUpdate: paintLine });
              window.clearTimeout(stall);
              stall = window.setTimeout(() => leave(), T.stall * 1000);
            },
          })
          .to(sheets, { yPercent: 0, duration: T.cover, ease: "power3.inOut", stagger: T.stagger }, 0)
          .to(line, { p: 0.55, duration: T.cover + T.stagger * 3, ease: "power2.out", onUpdate: paintLine }, 0);
      });
      let afterShut: (() => void) | null = null;

      const leave = contextSafe(() => {
        window.clearTimeout(stall);
        creep?.kill();
        phase = "leaving";
        const was = kind ?? "push";
        const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
        kind = null;
        hash = "";
        shut = null;
        early = false;
        setGate(null);
        shown = routeOf(location);
        shownKey = entryKey();
        learn();
        if (was === "pop") scrollTo(scrolls.get(shownKey) ?? 0);
        else scrollTo(target ? target.getBoundingClientRect().top + window.scrollY : 0);
        focusPage(target);

        const go = contextSafe(() => {
          liftCurtain();
          const sheets = live(q("[data-sheet]"));
          motion?.kill();
          motion = gsap
            .timeline({
              onComplete: () => {
                phase = "idle";
                delete el.dataset.active;
                gsap.set(sheets, { yPercent: -PARK });
              },
            })
            .to(line, { p: 1, duration: 0.18, ease: "power2.out", onUpdate: paintLine }, 0)
            .to(sheets, { yPercent: PARK, duration: T.leave, ease: "power3.inOut", stagger: T.stagger }, 0);
        });
        // A breath for the new page's first photos, capped, then away.
        const photos = Array.from(document.images).filter((img) => {
          const r = img.getBoundingClientRect();
          return !img.complete && r.bottom > 0 && r.top < window.innerHeight;
        });
        Promise.race([
          Promise.all(photos.map((img) => img.decode().catch(() => undefined))),
          new Promise((resolve) => window.setTimeout(resolve, T.settle * 1000)),
        ]).then(() => requestAnimationFrame(() => go()));
      });

      const navigate: Navigate = (href, label) => {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) {
          location.assign(url.href);
          return;
        }
        if (reduce()) {
          router.push(href);
          return;
        }
        if (phase === "idle" || phase === "leaving") {
          if (routeOf(url) === shown) return; // already here
          scrolls.set(shownKey, window.scrollY);
        }
        kind = "push";
        hash = url.hash;
        cover(wordFor(url, label));
        // The route is fetched from now on, under the closing cover; RouteWatch holds it back until the cover is shut.
        setGate({ from: shown, shut: shut! });
        router.push(url.pathname + url.search + url.hash, { scroll: false });
      };

      const arrived = (route: string) => {
        if (route === shown) return;
        if (phase === "covered" && kind) return leave();
        if (phase === "covering" && kind) {
          early = true;
          return;
        }
        // A navigation the slices did not run (reduced motion, router.replace, a form): take it as it is, with the
        // scroll a back or forward press should land on.
        if (phase === "idle") {
          const wasPop = kind === "pop";
          kind = null;
          shown = route;
          shownKey = entryKey();
          learn();
          if (wasPop) scrollTo(scrolls.get(shownKey) ?? 0);
          if (reduce()) focusPage(null);
        }
      };
      api.current = { navigate, arrived };

      // Every same-origin link, in the capture phase, before next/link sees the click. preventDefault is enough:
      // next/link skips a click that is already handled, and the link's own onClick still runs.
      const onClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!a || a.hasAttribute("download") || a.hasAttribute("data-no-transition")) return;
        if (a.target && a.target !== "_self") return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;
        if (routeOf(url) === shown && (url.hash || a.getAttribute("href")?.startsWith("#"))) return;
        if (reduce()) {
          scrolls.set(shownKey, window.scrollY); // next/link navigates as usual; back still lands here
          return;
        }
        e.preventDefault();
        navigate(url.pathname + url.search + url.hash, a.dataset.transitionLabel);
      };
      const onIntent = (e: Event) => {
        const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!a || a.hasAttribute("data-no-transition")) return;
        const url = new URL(a.href, location.href);
        if (url.origin === location.origin && routeOf(url) !== shown) router.prefetch(url.pathname + url.search);
      };

      // Back and forward. A capture listener on window runs before the router's own, so the popstate is held here
      // while the slices cover the page being left, and handed to the router only once they are shut. The URL is
      // already the new one; the screen is still the old page.
      const onPop = (e: PopStateEvent) => {
        if (replaying) return;
        const route = routeOf(location);
        if (phase === "idle" || phase === "leaving") {
          if (route === shown) return; // a spot on the same page
          scrolls.set(shownKey, window.scrollY);
        }
        kind = "pop";
        hash = "";
        if (reduce()) return; // the router traverses as usual; arrived() restores the scroll
        e.stopImmediatePropagation();
        cover(wordFor(new URL(location.href)), () => {
          if (routeOf(location) === shown) return leave(); // back and forth again: nothing to load
          replaying = true;
          window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
          replaying = false;
        });
      };

      document.addEventListener("click", onClick, true);
      document.addEventListener("pointerover", onIntent, { passive: true });
      document.addEventListener("focusin", onIntent);
      window.addEventListener("popstate", onPop, true);
      return () => {
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("pointerover", onIntent);
        document.removeEventListener("focusin", onIntent);
        window.removeEventListener("popstate", onPop, true);
        window.clearTimeout(stall);
        history.scrollRestoration = restoration;
        // Never leave a held route or a closed curtain behind.
        open();
        setGate(null);
        if (phase !== "idle") liftCurtain();
        api.current = null;
      };
    },
    { scope: root },
  );

  const navigate = useCallback<Navigate>(
    (href, label) => {
      if (api.current) api.current.navigate(href, label);
      else router.push(href);
    },
    [router],
  );
  const arrived = useCallback((route: string) => api.current?.arrived(route), []);

  return (
    <SlicesContext.Provider value={navigate}>
      {children}
      <Suspense fallback={null}>
        <RouteWatch gate={gate} onRoute={arrived} />
      </Suspense>
      <div
        ref={root}
        data-page-transition="slices"
        aria-hidden="true"
        className="@container pointer-events-none invisible fixed inset-0 z-[90] [--n:4] max-md:[--n:3] data-[active]:pointer-events-auto data-[active]:visible"
        style={COVER}
      >
        {SLICES.map((i) => (
          <div
            key={i}
            data-sheet=""
            className={`absolute inset-y-0 text-on-photo ${COVER_BG} ${i === 3 ? "max-md:hidden" : ""}`}
            style={slice(i)}
          >
            {/* Fixed 5px accent edges outside the sheet, seen only while it moves: the bottom one leads it in, the
                top one trails it out. */}
            <div className="absolute inset-x-0 top-full h-[5px] bg-accent" />
            <div className="absolute inset-x-0 bottom-full h-[5px] bg-accent" />
            <div className="absolute inset-0 overflow-hidden">
              <div className={COVER_INK} />
              <div className="absolute inset-y-0" style={{ left: `calc(${-i} * 100cqw / var(--n))`, width: "100cqw" }}>
                <Face />
              </div>
            </div>
          </div>
        ))}
      </div>
    </SlicesContext.Provider>
  );
}

/**
 * Reports the route (path and query) after every change, and during a click's cover holds the new route back: the
 * router's push is a transition, and a transition that suspends keeps the old page on screen until the cover is shut.
 * Its own Suspense keeps useSearchParams off the page.
 */
function RouteWatch({ gate, onRoute }: { gate: Gate | null; onRoute: (route: string) => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const route = pathname + (search ? `?${search}` : "");
  if (gate && route !== gate.from) use(gate.shut);
  useEffect(() => {
    onRoute(route);
  }, [route, onRoute]);
  return null;
}

/** One strip's place: an n-th of the width, a pixel wider so no seam of the page shows between two strips. */
function slice(i: number): CSSProperties {
  return { left: `calc(${i} * 100cqw / var(--n))`, width: "calc(100cqw / var(--n) + 1px)" };
}

/** The closed cover: the destination's name where the preloader sets the client's, the hairline across the foot. */
function Face() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between px-6 pb-5 pt-5 md:px-[4vw] md:pb-[2.2vw] md:pt-[2.2vw]">
      <p data-label="" className="font-display max-w-[11ch] text-[18vw] leading-[0.86] tracking-[-0.04em] md:text-[9.5vw]" />
      <div className="relative h-px w-full bg-on-photo/20">
        <div data-fill="" className="absolute inset-0 origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}

/** Focus the new page without moving it, so a keyboard or screen reader starts at its top (or at its #hash). */
function focusPage(at: HTMLElement | null) {
  const target =
    at ??
    document.querySelector<HTMLElement>("[data-transition-focus]") ??
    document.querySelector<HTMLElement>("main h1") ??
    document.querySelector<HTMLElement>("h1") ??
    document.querySelector<HTMLElement>("main");
  if (!target) return;
  if (!target.hasAttribute("tabindex") && target.tabIndex < 0) Object.assign(target, { tabIndex: -1 }).style.outline = "none"; // a heading made focusable only for this: no ring
  target.focus({ preventScroll: true });
}
