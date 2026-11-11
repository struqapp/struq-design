"use client";
// preloader-stack (Struq preloader recipe)
// The first paint is the page's own ground, with the client's name and a quiet count where a small portrait frame
// will sit. Once the photos are decoded the frame appears on a hard cut, and photos cut inside it, five or six of them,
// each held a little shorter than the last, like a thumb running through a stack of contact prints, while the count
// runs to 100. The last photo is the hero's own. It holds for a beat, and then the frame grows from its small size to
// the exact place and crop of the hero image on the page, so the cover becomes the hero with no seam: when the frame
// lands the cover is gone and the same image simply stays. Everything outside the hero image is uncovered as the grow
// begins, and the page's own entrance starts there (whenUncovered).
//
// First paint to clear never exceeds 2.4 seconds: the flip gets whatever is left after hydration, the hero's beat and
// the grow, and it cuts fewer photos rather than wait or rush. Never a blank or half-decoded frame: every photo is
// decoded before its cut (the flip photos at frame size, the hero at hero size); a photo that is not ready in time is
// skipped, and if the hero itself is not ready in time the cover simply goes.
//
// Mount it once, in app/layout.tsx or on the page, with the hero's own photo, and mark the hero image's box:
//   <PreloaderStack name="Noord" photos={images.card.slice(0, 5)} hero={heroImage} />
//   <div data-stack-target className="relative h-[72svh]"><Image src={heroImage.src} fill sizes="100vw" className="object-cover" /></div>
// The landing matches the page exactly when the page's hero is an object-cover image (centred) filling that box with
// sizes="100vw", as above, and runs no scale or move of its own on load. A hero that wants its entrance in the cover's
// wake (helper in preloader-slices-uncovered.ts, the signal the slice pieces speak too):
//   useGSAP((_, contextSafe) => whenUncovered(contextSafe!(() => { ...the entrance... })), { scope })
//
// The block owns its gate. A tiny script inside the cover runs while the browser parses it, before the first paint.
// Only with motion allowed and no earlier play this session does it arm the cover, close the curtain on <html>, hold
// the page still (wheel, touch and scroll keys) and start the page at the top. So without JavaScript, under reduced
// motion and on a revisit the cover never paints and nothing waits or holds. The cover's CSS lives in blocks.css (the
// "--- preloader-stack ---" block): from the first paint it shows the first print and runs the count on a CSS clock
// (one number, --stack-n), which the script takes over when it hydrates. If the bundle never arrives, that CSS hides
// the armed cover at 2.3 seconds and the hold lets go at 2.4; once the script runs, its own ceiling does the same.
// `always` plays it on every load (the lab).
import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { closeCurtain, covered, liftCurtain, whenUncovered } from "./preloader-slices-uncovered";

export { whenUncovered };

const SEEN_KEY = "struq:preloader-stack";

/** Seconds, measured from the first paint. */
const BUDGET = 2.4;
const T = {
  start: 0.75, // the flip starts by this time after the paint, with whichever photos are decoded
  first: 0.26, // the first photo's hold; each next one is held SPEEDUP times as long
  speedup: 0.78,
  minCut: 0.06, // a cut shorter than this reads as a flicker: drop a photo instead
  hero: 0.18, // the beat on the hero's photo before the grow
  grow: 0.9,
  minGrow: 0.5,
  lateFlip: 0.3, // a late start keeps at least this much flip, taken from the grow
  lateGrow: 0.65, // the shortest grow a late start may take that time from
} as const;

/** Runs while the browser parses the cover, before the first paint. Never throws. */
const ARM = `(function(){try{var e=document.currentScript.parentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(!e.hasAttribute("data-always")&&sessionStorage.getItem("${SEEN_KEY}")==="1")return;e.setAttribute("data-t0",String(performance.now()));e.setAttribute("data-armed","");document.documentElement.setAttribute("data-curtain","closed");if(!location.hash){history.scrollRestoration="manual";scrollTo(0,0)}var k={" ":1,PageDown:1,PageUp:1,ArrowDown:1,ArrowUp:1,Home:1,End:1},o={capture:true,passive:false},s=function(v){v.preventDefault();v.stopImmediatePropagation()},d=function(v){if(k[v.key])v.preventDefault()},r=function(){removeEventListener("wheel",s,o);removeEventListener("touchmove",s,o);removeEventListener("keydown",d,true);window.__preloaderStackHold=null};addEventListener("wheel",s,o);addEventListener("touchmove",s,o);addEventListener("keydown",d,true);window.__preloaderStackHold=r;setTimeout(r,${BUDGET * 1000})}catch(x){}})()`;

/** Runs after the frame is parsed: marks the cover data-first once the first print is loaded and decoded. */
const FIRST = `(function(){try{var r=document.currentScript.closest("[data-preloader]"),i=r&&r.querySelector("[data-cut] img");if(!i)return;var s=function(){r.setAttribute("data-first","")},g=function(){i.decode?i.decode().then(s,function(){}):s()};i.complete?g():i.addEventListener("load",g,{once:true})}catch(x){}})()`;

/** Runs after the caption is parsed: marks the cover data-fonts once the caption's own faces are loaded. */
const FONTS = `(function(){var r;try{r=document.currentScript.closest("[data-preloader]");var f=document.fonts,d=function(){r.setAttribute("data-fonts","")};if(!f)return d();Promise.all([].map.call(r.querySelectorAll("[data-caption] p"),function(p){var c=getComputedStyle(p);return f.load(c.fontStyle+" "+c.fontWeight+" 16px "+c.fontFamily)})).then(d,d)}catch(x){r&&r.setAttribute("data-fonts","")}})()`;

function releaseHold() {
  (window as Window & { __preloaderStackHold?: (() => void) | null }).__preloaderStackHold?.();
}

type Box = { x: number; y: number; w: number; h: number };
const boxOf = (r: DOMRect): Box => ({ x: r.left, y: r.top, w: r.width, h: r.height });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Each photo held a little shorter than the last, fitted into `room` seconds; drops photos rather than flicker. */
function flipPlan(count: number, room: number): number[] {
  for (let n = count; n > 0; n -= 1) {
    const holds = Array.from({ length: n }, (_, i) => T.first * T.speedup ** i);
    const sum = holds.reduce((a, b) => a + b, 0);
    const fit = Math.min(1, room / sum);
    if (holds[n - 1] * fit >= T.minCut) return holds.map((h) => h * fit);
  }
  return [];
}

/** Set once the cover has played in this document, so a remount never replays it. */
let playedThisDocument = false;
/** A teardown's lift, held back one task so a remount in the same commit (strict mode) can take it back. */
let pendingTeardown = 0;

type Props = {
  /** The flip-through, in order: four to six photos of the client's work. */
  photos: StruqImage[];
  /** The hero's own photo, the one the page shows in its [data-stack-target] box. */
  hero: StruqImage;
  /** The hero image's box on the page; the frame lands on it. Without one it lands on the full screen. */
  target?: string;
  /** The client's name, under the frame. */
  name?: string;
  /** Play on every load, ignoring the session (the lab uses it). */
  always?: boolean;
  /** Called as the grow begins. */
  onReveal?: () => void;
  className?: string;
};

export function PreloaderStack({ photos, hero, target = "[data-stack-target]", name, always = false, onReveal, className = "" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      window.clearTimeout(pendingTeardown);
      const armed = el.hasAttribute("data-armed");
      const t0 = Number(el.dataset.t0 ?? performance.now());
      const since = () => Math.max(0, (performance.now() - t0) / 1000);
      const quit = () => {
        releaseHold();
        if (covered()) liftCurtain();
        setDone(true);
      };
      const gaveUp = armed && getComputedStyle(el).visibility === "hidden";
      if (!armed || gaveUp || (playedThisDocument && !always)) return quit();
      if (BUDGET - since() < T.minGrow + 0.1) return quit();

      // A link to a spot further down: the page opens there, not on the hero, so there is nothing to land on.
      const found = document.querySelector(target);
      if (location.hash && found) {
        const r = found.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= window.innerHeight) return quit();
      }

      playedThisDocument = true;
      // Take the count over from the CSS clock where it stands, then stop the clock (and its failsafe).
      const count = { p: (parseInt(getComputedStyle(el).getPropertyValue("--stack-n"), 10) || 0) / 100 };
      const render = () => el.style.setProperty("--stack-n", String(Math.round(count.p * 100)));
      render();
      el.dataset.live = "";
      closeCurtain();
      let finished = false;
      let cancelled = false;
      let poll = 0;
      // The script's own ceiling, now that the CSS one is off: whatever happens, the cover is gone by then.
      const ceiling = window.setTimeout(() => {
        if (!finished) quit();
      }, Math.max(0, BUDGET + 0.3 - since()) * 1000);

      const q = gsap.utils.selector(el);
      const ground = q("[data-ground]")[0] as HTMLElement;
      const frame = q("[data-frame]")[0] as HTMLElement;
      const cuts = q("[data-cut]") as HTMLElement[];
      const layer = q("[data-hero-layer]")[0] as HTMLElement;
      const box = q("[data-hero-box]")[0] as HTMLElement;
      const heroImg = box.querySelector("img") as HTMLImageElement;
      const caption = q("[data-caption]")[0] as HTMLElement | undefined;

      // Decode everything up front: a cut never shows a half-drawn photo.
      const decoded = cuts.map(() => false);
      let heroReady = false;
      cuts.forEach((c, i) => {
        const img = c.querySelector("img");
        img?.decode().then(() => (decoded[i] = true), () => undefined);
      });
      heroImg.decode().then(() => (heroReady = true), () => undefined);

      const begin = () => {
        if (cancelled) return;
        const now = since();
        // The grow and the hero's beat are fixed; the flip gets what is left, the grow shrinks only when it must.
        let grow: number = T.grow;
        let beat: number = T.hero;
        let room = BUDGET - now - beat - grow - 0.04;
        // A late start still gets a short flip: the grow gives up some of its length first.
        if (room < T.lateFlip) {
          grow = Math.max(T.lateGrow, T.grow - (T.lateFlip - room));
          room = BUDGET - now - beat - grow - 0.04;
        }
        if (room < 0) {
          grow = Math.min(T.grow, Math.max(T.minGrow, BUDGET - now - 0.12 - 0.04));
          beat = Math.max(0.12, BUDGET - now - grow - 0.04);
          if (now + beat + grow > BUDGET + 0.01) return quit();
        }
        const ready = cuts.filter((_, i) => decoded[i]);
        const holds = room > 0 ? flipPlan(ready.length, room) : [];
        const shown = ready.slice(ready.length - holds.length); // drop from the front, keep the last before the hero

        // Geometry: the frame where it sits, the hero box where the page shows it.
        const vw = el.clientWidth;
        const vh = el.clientHeight;
        const S = boxOf(frame.getBoundingClientRect());
        const R = found ? boxOf(found.getBoundingClientRect()) : { x: 0, y: 0, w: vw, h: vh };
        const iw = heroImg.naturalWidth || hero.width;
        const ih = heroImg.naturalHeight || hero.height;
        // A hero whose window shows a larger registered photo marks that photo's box (data-stack-photo, inside the
        // target): the print is then laid as object-cover of that box, while the frame still lands on the target.
        const photoEl = found?.querySelector<HTMLElement>("[data-stack-photo]");
        const P = photoEl ? boxOf(photoEl.getBoundingClientRect()) : R;
        // The photo at its own aspect, scaled and centred exactly as object-cover shows it in P. Seen through R it
        // is the page's hero, pixel for pixel; seen through a smaller frame, scaled to cover that frame.
        const s1 = Math.max(P.w / iw, P.h / ih);
        Object.assign(box.style, {
          left: `${P.x + P.w / 2 - (iw * s1) / 2}px`,
          top: `${P.y + P.h / 2 - (ih * s1) / 2}px`,
          width: `${iw * s1}px`,
          height: `${ih * s1}px`,
        });
        // With a photo box the print goes from covering the small frame to its place in that box; the frame lands
        // on R either way.
        const sS = Math.max(S.w / iw, S.h / ih);
        const grown = { p: 0 };
        // The caption under the frame leaves before the growing frame can reach it: it slides down out of its mask,
        // done by the grow's progress at which the frame's lower edge would first touch it (a quarter at most).
        const capTop = caption?.getBoundingClientRect().top ?? vh;
        const reach = R.y + R.h - (S.y + S.h);
        const contact = reach > 0 ? Math.max(0, capTop - (S.y + S.h)) / reach : 1;
        const capDone = Math.max(0.04, Math.min(0.25, contact * 0.8));
        // The grow, from plain numbers on every frame: a clip for the frame, a transform for the photo inside it.
        const paint = () => {
          if (caption) caption.style.transform = `translateY(${Math.min(1, grown.p / capDone) * 110}%)`;
          const F = {
            x: lerp(S.x, R.x, grown.p),
            y: lerp(S.y, R.y, grown.p),
            w: lerp(S.w, R.w, grown.p),
            h: lerp(S.h, R.h, grown.p),
          };
          let k = Math.max(F.w / iw, F.h / ih) / s1;
          let dx = F.x + F.w / 2 - (R.x + R.w / 2);
          let dy = F.y + F.h / 2 - (R.y + R.h / 2);
          if (photoEl) {
            k = lerp(sS, s1, grown.p) / s1;
            dx = lerp(S.x + S.w / 2, P.x + P.w / 2, grown.p) - (P.x + P.w / 2);
            dy = lerp(S.y + S.h / 2, P.y + P.h / 2, grown.p) - (P.y + P.h / 2);
          }
          box.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
          layer.style.clipPath = `inset(${F.y}px ${vw - F.x - F.w}px ${vh - F.y - F.h}px ${F.x}px)`;
        };
        paint();

        const show = (cut: HTMLElement | null) => {
          for (const c of cuts) c.style.visibility = c === cut ? "inherit" : "hidden";
        };

        const flip = holds.reduce((a, b) => a + b, 0);
        const tl = gsap.timeline();
        let at = 0;
        shown.forEach((cut, i) => {
          tl.add(() => show(cut), at);
          at += holds[i];
        });
        // The count runs with the flip and lands on 100 with the hero's photo.
        tl.to(count, { p: 1, duration: Math.max(0.01, flip), ease: "power1.in", onUpdate: render }, 0);
        tl.add(() => {
          show(null);
          layer.style.visibility = "inherit";
        }, at);
        at += beat;
        tl.add(() => {
          // Hand over: everything around the hero image is the page's own from here, and its entrance starts.
          el.dataset.lifted = "";
          // Whole pixels, rounded outward: a clip edge on a fractional pixel is drawn soft, and the page's photo
          // would show through it as a hairline along the box.
          const edge = (v: number) => Math.max(0, Math.floor(v));
          ground.style.clipPath = `inset(${edge(R.y)}px ${edge(vw - R.x - R.w)}px ${edge(vh - R.y - R.h)}px ${edge(R.x)}px)`;
          releaseHold();
          liftCurtain();
          onReveal?.();
        }, at);
        tl.to(grown, { p: 1, duration: grow, ease: "power2.inOut", onUpdate: paint }, at);
        tl.add(() => {
          // Landed: the cover's photo now sits exactly over the page's, so the cover can go.
          finished = true;
          window.clearTimeout(ceiling);
          try {
            sessionStorage.setItem(SEEN_KEY, "1");
          } catch {
            // Private mode: it plays again on the next load.
          }
          setDone(true);
        });
      };

      // Start once every photo is decoded, or at the latest comfortable moment with those that are. The hero must be
      // ready: it waits for it as long as a short beat and grow still fit, and otherwise lets the page go.
      const latestStart = Math.max(0, T.start - since());
      const lastChance = BUDGET - T.minGrow - 0.16;
      const wait = () => {
        if (cancelled) return;
        const all = heroReady && decoded.every(Boolean);
        const elapsed = since();
        if (all || (heroReady && elapsed >= T.start)) return begin();
        if (!heroReady && elapsed >= lastChance) return quit();
        poll = window.setTimeout(wait, 30);
      };
      poll = window.setTimeout(wait, Math.min(30, latestStart * 1000));

      return () => {
        cancelled = true;
        window.clearTimeout(poll);
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
      data-preloader="stack"
      data-always={always ? "" : undefined}
      aria-hidden="true"
      suppressHydrationWarning
      className={`fixed inset-0 z-[100] ${className}`}
    >
      <script dangerouslySetInnerHTML={{ __html: ARM }} />
      {/* The page's own ground, with the frame, the name and the count. */}
      <div data-ground="" className="absolute inset-0 bg-surface-0 text-ink">
        <div className="absolute left-1/2 top-[45%] w-[44vw] -translate-x-1/2 -translate-y-1/2 md:w-[19vw]">
          <div data-frame="" className="relative aspect-[3/4] w-full overflow-hidden">
            {photos.map((photo, i) => (
              <div key={photo.src} data-cut="" className="invisible absolute inset-0">
                {/* The first print shows from the first paint (blocks.css), so it is fetched first. */}
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 19vw, 44vw"
                  {...(i === 0 ? { priority: true } : { loading: "eager" as const })}
                  unoptimized={photo.unoptimized}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {/* Parsed right after the frame: the first print shows (blocks.css) only once it is loaded and decoded. */}
          <script dangerouslySetInnerHTML={{ __html: FIRST }} />
          {/* The caption, in a mask it leaves through as the frame starts to grow: the shared line mask, at the
              name's size so its room is the name's. */}
          <div className="mt-3 md:mt-4">
            <div className="struq-line-mask text-h3">
              <div data-caption="" className="flex items-baseline justify-between gap-4">
                {name ? <p className="font-display text-h3 leading-none">{name}</p> : <span />}
                {/* The count is one number, --stack-n, shown by blocks.css: its CSS clock runs from the first paint
                    and the script takes the same number over when it hydrates. */}
                <p data-count="" className="text-small tabular-nums lining-nums text-ink-muted" />
              </div>
            </div>
          </div>
          {/* Parsed right after the caption: it shows (blocks.css) only once its own faces are in, never in a fallback. */}
          <script dangerouslySetInnerHTML={{ __html: FONTS }} />
        </div>
      </div>
      {/* The hero's photo over everything, seen through the growing frame. Same file and sizes as the page's hero. */}
      <div data-hero-layer="" className="invisible absolute inset-0">
        <div data-hero-box="" className="absolute origin-center">
          <Image src={hero.src} alt="" fill sizes="100vw" priority unoptimized={hero.unoptimized} className="object-cover" />
        </div>
      </div>
    </div>
  );
}
