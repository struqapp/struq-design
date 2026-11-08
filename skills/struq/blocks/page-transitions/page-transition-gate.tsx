"use client";
// page-transition-gate (Struq page transition): the gate, on every navigation
// The preloader's leader carried into navigation. The click shuts the gate: two bars come in from
// top and bottom, each carrying one half of a slate (the dial's rings and the destination's name in
// the display face), while the page recedes behind them. The halves meet on the middle line and
// lock into one frame: the line lights in the accent and an accent arc runs once round the dial.
// The route changes under the locked frame. Then the gate opens on that line, the name and the
// rings split in two and ride away with the bars, and the new page settles forward through it while
// its own entrance (onGateReveal) starts in the gap.
//
// 0.00  click: the bars close (0.38s), the page behind recedes to 0.97
// 0.30  the line lights from the centre; the arc runs round the dial (0.26s)
// 0.38  locked: the navigation runs under the frame, which holds at least 0.16s
// 0.54  the gate opens (0.36s); the page settles from 1.035 and its entrance starts with it
// 0.90  open. A slower route holds the locked frame, never a blank page.
//
// Mount it once in app/layout.tsx and wrap only the page content in GateStage; keep a fixed header
// outside the stage, since the stage is scaled during a journey:
//
//   <PageTransitionGate name="Noord" />
//   <SiteHeader />
//   <GateStage>{children}</GateStage>
//   <GateLink href="/werk" label="Werk">Bekijk het werk</GateLink>
//   const router = useGateRouter(); router.push("/contact", "Contact");
//
// A page's own entrance: set its start state only while transitionCovers() is true and play it in
// onGateReveal(), so it starts as the gate opens instead of half played under the shut frame.
//
// Back and forward get the same gate over the live page (canvases, video and a fixed header stay as
// they are). The browser's traversal is undone at once with history.go, the gate shuts, and the
// same traversal is made again for the router under the locked frame: public history calls only,
// nothing replayed into the router. A back press at any moment gives one coherent journey: before
// a push is sent it replaces the push; while a page is on its way it is made under the same shut
// frame once that page lands; while the gate opens it starts the next journey when it is open.
// This needs the Navigation API (every current engine); without it a traversal is the router's own,
// without the gate. Scroll is restored per history entry (a new page at the top or its #hash, a page
// you return to where you left it) and focus moves to the new page's [data-page-focus], its h1 or
// its main. Reduced motion: no gate and no scaling; scroll and focus are handled the same way.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import { getLenis } from "../kit/SmoothScroll";

/** Fired on window when the gate starts to open on a new page. */
export const GATE_REVEAL_EVENT = "struq:gate-reveal";

const CLOSE = 0.38;
/** The least time the locked frame holds once the new page is in. */
const SHUT = 0.16;
const OPEN = 0.36;
/** Door to door; images in view may hold the frame only while this budget lasts. */
const BUDGET = 0.9;
/** A route that never arrives still opens the gate. */
const CEILING = 6;

type Phase = "idle" | "covering" | "covered" | "revealing";
type Gate = { cover: (from?: number) => void; reveal: () => void; label: (text: string) => void; reduce: boolean };
type Nav = {
  currentEntry?: { key?: string; index?: number };
  entries?: () => Array<{ key: string }>;
};

/**
 * One store for the document, outside React. A page that remounts on navigation (a route whose search params
 * change remounts its page segment) takes its provider with it; the journey must survive that, so it lives here
 * and the new provider picks it up mid-close or shut.
 */
const store = {
  phase: "idle" as Phase,
  kind: "push" as "push" | "pop",
  /** The URL the gate shut on; the new page has landed when the rendered URL differs from it. */
  from: "",
  /** The URL the provider last rendered. */
  rendered: "",
  /** The history index of the page on screen. */
  index: -1,
  hash: "",
  label: "",
  name: "",
  startedAt: 0,
  /** The journey's request (the push, or the traversal) has gone to the router. */
  sent: false,
  /** A traversal waiting for the shut frame: the sum of the back and forward presses not yet made. */
  go: 0,
  /** A traversal pressed after the request was sent: made once the current page lands or the gate is open. */
  after: 0,
  /** Our own history.go calls: the undo of the browser's traversal, and the traversal made for the router. */
  bouncing: false,
  passing: false,
  /** Without the Navigation API (or under reduced motion) a traversal is the router's own: no gate to open. */
  instant: false,
  landed: false,
  arriving: false,
  onCovered: null as (() => void) | null,
  gate: null as Gate | null,
  ceiling: null as gsap.core.Tween | null,
  positions: new Map<string, number>(),
  labels: new Map<string, string>(),
  release: null as (() => void) | null,
};

function nav(): Nav | undefined {
  return (window as Window & { navigation?: Nav }).navigation;
}

function navIndex() {
  return nav()?.currentEntry?.index ?? -1;
}

function urlKey(pathname = location.pathname, search = location.search) {
  const params = new URLSearchParams(search).toString();
  return params ? `${pathname}?${params}` : pathname;
}

/** The history entry's own key where the Navigation API exists, else its URL. */
function entryKey() {
  return nav()?.currentEntry?.key ?? urlKey();
}

/** The slate's word for the entry `delta` steps from the page on screen. */
function labelAt(delta: number) {
  const entry = nav()?.entries?.()[store.index + delta];
  return (entry && store.labels.get(entry.key)) || store.name;
}

function scrollTop(y: number) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  window.scrollTo(0, y);
}

/** The element that recedes and settles: the live page content. */
function stage(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-gate-stage]");
}

const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);
/** Holds wheel, touch and scroll keys while the gate is shut, so neither page moves under it. */
function holdScroll() {
  if (store.release) return;
  const stop = (e: Event) => {
    if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const opts = { capture: true, passive: false } as const;
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("touchmove", stop, opts);
  window.addEventListener("keydown", stop, opts);
  store.release = () => {
    window.removeEventListener("wheel", stop, opts);
    window.removeEventListener("touchmove", stop, opts);
    window.removeEventListener("keydown", stop, opts);
    store.release = null;
  };
}

function armCeiling() {
  store.ceiling?.kill();
  store.ceiling = gsap.delayedCall(CEILING, () => {
    if (store.phase === "covered") arrive();
  });
}

/** Makes a traversal for the router (it sees this popstate as usual); waits for an undo still on its way. */
function traverse(delta: number) {
  if (store.bouncing) {
    gsap.delayedCall(0.03, () => traverse(delta));
    return;
  }
  store.sent = true;
  store.go = 0;
  store.kind = "pop";
  store.passing = true;
  history.go(delta);
  armCeiling();
}

/** Undoes the browser's traversal, so the router keeps the page on screen until the gate is shut. */
function undo(delta: number) {
  store.bouncing = true;
  history.go(-delta);
  // A traversal that never reports (a history that changed under it) can never block the next one.
  gsap.delayedCall(0.5, () => {
    store.bouncing = false;
  });
}

/** The cover reached the locked frame: run what waits on it, and open if the page has already landed. */
function coverDone() {
  store.phase = "covered";
  const next = store.onCovered;
  store.onCovered = null;
  next?.();
  if (store.landed) scheduleArrive();
}

/** One tick later, so a provider that strict mode mounts twice has settled before the gate opens. */
function scheduleArrive() {
  if (store.arriving) return;
  store.arriving = true;
  gsap.delayedCall(0, () => {
    if (store.phase === "covered") arrive();
    else store.arriving = false;
  });
}

/** The new page is rendered under the locked frame: place the scroll, move focus, open. */
function arrive() {
  store.ceiling?.kill();
  store.ceiling = null;
  store.landed = false;
  store.passing = false;
  store.rendered = urlKey();
  store.index = navIndex();
  if (store.kind === "push" && store.label) store.labels.set(entryKey(), store.label);

  // A back or forward press made while this page was on its way: made now, under the same shut frame.
  if (store.after !== 0 && !store.instant) {
    const delta = store.after;
    store.after = 0;
    store.arriving = false;
    store.from = store.rendered;
    store.label = labelAt(delta);
    store.gate?.label(store.label);
    traverse(delta);
    return;
  }

  let y = store.kind === "pop" ? (store.positions.get(entryKey()) ?? 0) : 0;
  if (store.kind === "push" && store.hash) {
    const target = document.getElementById(decodeURIComponent(store.hash.slice(1)));
    if (target) y = target.getBoundingClientRect().top + window.scrollY;
  }
  scrollTop(y);

  const focus =
    document.querySelector<HTMLElement>("[data-page-focus]") ??
    document.querySelector<HTMLElement>("main h1, h1") ??
    document.querySelector<HTMLElement>("main");
  if (focus) {
    if (!focus.hasAttribute("tabindex")) focus.setAttribute("tabindex", "-1");
    focus.focus({ preventScroll: true });
  }

  const gate = store.gate;
  if (!gate || gate.reduce || store.instant) {
    store.arriving = false;
    window.dispatchEvent(new Event(GATE_REVEAL_EVENT));
    finish();
    return;
  }
  // The locked frame holds for its beat; images in view get what is left of the budget on top of that.
  const elapsed = (performance.now() - store.startedAt) / 1000;
  const hold = Math.max(0, CLOSE + SHUT - elapsed);
  const left = Math.max(hold, BUDGET - OPEN - elapsed);
  const pending = Array.from(document.images).filter((img) => {
    if (img.complete || img.closest("[data-gate]")) return false;
    const box = img.getBoundingClientRect();
    return box.bottom > 0 && box.top < window.innerHeight;
  });
  let opened = false;
  let held = false;
  let loaded = pending.length === 0;
  const open = () => {
    if (opened) return;
    opened = true;
    soonest.kill();
    latest.kill();
    store.arriving = false;
    store.gate?.reveal();
  };
  const soonest = gsap.delayedCall(hold, () => {
    held = true;
    if (loaded) open();
  });
  const latest = gsap.delayedCall(left, open);
  if (!loaded) {
    Promise.all(pending.map((img) => img.decode().catch(() => undefined))).then(() => {
      loaded = true;
      if (held) open();
    });
  }
}

/** The journey is over: back to idle, then a back or forward press made while the gate was opening. */
function finish() {
  store.phase = "idle";
  store.instant = false;
  store.passing = false;
  store.release?.();
  getLenis()?.start();
  if (store.after !== 0) {
    const delta = store.after;
    store.after = 0;
    begin("pop", labelAt(delta), () => traverse(delta));
  }
}

/** Starts a journey: the label goes on the slate, the gate shuts, `then` runs on the locked frame. */
function begin(kind: "push" | "pop", label: string, then: (() => void) | null) {
  store.kind = kind;
  store.from = store.rendered || urlKey();
  store.label = label;
  store.landed = false;
  store.sent = false;
  store.startedAt = performance.now();
  store.onCovered = then;
  store.phase = "covering";
  holdScroll();
  getLenis()?.stop();
  const gate = store.gate;
  if (!gate) {
    coverDone();
    return;
  }
  gate.label(label);
  gate.cover();
}

/**
 * Back or forward, at any moment. Our own history.go calls pass (the one for the router) or are swallowed (the
 * undo). Anything else is the reader's: undone at once, then made part of the journey.
 */
function onPopState(e: PopStateEvent) {
  if (store.passing) {
    store.passing = false;
    return;
  }
  if (store.bouncing) {
    e.stopImmediatePropagation();
    store.bouncing = false;
    return;
  }
  const index = navIndex();
  const gate = store.gate;
  // No Navigation API, no gate or reduced motion: the router's own traversal, with scroll and focus kept.
  if (index < 0 || store.index < 0 || !gate || gate.reduce) {
    if (store.phase === "idle" && urlKey() !== store.rendered) {
      store.kind = "pop";
      store.from = store.rendered;
      store.phase = "covered";
      store.sent = true;
      store.instant = true;
      armCeiling();
    }
    return;
  }
  const delta = index - store.index;
  if (delta === 0) return;
  e.stopImmediatePropagation();
  undo(delta);

  if (store.phase === "idle") {
    store.hash = "";
    begin("pop", labelAt(delta), () => traverse(delta));
    return;
  }
  if (!store.sent) {
    // The gate is still closing on a push or a traversal not yet made: this press replaces it.
    store.go = (store.kind === "pop" ? store.go : 0) + delta;
    store.kind = "pop";
    store.hash = "";
    const go = store.go;
    store.label = labelAt(go);
    gate.label(store.label);
    store.onCovered = go === 0 ? () => scheduleArrive() : () => traverse(go);
    if (go === 0) {
      // Back and forward cancelled out: the same page opens again.
      store.landed = true;
      store.from = "";
    }
    return;
  }
  // A page is on its way, or the gate is opening: the press waits for it, then runs.
  store.after += delta;
}

type Router = ReturnType<typeof useRouter>;

function navigate(router: Router, href: string, label?: string, replace = false) {
  const url = new URL(href, location.href);
  if (url.origin !== location.origin) {
    location.assign(url.href);
    return;
  }
  const key = urlKey(url.pathname, url.search);
  const target = url.pathname + url.search + url.hash;
  // The same page (a hash link) or no gate mounted: the router's own way.
  if (key === urlKey() || !store.gate) {
    if (replace) router.replace(target);
    else router.push(target);
    return;
  }
  // A click while the gate is already moving: the first journey wins.
  if (store.phase !== "idle") return;
  store.hash = url.hash;
  store.positions.set(entryKey(), window.scrollY);
  router.prefetch(target);
  begin("push", label || store.name, () => {
    store.sent = true;
    if (replace) router.replace(target, { scroll: false });
    else router.push(target, { scroll: false });
    armCeiling();
  });
}

/** The router, with the gate: push and replace shut it first, back goes through the browser and the same gate. */
export function useGateRouter() {
  const router = useRouter();
  return {
    push: useCallback((href: string, label?: string) => navigate(router, href, label), [router]),
    replace: useCallback((href: string, label?: string) => navigate(router, href, label, true), [router]),
    back: useCallback(() => window.history.back(), []),
  };
}

/** The name the slate shows for a link: its `label`, else its text when short, else the site's name. */
function linkLabel(a: HTMLAnchorElement, label?: string) {
  if (label) return label;
  const text = a.textContent?.trim() ?? "";
  return text.length > 0 && text.length <= 14 ? text : "";
}

/** next/link through the gate. Modified clicks, new tabs and downloads stay the browser's own. */
export function GateLink({ onClick, replace, label, ...props }: ComponentProps<typeof Link> & { label?: string }) {
  const router = useRouter();
  return (
    <Link
      {...props}
      replace={replace}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.currentTarget;
        if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return;
        e.preventDefault();
        navigate(router, a.href, linkLabel(a, label), Boolean(replace));
      }}
    />
  );
}

/** True while the gate is shut or shutting: a page mounting now is under it, and its entrance should wait. */
export function transitionCovers(): boolean {
  return store.phase === "covering" || store.phase === "covered";
}

/**
 * Calls `ready` when the gate opens on this page, or at once when no journey is in progress (the first load).
 * Returns the cancel. A page's entrance goes here, its start state only while transitionCovers() is true.
 */
export function onGateReveal(ready: () => void): () => void {
  if (!transitionCovers()) {
    ready();
    return () => {};
  }
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    window.removeEventListener(GATE_REVEAL_EVENT, fire);
    ceiling.kill();
    ready();
  };
  window.addEventListener(GATE_REVEAL_EVENT, fire);
  const ceiling = gsap.delayedCall(CEILING + 1, fire);
  return () => {
    fired = true;
    window.removeEventListener(GATE_REVEAL_EVENT, fire);
    ceiling.kill();
  };
}

/** The page content the gate moves. Keep position: fixed elements (a fixed header) outside it. */
export function GateStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-gate-stage="" className={className}>
      {children}
    </div>
  );
}

/** Reads the rendered URL. Its own Suspense boundary, so useSearchParams never pulls a static page into the client. */
function UrlWatch({ onUrl }: { onUrl: (key: string) => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = urlKey(pathname, search.toString());
  useEffect(() => onUrl(key), [key, onUrl]);
  return null;
}

/** One half of the slate: the full screen's leader, clipped by its bar, so the halves meet into one frame. */
function Slate({ side }: { side: "top" | "bottom" }) {
  const ring = "color-mix(in oklch, var(--on-gate) 46%, transparent)";
  const inner = "color-mix(in oklch, var(--on-gate) 30%, transparent)";
  const cross = "color-mix(in oklch, var(--on-gate) 24%, transparent)";
  return (
    <div className={`absolute inset-x-0 h-[200%] ${side === "top" ? "top-0" : "bottom-0"}`}>
      <div className="absolute left-1/2 top-1/2 aspect-square w-[min(64vw,22rem)] -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full overflow-visible" fill="none">
          <circle cx="100" cy="100" r="92" style={{ stroke: ring, strokeWidth: 0.8 }} />
          <circle cx="100" cy="100" r="78" style={{ stroke: inner, strokeWidth: 0.7 }} />
          <line x1="100" y1="-14" x2="100" y2="214" style={{ stroke: cross, strokeWidth: 0.7 }} />
          <circle
            data-arc=""
            cx="100"
            cy="100"
            r="78"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset="1"
            transform="rotate(-90 100 100)"
            className="stroke-accent"
            style={{ strokeWidth: 1.4 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span
            data-gate-label=""
            className="whitespace-nowrap font-display text-[min(13vw,7.25rem)] leading-none tracking-[-0.03em] text-[var(--on-gate)]"
          />
        </div>
      </div>
    </div>
  );
}

export function PageTransitionGate({
  name = "",
  tone = "deep",
  children,
}: {
  /** The site's name: the slate's word when a journey has no label of its own. */
  name?: string;
  tone?: "deep" | "inverse" | "field";
  /** Rendered as is, never wrapped: put the page content in GateStage. */
  children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    store.name = name;
  }, [name]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [top, bottom] = q("[data-bar]");
      const lights = q("[data-light]");
      const arcs = q("[data-arc]");
      const words = q("[data-gate-label]");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      /** Scale about the middle of the screen, wherever the page is scrolled to. */
      const origin = () => `50% ${window.scrollY + window.innerHeight / 2}px`;

      let running: gsap.core.Timeline | null = null;

      const locked = () => {
        gsap.set(el, { autoAlpha: 1 });
        gsap.set([top, bottom], { yPercent: 0 });
        gsap.set(lights, { scaleX: 1 });
        gsap.set(arcs, { strokeDashoffset: 0 });
      };
      const away = () => {
        gsap.set(el, { autoAlpha: 0 });
        gsap.set(top, { yPercent: -100 });
        gsap.set(bottom, { yPercent: 100 });
        gsap.set(lights, { scaleX: 0 });
        gsap.set(arcs, { strokeDashoffset: 1 });
      };

      const gate: Gate = {
        reduce,
        label: (text) => words.forEach((w) => (w.textContent = text)),
        cover: (from = 0) => {
          if (reduce) {
            coverDone();
            return;
          }
          running?.kill();
          gsap.set(el, { autoAlpha: 1 });
          const page = stage();
          running = gsap
            .timeline()
            .fromTo(top, { yPercent: -100 }, { yPercent: 0, duration: CLOSE, ease: "power3.inOut" }, 0)
            .fromTo(bottom, { yPercent: 100 }, { yPercent: 0, duration: CLOSE, ease: "power3.inOut" }, 0)
            .fromTo(lights, { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: "expo.out" }, CLOSE - 0.08)
            .fromTo(arcs, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.26, ease: "power2.inOut" }, CLOSE - 0.08)
            .call(coverDone, [], CLOSE);
          if (page) {
            running.fromTo(page, { scale: 1 }, { scale: 0.97, transformOrigin: origin(), duration: CLOSE, ease: "power2.in" }, 0);
          }
          if (from > 0) running.time(Math.min(from, CLOSE - 0.001), true);
        },
        reveal: () => {
          store.phase = "revealing";
          running?.kill();
          locked();
          running = gsap
            .timeline({
              onComplete: () => {
                away();
                finish();
              },
            })
            .to(top, { yPercent: -100, duration: OPEN, ease: "power4.inOut" }, 0)
            .to(bottom, { yPercent: 100, duration: OPEN, ease: "power4.inOut" }, 0)
            .call(() => window.dispatchEvent(new Event(GATE_REVEAL_EVENT)), [], 0.04);
          // The page comes forward through the opening gate; its own tween, so the gate is free once open.
          const page = stage();
          if (page) {
            gsap.fromTo(
              page,
              { scale: 1.035, transformOrigin: origin() },
              { scale: 1, duration: 0.9, ease: "expo.out", clearProps: "transform,transformOrigin" },
            );
          }
        },
      };
      store.gate = gate;
      if (store.label) gate.label(store.label);
      if (store.index < 0) store.index = navIndex();

      // Mounted mid-journey (the page remounted on the way): pick the gate up where the last one was.
      if (store.phase === "covering") {
        if (reduce) away();
        else gate.cover((performance.now() - store.startedAt) / 1000);
      } else if (store.phase === "covered") {
        if (reduce) away();
        else locked();
      } else {
        away();
      }

      window.addEventListener("popstate", onPopState, true);
      const previous = history.scrollRestoration;
      history.scrollRestoration = "manual";
      const record = () => {
        if (store.phase === "idle") store.positions.set(entryKey(), window.scrollY);
      };
      window.addEventListener("scroll", record, { passive: true });

      return () => {
        running?.kill();
        window.removeEventListener("popstate", onPopState, true);
        window.removeEventListener("scroll", record);
        history.scrollRestoration = previous;
        if (store.gate === gate) store.gate = null;
      };
    },
    { scope: root },
  );

  const onUrl = useCallback((key: string) => {
    if ((store.phase === "covering" || store.phase === "covered") && key !== store.from) {
      store.landed = true;
      if (store.phase === "covered") scheduleArrive();
      return;
    }
    if (store.phase === "idle") {
      store.rendered = key;
      store.index = navIndex();
    }
  }, []);

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <UrlWatch onUrl={onUrl} />
      </Suspense>
      <div
        ref={root}
        data-page-transition-gate=""
        data-gate=""
        data-tone={tone}
        aria-hidden="true"
        className="invisible fixed inset-0 z-[90] select-none"
      >
        {(["top", "bottom"] as const).map((side) => (
          <div
            key={side}
            data-bar={side}
            className={`absolute inset-x-0 h-1/2 overflow-hidden bg-[var(--gate)] ${side === "top" ? "top-0" : "bottom-0 shadow-[0_-1px_0_0_var(--gate)]"}`}
          >
            <Slate side={side} />
            {/* The leading edge carries a hairline, so the bar reads on a page as dark as itself; when the frame
                locks, the accent runs along it from the centre. */}
            <div
              className={`absolute inset-x-0 h-px bg-[color-mix(in_oklch,var(--on-gate)_24%,transparent)] ${side === "top" ? "bottom-0" : "top-0"}`}
            >
              <div
                data-light=""
                className={`absolute inset-x-0 h-[2px] bg-accent ${side === "top" ? "bottom-0" : "top-0"}`}
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
