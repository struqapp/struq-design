"use client";
// page-transition-stack (Struq page-transition recipe)
// The stack language on every navigation, in the voice of preloader-stack. On a click a small portrait print of the
// destination's own hero photo appears where the pointer is (centred for a keyboard press, back and forward) and grows
// until it fills the screen; the route loads under it; on the new page the print is already that page's hero photo,
// and it settles into the hero's exact place and crop, so arriving is the same seamless landing the preloader ends on.
// About 0.35s to fill the screen and 0.38s to land: door to door under 0.9 seconds once the route is in.
//
// The destination photo: a link names it with data-transition-image (the same src its page's hero renders). It is
// decoded ahead (links in view on idle, any link on hover or focus); a print is never shown half drawn. When it is not
// ready, or when the new page has no matching [data-stack-target] in view, the print carries the destination's name on
// the page ground instead, and the cover lifts away at the end rather than landing.
//
// Mount it once, in app/layout.tsx, around {children}:
//   <PageTransitionStack name="Noord">{children}</PageTransitionStack>
//   <Link href="/studio" data-transition-image={studioHero.src} data-transition-label="De studio">Studio</Link>
// The landing matches the page exactly when the page's hero is <Image fill sizes="100vw" className="object-cover">
// inside its [data-stack-target] box, as preloader-stack asks. Every same-origin link is taken over; a link opts out
// with data-no-transition. For code that navigates: const go = useStackNavigate(); go("/werk").
//
// Clicks: the route is fetched from the click on, under the growing print, and RouteWatch holds the new page back
// until the screen is covered (a router navigation is a transition, and a transition that suspends keeps the old
// page). Back and forward: React commits a navigation started in a popstate at once, so the popstate is caught first,
// the print covers the page being left, and only then is the event handed to the router. A route that never arrives
// lifts the cover after 6 seconds. Scroll: a push lands at the top or on its #hash, back and forward where the reader
// left that page. Focus moves to the #hash target, else [data-transition-focus], else the h1, else main.
// whenUncovered (preloaders/preloader-slices-uncovered.ts, shared with the preloaders) times a page's entrance.
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
} from "react";
import { getImageProps } from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { gsap, useGSAP } from "../kit/gsap";
import { getLenis } from "../kit/SmoothScroll";
import { closeCurtain, liftCurtain, whenUncovered } from "../preloaders/preloader-slices-uncovered";

export { whenUncovered };

const T = {
  cover: 0.35, // the print growing to the full screen
  land: 0.38, // the full screen settling into the new hero
  lift: 0.42, // the cover leaving when there is nothing to land on
  wait: 0.06, // the longest a click waits for its print to decode before it shows the name instead
  settle: 2, // the longest a landed print waits over the page's own hero for that one to be drawn
  stall: 6, // the longest the cover waits for a route that never arrives
} as const;

const TARGET = "[data-stack-target]";
/** The most prints kept decoded at once; past it the oldest goes. */
const POOL = 12;

type Box = { x: number; y: number; w: number; h: number };
type Source = { src: string; srcSet?: string; sizes?: string };

type Navigate = (href: string, label?: string, image?: string) => void;
const StackContext = createContext<Navigate | null>(null);

/** router.push through the stack, optionally with the cover's name and photo. Outside the provider: router.push. */
export function useStackNavigate(): Navigate {
  const navigate = useContext(StackContext);
  const router = useRouter();
  return navigate ?? ((href: string) => router.push(href));
}

type Phase = "idle" | "covering" | "covered" | "landing";

/** A click's hold: the route on screen when it began, and the promise that settles when the screen is covered. */
type Gate = { from: string; shut: Promise<void> };

function entryKey(): string {
  const nav = (window as Window & { navigation?: { currentEntry?: { key?: string } } }).navigation;
  return nav?.currentEntry?.key ?? location.pathname + location.search;
}

function routeOf(url: URL | Location): string {
  const search = new URLSearchParams(url.search).toString();
  return url.pathname + (search ? `?${search}` : "");
}

function wordsOf(pathname: string): string {
  const last = decodeURIComponent(pathname.split("/").filter(Boolean).pop() ?? "").replace(/[-_]+/g, " ").trim();
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : "";
}

/** The image a link names, as next/image renders it at sizes="100vw": the same file the page's hero will pick. */
function sourceOf(src: string): Source {
  const { props } = getImageProps({ src, alt: "", fill: true, sizes: "100vw" });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

const rectOf = (r: DOMRect): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });

export function PageTransitionStack({
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
  const words = useRef({ name, labels });
  useEffect(() => {
    words.current = { name, labels };
  }, [name, labels]);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;
      const layer = el.querySelector("[data-layer]") as HTMLElement;
      const box = el.querySelector("[data-box]") as HTMLElement;
      const label = el.querySelector("[data-label]") as HTMLElement;
      const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      let phase: Phase = "idle";
      let kind: "push" | "pop" | null = null;
      let hash = "";
      let shown = routeOf(location);
      let shownKey = entryKey();
      let early = false;
      let replaying = false;
      let stall = 0;
      let shut: Promise<void> | null = null;
      let open = () => {};
      let afterShut: (() => void) | null = null;
      let motion: gsap.core.Animation | null = null;
      const scrolls = new Map<string, number>();
      const learnt = new Map<string, string>(); // names pages gave themselves, by route
      const heroes = new Map<string, Source>(); // each visited page's own hero photo, by route
      const pool = new Map<string, { img: HTMLImageElement; ready: boolean }>();
      let disposed = false; // strict mode runs this twice: a late idle callback of the first run must do nothing

      /** The decoded print for a source, created and decoded once, kept in the cover. */
      const print = (s: Source) => {
        if (disposed) return { img: document.createElement("img"), ready: false };
        let entry = pool.get(s.src);
        if (!entry) {
          const img = document.createElement("img");
          img.alt = "";
          img.decoding = "async";
          img.hidden = true;
          img.className = "absolute inset-0 h-full w-full object-cover";
          if (s.sizes) img.sizes = s.sizes;
          if (s.srcSet) img.srcset = s.srcSet;
          img.src = s.src;
          box.appendChild(img);
          const made = { img, ready: false };
          pool.set(s.src, made);
          // A bounded pool: past POOL prints the oldest goes, unless it is on screen.
          for (const [key, old] of pool) {
            if (pool.size <= POOL) break;
            if (!old.img.hidden) continue;
            old.img.remove();
            pool.delete(key);
          }
          img.decode().then(() => (made.ready = true), () => undefined);
          entry = made;
        }
        return entry;
      };
      /** The print, if it decodes within `ms`; otherwise null and the cover carries the name. */
      const printWithin = (s: Source | undefined, ms: number): Promise<HTMLImageElement | null> => {
        if (!s) return Promise.resolve(null);
        const entry = print(s);
        if (entry.ready) return Promise.resolve(entry.img);
        return Promise.race([
          entry.img.decode().then(() => entry.img, () => null),
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
        ]);
      };

      /** Remember what the page on screen is: its name, and its hero photo for a later back or forward. */
      const learn = () => {
        const own = document.querySelector<HTMLElement>("[data-transition-title]")?.dataset.transitionTitle?.trim();
        if (own) learnt.set(shown, own);
        const img = document.querySelector<HTMLImageElement>(`${TARGET} img`);
        const src = img?.getAttribute("src");
        if (img && src) {
          const s = { src, srcSet: img.getAttribute("srcset") ?? undefined, sizes: img.getAttribute("sizes") ?? undefined };
          heroes.set(shown, s);
          print(s);
        }
      };
      /** Decode the prints of the links in view, when the page is idle. */
      const warm = () => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
        (idle ?? ((cb: () => void) => window.setTimeout(cb, 200)))(() => {
          for (const a of document.querySelectorAll<HTMLAnchorElement>("a[data-transition-image]")) {
            const r = a.getBoundingClientRect();
            if (r.bottom > 0 && r.top < window.innerHeight) print(sourceOf(a.dataset.transitionImage!));
          }
        });
      };
      learn();
      warm();

      const wordFor = (url: URL, given?: string | null) => {
        const { name: home, labels: map } = words.current;
        return given?.trim() || map?.[url.pathname] || learnt.get(routeOf(url)) || wordsOf(url.pathname) || home;
      };

      const restoration = history.scrollRestoration;
      history.scrollRestoration = "manual";

      const scrollTo = (y: number) => {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      };

      // The print's geometry, all from plain numbers. The photo sits at its own aspect, scaled to cover a reference
      // box (the screen while covering, the new hero while landing) and centred on it; each frame a transform scales
      // and moves it to cover the frame F, and a clip shows only F.
      let photo: HTMLImageElement | null = null;
      let iw = 1;
      let ih = 1;
      let s1 = 1;
      let ref: Box = { x: 0, y: 0, w: 1, h: 1 };
      const F: Box = { x: 0, y: 0, w: 0, h: 0 };
      const screen = (): Box => ({ x: 0, y: 0, w: el.clientWidth, h: el.clientHeight });
      const layout = (r: Box) => {
        ref = r;
        s1 = Math.max(r.w / iw, r.h / ih);
        Object.assign(box.style, {
          left: `${r.x + r.w / 2 - (iw * s1) / 2}px`,
          top: `${r.y + r.h / 2 - (ih * s1) / 2}px`,
          width: `${iw * s1}px`,
          height: `${ih * s1}px`,
        });
      };
      // Landing on a hero whose window shows a larger registered photo (data-stack-photo inside the target): the
      // print is laid as that photo and stays put while the frame closes onto the window.
      let still = false;
      const paint = () => {
        const V = screen();
        layer.style.clipPath = `inset(${F.y}px ${V.w - F.x - F.w}px ${V.h - F.y - F.h}px ${F.x}px)`;
        if (!photo) return;
        if (still) {
          box.style.transform = "translate(0px, 0px) scale(1)";
          return;
        }
        const k = Math.max(F.w / iw, F.h / ih) / s1;
        const dx = F.x + F.w / 2 - (ref.x + ref.w / 2);
        const dy = F.y + F.h / 2 - (ref.y + ref.h / 2);
        box.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
      };

      /** The print's first place: a small portrait where the pointer is, kept on screen; centred without a pointer. */
      const startAt = (point: { x: number; y: number } | null): Box => {
        const V = screen();
        const w = Math.max(110, V.w < 768 ? V.w * 0.36 : V.w * 0.14);
        const h = (w * 4) / 3;
        const cx = point ? gsap.utils.clamp(w / 2 + 16, V.w - w / 2 - 16, point.x) : V.w / 2;
        const cy = point ? gsap.utils.clamp(h / 2 + 16, V.h - h / 2 - 16, point.y) : V.h / 2;
        return { x: cx - w / 2, y: cy - h / 2, w, h };
      };

      // A landed print waits over the page's hero; this counter makes a stale wait unable to tear down a newer
      // transition, and stopWait drops the scroll watch that ends the wait early.
      let settleId = 0;
      let stopWait = () => {};
      const reset = () => {
        still = false;
        settleId += 1;
        stopWait();
        stopWait = () => {};
        el.style.pointerEvents = "";
        phase = "idle";
        delete el.dataset.active;
        layer.style.clipPath = "";
        gsap.set(layer, { yPercent: 0 });
        for (const { img } of pool.values()) img.hidden = true;
        photo = null;
      };

      /** Cover the page on screen: the print appears at `from` and grows to the screen; `then` runs once covered. */
      const cover = contextSafe((from: Box, word: string, img: HTMLImageElement | null, then?: () => void) => {
        settleId += 1;
        if (!shut) shut = new Promise<void>((resolve) => (open = resolve));
        if (phase === "covered") {
          then?.();
          return;
        }
        afterShut = then ?? null;
        if (phase === "covering") return; // the running cover takes the newest route
        motion?.kill();
        if (phase === "landing") reset();
        phase = "covering";
        label.textContent = word;
        for (const { img: other } of pool.values()) other.hidden = other !== img;
        photo = img;
        box.hidden = !img;
        if (img) {
          iw = img.naturalWidth || 1;
          ih = img.naturalHeight || 1;
          layout(screen());
        }
        Object.assign(F, from);
        paint();
        el.dataset.active = "";
        const V = screen();
        motion = gsap.to(F, {
          ...V,
          duration: T.cover,
          ease: "power3.inOut",
          onUpdate: paint,
          onComplete: () => {
            phase = "covered";
            closeCurtain();
            open();
            const next = afterShut;
            afterShut = null;
            next?.();
            if (early) return land();
            window.clearTimeout(stall);
            stall = window.setTimeout(() => land(), T.stall * 1000);
          },
        });
      });

      /** The new page is in: land on its hero when the print is its photo and it is in view, else lift away. */
      const land = contextSafe(() => {
        window.clearTimeout(stall);
        phase = "landing";
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

        const V = screen();
        const hero = document.querySelector(TARGET);
        const heroImg = hero?.querySelector("img");
        const R = hero ? rectOf(hero.getBoundingClientRect()) : null;
        const matches = !!(photo && heroImg && heroImg.getAttribute("src") === photo.getAttribute("src"));
        const inView = !!(R && R.w > 0 && R.h > 0 && R.y < V.h && R.y + R.h > 0);

        requestAnimationFrame(() => {
          liftCurtain();
          motion?.kill();
          if (matches && inView && R) {
            // Re-seat the photo on the hero box (same picture on screen), then settle the frame into it.
            const photoEl = hero?.querySelector<HTMLElement>("[data-stack-photo]");
            if (photoEl) {
              layout(rectOf(photoEl.getBoundingClientRect()));
              still = true;
            } else layout(R);
            paint();
            motion = gsap.to(F, {
              ...R,
              duration: T.land,
              ease: "power2.inOut",
              onUpdate: paint,
              onComplete: () => {
                // Landed: the print now sits exactly over the page's own photo. It stays (the same picture, letting
                // every click through) until that photo is drawn, so a slow hero never shows as an empty box.
                // Only this wait may end itself: a click or back press in the meantime has moved settleId on.
                // A scroll ends it at once, so the print never hangs where the hero was while the page moves.
                el.style.pointerEvents = "none";
                const id = ++settleId;
                const done = () => {
                  if (id === settleId && phase === "landing") reset();
                };
                window.addEventListener("scroll", done, { once: true, passive: true });
                stopWait = () => window.removeEventListener("scroll", done);
                Promise.race([
                  heroImg!.decode().catch(() => undefined),
                  new Promise((resolve) => window.setTimeout(resolve, T.settle * 1000)),
                ]).then(() => requestAnimationFrame(done));
              },
            });
          } else {
            motion = gsap.to(layer, { yPercent: -100, duration: T.lift, ease: "power3.inOut", onComplete: reset });
          }
          warm();
        });
      });

      const navigate = (href: string, given?: string, image?: string, point?: { x: number; y: number } | null) => {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) {
          location.assign(url.href);
          return;
        }
        if (reduce()) {
          router.push(href);
          return;
        }
        if (phase === "idle" || phase === "landing") {
          if (routeOf(url) === shown) return; // already here
          scrolls.set(shownKey, window.scrollY);
        }
        kind = "push";
        hash = url.hash;
        const word = wordFor(url, given);
        if (given?.trim()) learnt.set(routeOf(url), given.trim());
        // The route is fetched from now on; RouteWatch holds it back until the screen is covered.
        if (!shut) shut = new Promise<void>((resolve) => (open = resolve));
        setGate({ from: shown, shut });
        router.push(url.pathname + url.search + url.hash, { scroll: false });
        const source = image ? sourceOf(image) : heroes.get(routeOf(url));
        printWithin(source, T.wait * 1000).then((img) => cover(startAt(point ?? null), word, img));
      };

      const arrived = (route: string) => {
        if (route === shown) return;
        if (phase === "covered" && kind) return land();
        if (phase === "covering" && kind) {
          early = true;
          return;
        }
        if (phase === "idle") {
          const wasPop = kind === "pop";
          kind = null;
          shown = route;
          shownKey = entryKey();
          learn();
          if (wasPop) scrollTo(scrolls.get(shownKey) ?? 0);
          if (reduce()) focusPage(null);
          warm();
        }
      };
      api.current = {
        navigate: (href, label, image) => navigate(href, label, image, null),
        arrived,
      };

      const linkOf = (e: Event) => (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;

      const onClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = linkOf(e);
        if (!a || a.hasAttribute("download") || a.hasAttribute("data-no-transition")) return;
        if (a.target && a.target !== "_self") return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || /\.[a-z0-9]{2,5}$/i.test(url.pathname)) return;
        if (routeOf(url) === shown && (url.hash || a.getAttribute("href")?.startsWith("#"))) return;
        if (reduce()) {
          scrolls.set(shownKey, window.scrollY);
          return;
        }
        e.preventDefault();
        // A keyboard press reports no pointer (detail 0): the print starts in the middle.
        const point = e.detail > 0 ? { x: e.clientX, y: e.clientY } : null;
        navigate(url.pathname + url.search + url.hash, a.dataset.transitionLabel, a.dataset.transitionImage, point);
      };
      const onIntent = (e: Event) => {
        const a = linkOf(e);
        if (!a || a.hasAttribute("data-no-transition")) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin || routeOf(url) === shown) return;
        router.prefetch(url.pathname + url.search);
        if (a.dataset.transitionImage) print(sourceOf(a.dataset.transitionImage));
      };

      // Back and forward: held in the capture phase while the print covers the page being left, then handed on.
      const onPop = (e: PopStateEvent) => {
        if (replaying) return;
        const route = routeOf(location);
        if (phase === "idle" || phase === "landing") {
          if (route === shown) return;
          scrolls.set(shownKey, window.scrollY);
        }
        kind = "pop";
        hash = "";
        if (reduce()) return;
        e.stopImmediatePropagation();
        const word = wordFor(new URL(location.href));
        const replay = () => {
          if (routeOf(location) === shown) return land();
          replaying = true;
          window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
          replaying = false;
        };
        printWithin(heroes.get(route), T.wait * 1000).then((img) => cover(startAt(null), word, img, replay));
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
        open();
        setGate(null);
        if (phase !== "idle") liftCurtain();
        disposed = true;
        stopWait();
        for (const { img } of pool.values()) img.remove();
        api.current = null;
      };
    },
    { scope: root },
  );

  const navigate = useCallback<Navigate>(
    (href, label, image) => {
      if (api.current) api.current.navigate(href, label, image);
      else router.push(href);
    },
    [router],
  );
  const arrived = useCallback((route: string) => api.current?.arrived(route), []);

  return (
    <StackContext.Provider value={navigate}>
      {children}
      <Suspense fallback={null}>
        <RouteWatch gate={gate} onRoute={arrived} />
      </Suspense>
      <div
        ref={root}
        data-page-transition="stack"
        aria-hidden="true"
        className="pointer-events-none invisible fixed inset-0 z-[90] data-[active]:pointer-events-auto data-[active]:visible"
      >
        {/* The print: the page ground with the destination's name, and over it the destination's photo when it is
            decoded. Only the frame's clip of it is ever seen. */}
        <div data-layer="" className="absolute inset-0">
          <div className="absolute inset-0 grid place-items-center bg-surface-0 px-6 text-ink">
            <p data-label="" className="font-display max-w-[14ch] text-center text-[12vw] leading-[0.9] tracking-[-0.04em] md:text-[6vw]" />
          </div>
          <div data-box="" className="absolute origin-center" />
        </div>
      </div>
    </StackContext.Provider>
  );
}

/**
 * Reports the route after every change, and during a click's cover holds the new route back: the router's push is a
 * transition, and a transition that suspends keeps the old page on screen until the screen is covered.
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
