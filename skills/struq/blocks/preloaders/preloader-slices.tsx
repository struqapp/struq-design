"use client";
// preloader-slices (Struq preloader recipe)
// The first paint is a dark cover cut into vertical slices (four, three on phones), already composed: the client's
// name large in the top left, a caption beside it, a hairline across the foot and the count at 000 under it. The count
// runs to 100 in one continuous move while the line fills, holds a beat, and then the slices drop away one after the
// other, left to right. What they carry stays where it is: each slice's top edge, marked by a 5px accent line, wipes
// its strip of the name and the count away as it falls, and uncovers the page from the top, the title first, the
// photo after. The page's own entrance starts as the first slice moves (whenUncovered).
//
// First paint to clear never exceeds 2.4 seconds. The count gives up whatever hydration took; when the script takes
// over later than 1.1 seconds after the paint there is no count at all, only a shortened drop; later still (or if the
// bundle never comes), the cover simply goes.
//
// Mount it once, in app/layout.tsx, before {children}:
//   <PreloaderSlices name="Noord" caption="Architectenbureau, Rotterdam" />
// A hero that wants its entrance in the cover's wake (helper in preloader-slices-uncovered.ts, which ships with it):
//   useGSAP((_, contextSafe) => whenUncovered(contextSafe!(() => { ...the entrance... })), { scope })
//
// The block owns its own gate. A tiny script inside the cover runs while the browser parses it, before the first
// paint. Only with motion allowed and no earlier play this session does it arm the cover (data-armed), close the
// curtain on <html>, hold the page still (wheel, touch and scroll keys) and start the page at the top. So without
// JavaScript, under reduced motion and on a revisit the cover never paints and nothing waits or holds. If the bundle
// never arrives, a CSS failsafe hides the armed cover at 2.3 seconds and the hold lets go at 2.4.
// `always` plays it on every load (the lab, a showreel).
import { useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import { closeCurtain, covered, liftCurtain, whenUncovered } from "./preloader-slices-uncovered";

export { whenUncovered };

const SEEN_KEY = "struq:preloader-slices";

/** Seconds, measured from the first paint. */
const BUDGET = 2.4;
const T = {
  count: 1.15, // the count at its fullest; hydration time comes off it
  minCount: 0.3,
  late: 1.1, // a takeover later than this skips the count
  hold: 0.12, // the beat at 100
  exit: 0.7, // one slice dropping away
  minExit: 0.25, // a drop shorter than this is not worth showing: the cover just goes
  stagger: 0.05,
} as const;

/**
 * Runs while the browser parses the cover, before the first paint: arms it, stamps the paint time, closes the
 * curtain, starts the page at the top and holds it still until the lift (or 2.4s at most). Never throws.
 */
const ARM = `(function(){try{var e=document.currentScript.parentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(!e.hasAttribute("data-always")&&sessionStorage.getItem("${SEEN_KEY}")==="1")return;e.setAttribute("data-t0",String(performance.now()));e.setAttribute("data-armed","");document.documentElement.setAttribute("data-curtain","closed");if(!location.hash){history.scrollRestoration="manual";scrollTo(0,0)}var k={" ":1,PageDown:1,PageUp:1,ArrowDown:1,ArrowUp:1,Home:1,End:1},o={capture:true,passive:false},s=function(v){v.preventDefault();v.stopImmediatePropagation()},d=function(v){if(k[v.key])v.preventDefault()},r=function(){removeEventListener("wheel",s,o);removeEventListener("touchmove",s,o);removeEventListener("keydown",d,true);window.__preloaderSlicesHold=null};addEventListener("wheel",s,o);addEventListener("touchmove",s,o);addEventListener("keydown",d,true);window.__preloaderSlicesHold=r;setTimeout(r,${BUDGET * 1000})}catch(x){}})()`;

/** The gate: hidden unless armed, gone at 2.3s if the script never takes over, never under reduced motion. */
const GATE = `[data-preloader="slices"]{display:none}
[data-preloader="slices"][data-armed]{display:block;animation:preloader-slices-failsafe 0s 2.3s forwards}
[data-preloader="slices"][data-live]{animation:none}
@keyframes preloader-slices-failsafe{to{visibility:hidden}}
@media (prefers-reduced-motion:reduce){[data-preloader="slices"]{display:none!important}}`;

/** Lets go of the hold the arm script put on the page. */
function releaseHold() {
  (window as Window & { __preloaderSlicesHold?: (() => void) | null }).__preloaderSlicesHold?.();
}

/**
 * The cover is always the dark of the palette. On a light palette that is its ink (the inverse); on a dark one the
 * inverse is the cream text, which would flash a light sheet over a dark site, so there the cover is the page's own
 * ground lifted one step. Two layers do it without knowing the palette: the lifted ground below, and the inverse on
 * top at full strength when it is dark and fully transparent when it is light. Browsers without relative colour get
 * the plain inverse.
 */
const COVER = {
  "--slices-base": "oklch(from var(--surface-0) min(l + 0.07, 0.27) c h)",
  "--slices-ink": "oklch(from var(--inverse) l c h / clamp(0, (0.5 - l) * 100, 1))",
} as CSSProperties;
// Written out in full, so Tailwind finds the classes.
const COVER_BG = "bg-inverse supports-[color:oklch(from_red_l_c_h)]:bg-[var(--slices-base)]";
const COVER_INK = "absolute inset-0 hidden bg-[var(--slices-ink)] supports-[color:oklch(from_red_l_c_h)]:block";

const SLICES = [0, 1, 2, 3];

/** Where a slice rests off screen: a little past it, so its 5px accent edge is out of view too. */
const PARK = 102;

/** Set once the cover has played in this document, so a remount never replays it. */
let playedThisDocument = false;
/** A teardown's lift, held back one task so a remount in the same commit (strict mode) can take it back. */
let pendingTeardown = 0;

type Props = {
  /** The client's name, the display word of the cover. */
  name?: string;
  /** One short line beside the name: what and where. */
  caption?: string;
  /** Play on every load, ignoring the session (the lab uses it). */
  always?: boolean;
  /** Called the moment the slices start to leave. */
  onReveal?: () => void;
  className?: string;
};

export function PreloaderSlices({ name, caption, always = false, onReveal, className = "" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      window.clearTimeout(pendingTeardown);
      const armed = el.hasAttribute("data-armed");
      const elapsed = Math.max(0, (performance.now() - Number(el.dataset.t0 ?? performance.now())) / 1000);
      const sheets = gsap.utils.toArray<HTMLElement>("[data-sheet]", el).filter((s) => getComputedStyle(s).display !== "none");
      const stagger = T.stagger * (sheets.length - 1);
      const quit = () => {
        releaseHold();
        if (covered()) liftCurtain();
        setDone(true);
      };
      // Not armed, already played, or the failsafe already took it away.
      const gaveUp = armed && getComputedStyle(el).visibility === "hidden";
      if (!armed || gaveUp || (playedThisDocument && !always)) return quit();
      // Too late for any drop worth showing: the cover just goes, inside the budget.
      const room = BUDGET - elapsed - stagger - 0.03;
      if (room < T.minExit) return quit();

      playedThisDocument = true;
      el.dataset.live = "";
      closeCurtain();
      let finished = false;
      let cancelled = false;

      const q = gsap.utils.selector(el);
      const faces = sheets.map((s) => s.querySelector("[data-face]") as HTMLElement);
      const counts = q("[data-count]");
      const fills = q("[data-fill]");
      const state = { p: 0 };
      const render = () => {
        const text = String(Math.round(state.p * 100)).padStart(3, "0");
        for (const c of counts) c.textContent = text;
        for (const f of fills) f.style.transform = `scaleX(${state.p})`;
      };

      // The plan from what is left of the budget. On time: the count, the beat, the full drop. Late: straight to a
      // drop that ends on the budget.
      const onTime = elapsed <= T.late;
      const exit = onTime ? T.exit : Math.min(T.exit, room);
      const count = onTime ? gsap.utils.clamp(T.minCount, T.count, BUDGET - elapsed - T.hold - T.exit - stagger - 0.03) : 0;
      const hold = onTime ? T.hold : 0;
      // Fonts and the first screen's photos may stretch the beat at 100, never past the budget.
      const spare = onTime ? Math.max(0, BUDGET - elapsed - count - hold - exit - stagger - 0.03) : 0;
      const firstScreen = Array.from(document.images).filter((img) => {
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && !img.complete;
      });
      let ready = false;
      let parked = false;
      let ceiling = 0;
      Promise.all([
        document.fonts?.ready ?? Promise.resolve(),
        ...firstScreen.map((img) => img.decode().catch(() => undefined)),
      ]).then(() => {
        ready = true;
        if (parked && !cancelled) {
          window.clearTimeout(ceiling);
          tl.resume();
        }
      });

      const tl = gsap.timeline();
      if (count > 0) {
        // One move from 000 to 100: an even ease with no rest in it, so the number never stalls on the way.
        tl.to(state, { p: 1, duration: count, ease: "power1.inOut", onUpdate: render });
        tl.add(() => {
          if (ready || spare < 0.05) return;
          parked = true;
          tl.pause();
          ceiling = window.setTimeout(() => tl.resume(), spare * 1000);
        });
      } else {
        state.p = 1;
        render();
      }
      tl.addLabel("exit", `+=${hold}`)
        .add(() => {
          // Hand over: the page's entrance starts as the first slice moves, and the top of the page shows first.
          el.dataset.lifted = "";
          releaseHold();
          liftCurtain();
          onReveal?.();
        }, "exit")
        // The face holds still against the falling slice, so the top edge wipes it and nothing of the cover's type
        // ever travels into the page's title.
        .to(sheets, { yPercent: PARK, duration: exit, ease: "power3.inOut", stagger: T.stagger }, "exit")
        .to(faces, { yPercent: -PARK, duration: exit, ease: "power3.inOut", stagger: T.stagger }, "exit")
        .add(() => {
          // Persist last: the next load's arm script reads it.
          finished = true;
          try {
            sessionStorage.setItem(SEEN_KEY, "1");
          } catch {
            // Private mode: it plays again on the next load.
          }
          setDone(true);
        });

      return () => {
        cancelled = true;
        window.clearTimeout(ceiling);
        if (finished) return;
        // Torn down before it finished. In strict mode's double mount the remount comes in the same commit and
        // takes this back; a real unmount lets the page go: hold released, curtain lifted, entrances run.
        playedThisDocument = false;
        pendingTeardown = window.setTimeout(() => {
          releaseHold();
          if (covered()) liftCurtain();
        }, 0);
      };
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div
      ref={root}
      data-preloader="slices"
      data-always={always ? "" : undefined}
      aria-hidden="true"
      suppressHydrationWarning
      className={`@container fixed inset-0 z-[100] [--n:4] max-md:[--n:3] ${className}`}
      style={COVER}
    >
      <script dangerouslySetInnerHTML={{ __html: ARM }} />
      <style href="preloader-slices" precedence="default">
        {GATE}
      </style>
      {/* One face, cut into strips. Every strip holds the whole face, offset to its own place, so the name and the
          count read as one until the strips part. */}
      {SLICES.map((i) => (
        <div
          key={i}
          data-sheet=""
          className={`absolute inset-y-0 text-on-photo ${COVER_BG} ${i === 3 ? "max-md:hidden" : ""}`}
          style={slice(i)}
        >
          {/* The leading edge: a fixed 5px of accent along the top, outside the sheet, seen only while it moves. */}
          <div className="absolute inset-x-0 bottom-full h-[5px] bg-accent" />
          <div className="absolute inset-0 overflow-hidden">
            <div className={COVER_INK} />
            <div data-face="" className="absolute inset-y-0" style={{ left: `calc(${-i} * 100cqw / var(--n))`, width: "100cqw" }}>
              <Face name={name} caption={caption} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One strip's place: an n-th of the width, a pixel wider so no seam of the page shows between two strips. */
function slice(i: number): CSSProperties {
  return { left: `calc(${i} * 100cqw / var(--n))`, width: "calc(100cqw / var(--n) + 1px)" };
}

function Face({ name, caption }: { name?: string; caption?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between px-6 pb-5 pt-5 md:px-[4vw] md:pb-[2.2vw] md:pt-[2.2vw]">
      <div className="flex items-start justify-between gap-6">
        {name ? (
          <p className="font-display text-[18vw] leading-[0.86] tracking-[-0.04em] md:text-[9.5vw]">{name}</p>
        ) : (
          <span />
        )}
        {caption ? <p className="text-small mt-[0.4em] max-w-[22ch] text-right text-on-photo/65 max-md:hidden">{caption}</p> : null}
      </div>
      <div>
        {caption ? <p className="text-small mb-3 text-on-photo/65 md:hidden">{caption}</p> : null}
        <div className="relative h-px w-full bg-on-photo/20">
          <div data-fill="" className="absolute inset-0 origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
        </div>
        <div className="font-display mt-3 flex justify-end pb-[0.02em] pt-[0.1em] text-[31vw] leading-[0.8] tracking-[-0.045em] md:mt-[0.6vw] md:text-[15vw]">
          <p data-count="" className="tabular-nums lining-nums">
            000
          </p>
        </div>
      </div>
    </div>
  );
}
