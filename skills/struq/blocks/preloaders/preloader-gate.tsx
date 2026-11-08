"use client";
// preloader-gate (Struq preloader): the gate
// A film leader in the site's own voice. The first paint is the whole leader on a shut gate: two
// bars meeting on one line, a dial (two rings and a crosshair) and one figure in the display face.
// Only the sweep moves: the hand and an accent arc run once per figure, 3, 2, 1, on an eased count
// that waits for the fonts and the hero image. Then the leader drops away, the line through the
// middle runs out to both edges and lights in the accent, and the gate opens on it: the top bar
// rises, the bottom bar falls, each carrying half of the light, onto the page's own entrance.
//
// The clock starts at the first paint, not at hydration:
// 0.00  the gate shut, the leader whole; the count runs (CSS until React hydrates, then GSAP)
// 1.15  the count holds at its last beat until the fonts and the hero image are in (at most 0.15s)
// 1.15  the count completes (0.26s); the leader falls back; the line runs out and lights
// 1.45  the gate opens (0.78s, the curtain ease); the page's entrance starts 0.1s in
// 2.23  done, and never later than 2.4s after the first paint.
//
// Mount it first in <body> (app/layout.tsx), before the page it covers, and start the hero's own
// entrance with onGateOpen() inside its useGSAP, so the hero moves while the gate opens:
//
//   <body><PreloaderGate name="Noord, Rotterdam" />{children}</body>
//
// It needs no `js` class or head script of its own setup: the gate renders a small inline script
// just before itself, which shows it (before the first paint) only when JS runs, motion is allowed
// and this session has not seen it; blocks.css keeps it display none otherwise. Without JS it is
// never painted. If the bundle never arrives, the CSS still opens it and removes it by 2.4s.
// `force` plays it on every load (the lab, a launch page). The tone is "deep" (a step darker than
// the page in every palette), "inverse" or "field".
import { useRef, useState, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "../kit/gsap";

type Props = {
  /** The site's name, set small in the lower left while the leader runs. */
  name?: string;
  /** Play on every load (the lab, a launch page). Default: once per session. */
  force?: boolean;
  tone?: "deep" | "inverse" | "field";
};

const KEY = "struq:gate";
const SHOW_ID = "struq-gate-show";
/** Fired on window when the gate starts to open (or at once when it will not play). */
export const GATE_OPEN_EVENT = "struq:gate-open";

/**
 * A CSS cubic-bezier as a function, so GSAP can continue exactly the curve CSS started: one easing shape from the
 * first paint to the last beat, whichever clock is drawing it.
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const slope = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (progress: number) => {
    const target = Math.min(1, Math.max(0, progress));
    let t = target;
    for (let i = 0; i < 8; i += 1) {
      const error = x(t) - target;
      const d = slope(t);
      if (Math.abs(error) < 1e-6 || Math.abs(d) < 1e-6) break;
      t -= error / d;
    }
    return y(Math.min(1, Math.max(0, t)));
  };
}

/** The count's floor: 0 to 0.86 over 1.15s, in-out, as Lowlight. The same curve as blocks.css struq-gate-count. */
const FLOOR_CURVE = cubicBezier(0.45, 0, 0.55, 1);
const FLOOR_P = 0.86;

/** The schedule, in seconds from the first paint; blocks.css runs the same one when no script takes over. */
const FLOOR = 1.15;
const LATEST = 1.3;
const BUDGET = 2.4;
/** Hydrating later than this, the CSS clock has started the exit: the script lets it finish. */
const TAKEOVER = 1.4;

/**
 * Runs in the HTML before the gate is parsed, so before its first paint: it shows the gate only with motion
 * allowed and an unseen session (or force), and marks the first paint for the script that takes the clock over.
 */
const showScript = (force: boolean) =>
  `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&(${force}||sessionStorage.getItem("${KEY}")!=="1")){window.__struqGateT0=performance.now();var s=document.createElement("style");s.id="${SHOW_ID}";s.textContent="[data-preloader-gate]{display:block!important}";document.head.appendChild(s)}}catch(e){}`;

/** True while the gate is shut over the page: set an entrance's start state only then, so nothing blinks on a revisit. */
export function preloaderCovers(): boolean {
  const gate = document.querySelector<HTMLElement>("[data-preloader-gate]");
  return Boolean(gate && gate.dataset.phase === "shut" && getComputedStyle(gate).display !== "none");
}

/**
 * Calls `ready` when the gate starts to open, or at once when no gate covers the page (seen this
 * session, reduced motion, no gate mounted). Returns the cancel. Use it for the hero's entrance.
 */
export function onGateOpen(ready: () => void): () => void {
  if (!preloaderCovers()) {
    ready();
    return () => {};
  }
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    window.removeEventListener(GATE_OPEN_EVENT, fire);
    ceiling.kill();
    ready();
  };
  window.addEventListener(GATE_OPEN_EVENT, fire);
  // A gate that never reports can never keep the page blank.
  const ceiling = gsap.delayedCall(BUDGET, fire);
  return () => {
    fired = true;
    window.removeEventListener(GATE_OPEN_EVENT, fire);
    ceiling.kill();
  };
}

/** Keys that scroll the page; held while the gate is shut, so the page cannot move under it. */
const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);
function holdScroll() {
  const stop = (e: Event) => {
    if (e instanceof KeyboardEvent && !SCROLL_KEYS.has(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const opts = { capture: true, passive: false } as const;
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("touchmove", stop, opts);
  window.addEventListener("keydown", stop, opts);
  return () => {
    window.removeEventListener("wheel", stop, opts);
    window.removeEventListener("touchmove", stop, opts);
    window.removeEventListener("keydown", stop, opts);
  };
}

/** The script exists only in the server HTML and the hydration pass; a client-side mount never renders one. */
const noop = () => () => {};
function useServerPass() {
  return useSyncExternalStore(
    noop,
    () => false,
    () => true,
  );
}

const DIGITS = ["3", "2", "1"];

export function PreloaderGate({ name, force = false, tone = "deep" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const serverPass = useServerPass();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const open = () => {
        el.dataset.phase = "open";
        window.dispatchEvent(new Event(GATE_OPEN_EVENT));
      };
      const finish = () => {
        if (!force) {
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            // Private mode: the gate plays again on the next load. Acceptable.
          }
        }
        document.getElementById(SHOW_ID)?.remove();
        setDone(true);
      };
      // The inline script decided: not shown means it never plays (no motion, seen, or a client-side mount).
      if (getComputedStyle(el).display === "none") {
        open();
        setDone(true);
        return;
      }

      const t0 = (window as Window & { __struqGateT0?: number }).__struqGateT0 ?? performance.now();
      const elapsed = (performance.now() - t0) / 1000;
      const release = holdScroll();
      window.scrollTo(0, 0);

      // Hydrated late: the CSS clock is already into the exit. Let it finish, keep the hand-over on time.
      if (elapsed >= TAKEOVER) {
        const handover = gsap.delayedCall(Math.max(0, 1.7 - elapsed), open);
        const end = gsap.delayedCall(Math.max(0, BUDGET - elapsed), () => {
          release();
          finish();
        });
        return () => {
          handover.kill();
          end.kill();
          release();
        };
      }

      // Take the count over from the CSS clock: the same number, now written by GSAP.
      const q = gsap.utils.selector(el);
      const [top, bottom] = q("[data-bar]");
      const edges = q("[data-edge]");
      const lights = q("[data-light]") as HTMLElement[];
      const leader = q("[data-leader]")[0] as HTMLElement;
      const count = { p: parseFloat(getComputedStyle(el).getPropertyValue("--gate-p")) || 0 };
      const paint = () => el.style.setProperty("--gate-p", count.p.toFixed(4));
      el.dataset.driven = "";
      lights.forEach((l) => (l.style.scale = "none"));
      gsap.set(lights, { scaleX: 0 });
      paint();

      // The hero and the fonts, so the gate opens onto a finished picture.
      const hero = Array.from(document.images).find(
        (img) => !el.contains(img) && !img.complete && img.getBoundingClientRect().top < window.innerHeight,
      );
      const ready = Promise.all([document.fonts?.ready, hero?.decode().catch(() => undefined)]);

      const tl = gsap.timeline({
        onComplete: () => {
          release();
          finish();
        },
      });
      // The rest of the eased floor on the very curve the CSS clock was drawing (blocks.css, struq-gate-count), read
      // at the same moment from the first paint, so the count never changes pace at the hand-over. Then a hold on
      // the last beat while the page is not ready.
      if (elapsed < FLOOR) {
        const clock = { t: elapsed };
        const onFloor = () => {
          count.p = FLOOR_P * FLOOR_CURVE(clock.t / FLOOR);
          paint();
        };
        onFloor();
        tl.to(clock, { t: FLOOR, duration: FLOOR - elapsed, ease: "none", onUpdate: onFloor });
      } else {
        tl.to({}, { duration: 0.01 }); // a pause at time zero never fires
      }
      tl.addPause("+=0", () => {
        const now = (performance.now() - t0) / 1000;
        let resumed = false;
        const go = () => {
          if (resumed) return;
          resumed = true;
          cap.kill();
          tl.resume();
        };
        const cap = gsap.delayedCall(Math.max(0, LATEST - now), go);
        ready.then(go, go);
      });

      // The count completes, the leader falls away, the line runs out and lights, the gate opens on it.
      const span = window.innerWidth / Math.max(1, (edges[0] as HTMLElement).offsetWidth);
      tl.addLabel("exit")
        .to(count, { p: 1, duration: 0.26, ease: "power2.out", onUpdate: paint }, "exit")
        .to(leader, { scale: 0.92, autoAlpha: 0, duration: 0.3, ease: "power2.in" }, "exit+=0.2")
        .to(q("[data-name]"), { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, "exit+=0.2")
        .to(edges, { scaleX: span, duration: 0.42, ease: "power3.inOut" }, "exit+=0.2")
        .to(lights, { scaleX: 1, duration: 0.4, ease: "expo.out" }, "exit+=0.26")
        .to(top, { yPercent: -100, duration: 0.78, ease: "power4.inOut" }, "exit+=0.3")
        .to(bottom, { yPercent: 100, duration: 0.78, ease: "power4.inOut" }, "exit+=0.3")
        .call(open, [], "exit+=0.4");

      // The count stays where it was (data-driven and the inline number are kept), so a second run in strict mode
      // picks the leader up mid-beat instead of restarting the CSS clock.
      return () => {
        tl.kill();
        release();
      };
    },
    { scope: root },
  );

  if (done) return null;

  // Hairlines on the gate in its own ink, strong enough to hold on the darkest ground. Never a glow, never a fill.
  const ring = "color-mix(in oklch, var(--on-gate) 46%, transparent)";
  const inner = "color-mix(in oklch, var(--on-gate) 30%, transparent)";
  const cross = "color-mix(in oklch, var(--on-gate) 24%, transparent)";
  return (
    <>
      {serverPass ? <script dangerouslySetInnerHTML={{ __html: showScript(force) }} /> : null}
      <div
        ref={root}
        data-preloader-gate=""
        data-gate=""
        data-tone={tone}
        data-phase="shut"
        aria-hidden="true"
        className="fixed inset-0 z-[100] select-none"
      >
        {(["top", "bottom"] as const).map((side) => (
          <div
            key={side}
            data-bar={side}
            className={`absolute inset-x-0 h-1/2 bg-[var(--gate)] ${side === "top" ? "top-0" : "bottom-0 shadow-[0_-1px_0_0_var(--gate)]"}`}
          >
            {/* Half of the crosshair's line across rides on each bar's inner edge; at the exit it runs to both
                edges and the accent lights along it. */}
            <div
              data-edge=""
              className={`absolute inset-x-0 mx-auto h-px w-[min(89.6vw,30.8rem)] ${side === "top" ? "bottom-0" : "top-0"}`}
              style={{ background: cross }}
            >
              <div data-light="" className={`absolute inset-x-0 h-[2px] bg-accent ${side === "top" ? "bottom-0" : "top-0"}`} />
            </div>
          </div>
        ))}

        <div data-leader="" className="absolute left-1/2 top-1/2 aspect-square w-[min(64vw,22rem)] -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full overflow-visible" fill="none">
            <circle cx="100" cy="100" r="92" style={{ stroke: ring, strokeWidth: 0.8 }} />
            <circle cx="100" cy="100" r="78" style={{ stroke: inner, strokeWidth: 0.7 }} />
            <line x1="100" y1="-14" x2="100" y2="214" style={{ stroke: cross, strokeWidth: 0.7 }} />
            {/* The sweep: one accent arc per figure, drawn round the inner ring as the hand passes. */}
            {DIGITS.map((d, i) => (
              <circle
                key={d}
                data-beat=""
                data-sweep=""
                cx="100"
                cy="100"
                r="78"
                pathLength={1}
                strokeDasharray="1 1"
                transform="rotate(-90 100 100)"
                className="stroke-accent"
                style={{ strokeWidth: 1.4, ["--i" as string]: i }}
              />
            ))}
            <line data-hand="" x1="100" y1="100" x2="100" y2="8" className="stroke-accent" style={{ strokeWidth: 1.1 }} />
          </svg>

          {/* One figure at a time, cut on the beat. */}
          <div className="absolute inset-0 grid place-items-center font-display text-[min(32vw,10.5rem)] leading-none tracking-[-0.02em] text-[var(--on-gate)] [font-variant-numeric:lining-nums]">
            {DIGITS.map((d, i) => (
              <span key={d} data-beat="" className="[grid-area:1/1]" style={{ ["--i" as string]: i }}>
                {d}
              </span>
            ))}
          </div>
        </div>

        {name ? (
          <p
            data-name=""
            className="absolute bottom-[max(1.5rem,4vh)] left-6 text-small text-[color-mix(in_oklch,var(--on-gate)_64%,transparent)] md:left-[3vw]"
          >
            {name}
          </p>
        ) : null}
      </div>
    </>
  );
}
