"use client";
// preloader-wordmark (Struq preloader recipe)
// The first paint is the page's own ground with the studio's name set huge across the screen in the display face, at
// a light weight, measured to fit the width with the loaded face. While the page loads, each letter fills: a faint
// tone of the name first, then the full ink rising inside every letter, a little later in each letter than the one
// before. The fill is driven by real progress (the display face in, the hero photo decoded) between a floor (it never
// flashes past) and a cap (it never hangs). Then the name opens onto the page as a curtain, three ways:
//
//   split   the filled name splits along a line through its middle; the top half rises and the bottom half falls,
//           each carrying its half of the cover.
//   drop    the letters drop away one by one, left to right, each taking its column of the cover with it, so the
//           page arrives letter by letter.
//   settle  the name shrinks and travels into the header's wordmark (the page marks it data-wordmark-target) while
//           the cover lifts, so the preloader's name becomes the site's mark; on landing the page's own wordmark
//           takes over in place.
//
// First paint to clear never exceeds 2.4 seconds: the fill takes at least a second, and whatever the page still owes
// at the cap is filled in quickly so the opening keeps its full length. The page under the cover is already in its
// rest state, so the opening uncovers the finished page with no seam: every edge the cover is cut along sits on a whole
// pixel, and the cuts only appear in the frame the opening starts.
//
// Mount it once, before the page it covers, and mark the header's wordmark for `settle`:
//   <PreloaderWordmark name="Noord" variant="split" />
//   <header><a href="/" data-wordmark-target>Noord</a></header>
// blocks.css sets that wordmark in the preloader's own face, weight and tracking, so the hand-over is exact. A hero
// that wants its entrance in the cover's wake uses the shared signal (preloader-slices-uncovered.ts):
//   useGSAP((_, contextSafe) => whenUncovered(contextSafe!(() => { ...the entrance... })), { scope })
//
// The block owns its gate. A tiny script inside the cover runs while the browser parses it, before the first paint:
// only with no earlier play this session does it arm the cover, close the curtain on <html>, hold the page still
// (wheel, touch and scroll keys) and start the page at the top. A second tiny script, parsed right after the name,
// loads the display face, fits the name to the width and only then shows it, so the name is never drawn in a fallback
// face (and stays unseen if its face never comes). From the first paint the fill runs on CSS alone (one number,
// --wm-p), which the block's script takes over where it stands when it hydrates. If the bundle never arrives, that CSS
// fades the cover out from 1.95 seconds and hides it at 2.3, and the hold lets go at 2.4: the hero is never left
// covered. Without JavaScript the cover never paints. Reduced motion: the filled name, held briefly, then a short fade.
// `always` plays it on every load (the lab).
import { useRef, useState, type CSSProperties } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import { closeCurtain, covered, liftCurtain, whenUncovered } from "./preloader-slices-uncovered";

export { whenUncovered };

export const WORDMARK_VARIANTS = [
  { id: "split", title: "Gespleten" },
  { id: "drop", title: "Letter voor letter" },
  { id: "settle", title: "In de kop" },
] as const;

export type WordmarkVariant = (typeof WORDMARK_VARIANTS)[number]["id"];

const SEEN_KEY = "struq:preloader-wordmark";

/** Seconds, measured from the first paint. */
const BUDGET = 2.4;
const T = {
  floor: 1.0, // the fill never completes sooner than this
  rush: 0.3, // at the cap, whatever is left of the fill is drawn in this long
  beat: 0.14, // the filled name holds this long before it opens
  follow: 0.16, // the fill follows real progress with this time constant
  pace: 0.8, // and never slower than this (of the whole fill, per second) while it has ground to make up
  late: 1.8, // a script that hydrates later than this leaves the CSS clock to finish (its fade starts at 1.95)
  reduceLate: 1.05, // reduced motion: the same, before the CSS fade that starts at 1.1
  minExit: 0.45, // an opening shorter than this is not worth showing
  reduceHold: 0.7, // reduced motion: the filled name stays at least until this time
  reduceWait: 1.0, // reduced motion: waits for the page at most until this time
  reduceFade: 0.3,
} as const;
/** The opening's length per variant. */
const EXIT: Record<WordmarkVariant, number> = { split: 0.86, drop: 0.94, settle: 1.0 };

/**
 * Runs while the browser parses the cover, before the first paint. Never throws. Marks the session as played the
 * moment it arms, so every way the cover can end (its own opening, a late script, the CSS failsafe) counts as the one
 * play of the session.
 */
const ARM = `(function(){try{var e=document.currentScript.parentElement,w=window;if(!e.hasAttribute("data-always")&&sessionStorage.getItem("${SEEN_KEY}")==="1")return;e.setAttribute("data-t0",String(performance.now()));if(matchMedia("(prefers-reduced-motion: reduce)").matches)e.setAttribute("data-reduce","");e.setAttribute("data-armed","");try{sessionStorage.setItem("${SEEN_KEY}","1")}catch(x){}document.documentElement.setAttribute("data-curtain","closed");if(!location.hash){history.scrollRestoration="manual";scrollTo(0,0)}var keys=" PageDown PageUp ArrowDown ArrowUp Home End".split(" ");keys[0]=" ";var opt={capture:true,passive:false},stop=function(v){if(v.type==="keydown"&&keys.indexOf(v.key)<0)return;v.preventDefault();v.stopImmediatePropagation()},types=["wheel","touchmove","keydown"],off=function(){types.forEach(function(t){w.removeEventListener(t,stop,opt)});w.__preloaderWordmarkHold=null};types.forEach(function(t){w.addEventListener(t,stop,opt)});w.__preloaderWordmarkHold=off;setTimeout(off,${BUDGET * 1000})}catch(x){}})()`;

/**
 * Runs right after the name is parsed: loads the display face for the name's own letters, fits the name to the width
 * and measures each letter's ink (inkOf below, the same sum) and only then marks the cover data-fit, which shows it.
 * Refits when another face finishes loading. A face that fails to load leaves the name unseen rather than drawn in a
 * fallback.
 */
const fitScript = (text: string) =>
  `(function(){try{var r=document.currentScript.closest("[data-preloader]");if(!r||!r.hasAttribute("data-armed"))return;var n=r.querySelector("[data-base] [data-name]"),f=document.fonts;var ink=function(){try{var s=getComputedStyle(n),x=document.createElement("canvas").getContext("2d");if(!x)return;x.font=s.fontStyle+" "+s.fontWeight+" 1000px "+s.fontFamily;var h=x.measureText("H"),cap=h.actualBoundingBoxAscent/1000,top=CSS.supports("text-box","trim-both cap alphabetic")?cap:(h.fontBoundingBoxAscent+(1000-h.fontBoundingBoxAscent-h.fontBoundingBoxDescent)/2)/1000;if(!(top>0))return;r.style.setProperty("--wm-mid",(top-cap/2).toFixed(4));Array.prototype.forEach.call(n.children,function(c,i){var m=x.measureText(c.firstChild.textContent);r.style.setProperty("--wm-a-"+i,(top-m.actualBoundingBoxAscent/1000).toFixed(4)+"em");r.style.setProperty("--wm-b-"+i,(top+m.actualBoundingBoxDescent/1000).toFixed(4)+"em")})}catch(x){}};var fit=function(){if(r.hasAttribute("data-open"))return;ink();var b=n.parentElement,c=getComputedStyle(b),room=b.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight);r.style.setProperty("--wm-size","100px");var w=n.getBoundingClientRect().width;if(w>0&&room>0)r.style.setProperty("--wm-size",Math.min(100*room/w,innerHeight*0.8).toFixed(2)+"px")};var go=function(){fit();r.setAttribute("data-fit","");f&&f.addEventListener("loadingdone",fit)};if(!f)return go();var s=getComputedStyle(n),fam=s.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g,""),has=false;f.forEach(function(x){if(x.family.replace(/^["']|["']$/g,"")===fam)has=true});f.load(s.fontStyle+" "+s.fontWeight+" 100px "+s.fontFamily,${text}).then(function(l){if(l.length||!has)go()},function(){})}catch(x){}})()`;

/** Lets go of the hold the arm script put on the page. */
function releaseHold() {
  (window as Window & { __preloaderWordmarkHold?: (() => void) | null }).__preloaderWordmarkHold?.();
}

/** The fill's floor: an in-out curve, the same one blocks.css draws before the script takes over. */
const floorCurve = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
};
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Any CSS colour as rgb(), through a one-pixel canvas, so GSAP can tween it whatever syntax the palette uses. */
function rgbOf(color: string): string {
  const cv = document.createElement("canvas");
  cv.width = 1;
  cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return color;
  ctx.fillStyle = "#000";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Measures where each letter's ink sits in its cell, in em, so the fill's window runs from the bottom of the ink to the
 * top of it exactly (blocks.css): --wm-a-<i> is the top of the ink below the cell's top (negative above it), --wm-b-<i>
 * the bottom. The cell is the cap band where the browser trims text boxes, and the whole line box where it does not
 * (Firefox), so the baseline's depth in the cell comes from the face's own metrics there. --wm-mid is the middle of the
 * cap band, where `split` cuts.
 */
function inkOf(el: HTMLElement) {
  const n = el.querySelector<HTMLElement>("[data-base] [data-name]");
  const x = n ? document.createElement("canvas").getContext("2d") : null;
  if (!n || !x) return;
  const s = getComputedStyle(n);
  // Measured at 1000px, so the bounds (whole pixels in some engines) land within a thousandth of an em.
  const u = 1000;
  x.font = `${s.fontStyle} ${s.fontWeight} ${u}px ${s.fontFamily}`;
  const h = x.measureText("H");
  const cap = h.actualBoundingBoxAscent / u;
  const top = CSS.supports("text-box", "trim-both cap alphabetic")
    ? cap
    : (h.fontBoundingBoxAscent + (u - h.fontBoundingBoxAscent - h.fontBoundingBoxDescent) / 2) / u;
  if (!(top > 0)) return;
  el.style.setProperty("--wm-mid", (top - cap / 2).toFixed(4));
  Array.from(n.children).forEach((c, i) => {
    const m = x.measureText(c.firstChild?.textContent ?? "");
    el.style.setProperty(`--wm-a-${i}`, `${(top - m.actualBoundingBoxAscent / u).toFixed(4)}em`);
    el.style.setProperty(`--wm-b-${i}`, `${(top + m.actualBoundingBoxDescent / u).toFixed(4)}em`);
  });
}

/** Fits the name to the width left inside its box, measured in the face it is drawn in. */
function fitName(el: HTMLElement) {
  const n = el.querySelector<HTMLElement>("[data-base] [data-name]");
  const box = n?.parentElement;
  if (!n || !box) return;
  const cs = getComputedStyle(box);
  const room = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  el.style.setProperty("--wm-size", "100px");
  const w = n.getBoundingClientRect().width;
  if (w > 0 && room > 0) el.style.setProperty("--wm-size", `${Math.min((100 * room) / w, window.innerHeight * 0.8).toFixed(2)}px`);
}

/** The box of a node's text itself (the glyphs' advance and content area), not of the element around it. */
function textBox(node: Element): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

/** Set once the cover has played in this document, so a remount never replays it. */
let playedThisDocument = false;
/** A teardown's lift, held back one task so a remount in the same commit (strict mode) can take it back. */
let pendingTeardown = 0;

type Props = {
  /** The studio's name, set across the screen. One or two short words read best. */
  name: string;
  /** How the name opens onto the page. */
  variant?: WordmarkVariant;
  /** `settle` only: the header's wordmark the name travels into. Without one in view it lifts with the cover. */
  target?: string;
  /** Play on every load, ignoring the session (the lab uses it). */
  always?: boolean;
  /** Called as the opening begins. */
  onReveal?: () => void;
  className?: string;
};

export function PreloaderWordmark({
  name,
  variant = "split",
  target = "[data-wordmark-target]",
  always = false,
  onReveal,
  className = "",
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const letters = Array.from(name);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      window.clearTimeout(pendingTeardown);
      const armed = el.hasAttribute("data-armed");
      const t0 = Number(el.dataset.t0 ?? performance.now());
      const since = () => Math.max(0, (performance.now() - t0) / 1000);
      let mark: HTMLElement | null = null;
      const showMark = () => {
        if (mark) mark.style.visibility = "";
      };
      const quit = () => {
        releaseHold();
        showMark();
        if (covered()) liftCurtain();
        setDone(true);
      };
      const gaveUp = armed && getComputedStyle(el).visibility === "hidden";
      if (!armed || gaveUp || (playedThisDocument && !always)) return quit();

      const reduce = el.hasAttribute("data-reduce");
      // Hydrated late: the CSS clock is about to fade the cover (from 1.95s, or 1.1s with reduced motion) and hides it
      // soon after. Let it, and only tidy up once it has. Any earlier, the script takes the cover over, full or not,
      // and opens it in the variant's own move, shortened to the time left (exitFor).
      if (since() > (reduce ? T.reduceLate : T.late)) {
        const later = window.setTimeout(quit, Math.max(0, BUDGET - since()) * 1000);
        return () => window.clearTimeout(later);
      }

      playedThisDocument = true;
      // Take the fill over from the CSS clock where it stands, then stop the clock (and its failsafe).
      let p = reduce ? 1 : parseFloat(getComputedStyle(el).getPropertyValue("--wm-p")) || 0;
      const render = () => el.style.setProperty("--wm-p", p.toFixed(4));
      render();
      el.dataset.live = "";
      closeCurtain();

      let finished = false;
      let cancelled = false;
      // The script's own ceiling, now that the CSS one is off: whatever happens, the cover is gone by then.
      const ceiling = window.setTimeout(() => {
        if (!finished) quit();
      }, Math.max(0, BUDGET + 0.3 - since()) * 1000);

      // Real progress: the name in its own face (the fit script, or this one if that never ran) and every photo in
      // the first screen decoded.
      if (!el.hasAttribute("data-fit")) {
        const n = el.querySelector<HTMLElement>("[data-base] [data-name]");
        const s = n ? getComputedStyle(n) : null;
        if (s && document.fonts) {
          document.fonts.load(`${s.fontStyle} ${s.fontWeight} 100px ${s.fontFamily}`, name).then(
            (loaded) => {
              if (cancelled || el.hasAttribute("data-fit") || !loaded.length) return;
              inkOf(el);
              fitName(el);
              el.dataset.fit = "";
            },
            () => undefined,
          );
        }
      }
      let pageReady = false;
      const photos = Array.from(document.images).filter((img) => {
        if (el.contains(img)) return false;
        const r = img.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      });
      Promise.all(photos.map((img) => img.decode().catch(() => undefined))).then(() => (pageReady = true));

      const onResize = () => {
        if (!el.hasAttribute("data-open") && el.hasAttribute("data-fit")) fitName(el);
      };
      window.addEventListener("resize", onResize);

      const q = gsap.utils.selector(el);
      const base = q("[data-base]")[0] as HTMLElement;
      const baseGround = base.querySelector<HTMLElement>("[data-ground]")!;
      const baseName = base.querySelector<HTMLElement>("[data-name]")!;
      let exitTl: gsap.core.Timeline | null = null;

      const finish = () => {
        finished = true;
        window.clearTimeout(ceiling);
        showMark();
        setDone(true);
      };

      /** Hand over: the page is its own from here, and its entrance starts. */
      const handOver = () => {
        el.dataset.open = "";
        releaseHold();
        liftCurtain();
        onReveal?.();
      };

      // Reduced motion: the filled name, held briefly, then a short fade. No travel.
      if (reduce) {
        let poll = 0;
        const wait = () => {
          if (cancelled) return;
          const t = since();
          const ready = pageReady && el.hasAttribute("data-fit");
          if (t >= T.reduceHold && (ready || t >= T.reduceWait)) {
            handOver();
            exitTl = gsap.timeline({ onComplete: finish }).to(el, { opacity: 0, duration: T.reduceFade, ease: "power1.out" });
            return;
          }
          poll = window.setTimeout(wait, 30);
        };
        wait();
        return () => {
          cancelled = true;
          window.clearTimeout(poll);
          window.clearTimeout(ceiling);
          window.removeEventListener("resize", onResize);
          exitTl?.kill();
          if (finished) return;
          playedThisDocument = false;
          pendingTeardown = window.setTimeout(() => {
            releaseHold();
            if (covered()) liftCurtain();
          }, 0);
        };
      }

      // The opening: its full length when there is room, shorter when the script came late.
      const exitFor = () => Math.min(EXIT[variant], BUDGET - since() - 0.04);
      const fillBy = BUDGET - EXIT[variant] - T.beat - 0.04;

      /** Opens the cover. Every cut is decided now, on whole pixels, and appears in this same frame. */
      const open = () => {
        const dur = exitFor();
        if (dur < T.minExit) return quit();
        const vw = el.clientWidth;
        const vh = el.clientHeight;
        const ease = "power4.inOut";
        const y = (v: number) => `translate3d(0, ${Math.round(v)}px, 0)`;
        const tl = gsap.timeline({ onComplete: finish });
        exitTl = tl;

        if (variant === "split") {
          // The line through the middle of the name's cap band (measured in inkOf, so it holds where text boxes are
          // not trimmed), on a whole pixel.
          const r = baseName.getBoundingClientRect();
          const mid = parseFloat(el.style.getPropertyValue("--wm-mid"));
          const fs = parseFloat(getComputedStyle(baseName).fontSize);
          const cut = Math.round(r.top + (mid > 0 && fs > 0 ? mid * fs : r.height / 2));
          const [top, bottom] = q("[data-piece]") as HTMLElement[];
          top.style.clipPath = `inset(0px 0px ${vh - cut}px 0px)`;
          bottom.style.clipPath = `inset(${cut}px 0px 0px 0px)`;
          top.style.visibility = "inherit";
          bottom.style.visibility = "inherit";
          base.style.visibility = "hidden";
          const s = { p: 0 };
          tl.to(s, {
            p: 1,
            duration: dur,
            ease,
            onUpdate: () => {
              top.style.transform = y(-cut * s.p);
              bottom.style.transform = y((vh - cut) * s.p);
            },
          });
        } else if (variant === "drop") {
          // One column per letter, its edges halfway between the letters, on whole pixels; each column carries its own
          // letter. Letters sit above every column (blocks.css), so a glyph's overhang is never cut by a neighbour.
          const boxes = (baseName.querySelectorAll("[data-l]") as NodeListOf<HTMLElement>);
          const rects = Array.from(boxes, (b) => b.getBoundingClientRect());
          const edges = rects.map((r, i) => (i === 0 ? 0 : Math.round((rects[i - 1].right + r.left) / 2)));
          edges.push(vw);
          const pieces = q("[data-piece]") as HTMLElement[];
          const count = pieces.length;
          const stagger = count > 1 ? Math.min(0.075, (dur * 0.34) / (count - 1)) : 0;
          const fall = dur - stagger * (count - 1);
          pieces.forEach((piece, i) => {
            const ground = piece.querySelector<HTMLElement>("[data-ground]")!;
            const letter = piece.querySelector<HTMLElement>("[data-fitbox]")!;
            ground.style.clipPath = `inset(0px ${vw - edges[i + 1]}px 0px ${edges[i]}px)`;
            piece.style.visibility = "inherit";
            const s = { p: 0 };
            tl.to(
              s,
              {
                p: 1,
                duration: fall,
                ease: "power3.in",
                onUpdate: () => {
                  const t = y(vh * s.p);
                  ground.style.transform = t;
                  letter.style.transform = t;
                },
              },
              i * stagger,
            );
          });
          base.style.visibility = "hidden";
        } else {
          // settle: the cover lifts; the name shrinks and travels into the header's wordmark, in its colour.
          const found = document.querySelector<HTMLElement>(target);
          const tr = found?.getBoundingClientRect();
          const inView = !!found && !!tr && tr.width > 0 && tr.bottom > 0 && tr.top < vh;
          const s = { p: 0 };
          let paint = () => {
            const t = y(-vh * s.p);
            baseGround.style.transform = t;
            baseName.style.transform = t;
          };
          if (inView && found) {
            mark = found;
            const from = textBox(baseName);
            const to = textBox(found);
            const own = baseName.getBoundingClientRect();
            const k = parseFloat(getComputedStyle(found).fontSize) / parseFloat(getComputedStyle(baseName).fontSize);
            // The name scales about its own top left corner, by an even ratio per step (k ** m), so the eye reads one
            // steady shrink rather than a late collapse; its text box travels a straight line from where it stands to
            // where the wordmark's is.
            const offX = from.left - own.left;
            const offY = from.top - own.top;
            baseName.style.transformOrigin = "0 0";
            baseName.style.willChange = "transform";
            const ink = rgbOf(getComputedStyle(baseName).color);
            const markInk = rgbOf(getComputedStyle(found).color);
            baseName.style.setProperty("--wm-ink", ink);
            if (markInk !== ink) tl.to(baseName, { "--wm-ink": markInk, duration: dur * 0.8, ease: "power2.inOut" }, dur * 0.2);
            // The page's own wordmark waits unseen until the name lands on it, so the mark is never there twice.
            found.style.visibility = "hidden";
            const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
            const travel = { p: 0 };
            paint = () => {
              baseGround.style.transform = y(-vh * s.p);
              const m = travel.p;
              const sc = k ** m;
              const tx = lerp(from.left, to.left, m) - own.left - sc * offX;
              const ty = lerp(from.top, to.top, m) - own.top - sc * offY;
              baseName.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(5)})`;
            };
            // The name leaves a beat after the cover starts to lift, and slows into the mark as the cover clears.
            tl.to(travel, { p: 1, duration: dur * 0.94, ease: "power3.inOut", onUpdate: paint }, dur * 0.06);
          }
          tl.to(s, { p: 1, duration: dur, ease, onUpdate: paint }, 0);
          tl.add(() => {
            // Landed: the page's own wordmark takes over in the same frame the name goes.
            baseName.style.visibility = "hidden";
            showMark();
          });
        }
        handOver();
      };

      // The fill: follows real progress under the floor's curve, never back; at the cap whatever is left is drawn in.
      let phase: "fill" | "beat" | "open" = "fill";
      let beatUntil = 0;
      let rushFrom: number | null = null;
      let last = since();
      const tick = () => {
        if (cancelled) return;
        const t = since();
        const dt = Math.max(0, t - last);
        last = t;
        if (phase === "fill") {
          const real = 0.2 + (el.hasAttribute("data-fit") ? 0.3 : 0) + (pageReady ? 0.5 : 0);
          const allowed = floorCurve(t / T.floor);
          const goal = Math.min(allowed, real);
          // An eased follow with a least pace, so the last of the fill never creeps.
          const gap = Math.max(0, goal - p);
          let next = p + Math.max(gap * (1 - Math.exp(-dt / T.follow)), Math.min(gap, dt * T.pace));
          const rushStart = fillBy - T.rush;
          if (t >= rushStart) {
            if (rushFrom === null) rushFrom = p;
            const k = Math.min(1, (t - rushStart) / Math.max(0.01, fillBy - rushStart));
            next = Math.max(next, rushFrom + (1 - rushFrom) * smooth(k));
          }
          if (goal >= 1 && next > 0.996) next = 1;
          p = Math.min(1, Math.max(p, next));
          render();
          if (p >= 1) {
            phase = "beat";
            beatUntil = Math.min(t + T.beat, fillBy + T.beat);
          }
        } else if (phase === "beat" && t >= beatUntil) {
          phase = "open";
          gsap.ticker.remove(tick);
          open();
        }
      };
      gsap.ticker.add(tick);

      return () => {
        cancelled = true;
        gsap.ticker.remove(tick);
        window.clearTimeout(ceiling);
        window.removeEventListener("resize", onResize);
        exitTl?.kill();
        if (finished) return;
        // Torn down before it finished. In strict mode's double mount the remount comes in the same commit and takes
        // this back; a real unmount lets the page go: hold released, curtain lifted, wordmark shown, entrances run.
        playedThisDocument = false;
        showMark();
        pendingTeardown = window.setTimeout(() => {
          releaseHold();
          if (covered()) liftCurtain();
        }, 0);
      };
    },
    { scope: root },
  );

  if (done) return null;

  const lag = letters.length > 1 ? 0.6 / (letters.length - 1) : 0;
  /** The name, one cell per letter: the faint tone and the ink over it, which rises through a mask (blocks.css). */
  const nameOf = (only?: number) => (
    <span data-name="" style={{ "--wm-lag": lag } as CSSProperties}>
      {letters.map((ch, i) => {
        const glyph = ch === " " ? " " : ch;
        return (
          <span
            key={i}
            data-l=""
            className={only !== undefined && only !== i ? "invisible" : undefined}
            style={{ "--i": i, "--wm-a": `var(--wm-a-${i}, -0.08em)`, "--wm-b": `var(--wm-b-${i}, 0.04em)` } as CSSProperties}
          >
            <span data-faint="">{glyph}</span>
            <span data-ink="">{glyph}</span>
          </span>
        );
      })}
    </span>
  );
  const fitbox = (only?: number) => (
    <div data-fitbox="" className="absolute inset-0 flex items-center justify-center px-[max(1rem,4vw)]">
      {nameOf(only)}
    </div>
  );

  return (
    <div
      ref={root}
      data-preloader="wordmark"
      data-variant={variant}
      data-always={always ? "" : undefined}
      aria-hidden="true"
      suppressHydrationWarning
      className={`pointer-events-none fixed inset-0 z-[100] select-none text-ink ${className}`}
    >
      <script dangerouslySetInnerHTML={{ __html: ARM }} />
      {/* The whole cover as one piece: what the first paint shows and what fills. */}
      <div data-base="" className="absolute inset-0">
        <div data-ground="" className="pointer-events-auto absolute inset-0 bg-surface-0" />
        {fitbox()}
      </div>
      {/* Parsed right after the name: shows it (blocks.css) once its own face is in and it is fitted. */}
      <script
        dangerouslySetInnerHTML={{ __html: fitScript(JSON.stringify(name).replace(/</g, "\\u003c")) }}
      />
      {/* The cover cut for the opening, unseen until the frame it starts in. */}
      {variant === "split"
        ? (["top", "bottom"] as const).map((half) => (
            <div key={half} data-piece={half} className="invisible absolute inset-0">
              <div data-ground="" className="pointer-events-auto absolute inset-0 bg-surface-0" />
              {fitbox()}
            </div>
          ))
        : null}
      {variant === "drop"
        ? letters.map((_, i) => (
            <div key={i} data-piece="" className="invisible absolute inset-0">
              <div data-ground="" className="pointer-events-auto absolute inset-0 bg-surface-0" />
              {fitbox(i)}
            </div>
          ))
        : null}
    </div>
  );
}
