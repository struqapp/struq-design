"use client";
// components/struq/kit/motion/FollowFrame.tsx (Struq recipe)
// The photo that answers the pointer over a list of named rows. Two moves, one primitive:
//
// - "follow": an upright frame follows the pointer close behind it, leaning with its speed; moving from row to row
//   swaps the photo inside it through a mask that wipes in the way the hand travelled, out of a slight push-in.
//   Leaving the list folds the frame shut on its middle. Extracted from sections/hover-list.
// - "trail": the pointer deals prints of the hovered row's photo behind it, one each time the hand has travelled a
//   step; each lands slightly turned, holds, then shrinks and fades. Six at most, the oldest going first. Extracted
//   from sections/image-trail.
//
// <FollowFrame images={items.map((item) => item.image)} mode="follow">
//   <ul>{items.map((item) => <li key={item.name}><a href={item.href} data-follow-row="">{item.name}</a></li>)}</ul>
// </FollowFrame>
//
// Props
// - images: one StruqImage per row, in the rows' order. The frame shows images[i] for the i-th [data-follow-row].
// - children: the list. Mark every row (a link, or a focusable element when it is not one) with data-follow-row; put
//   data-follow-text on the row's words so a placed frame (keyboard) stands clear of them and of their focus ring.
// - mode: "follow" (default) or "trail".
// - className: on the wrapper (relative, clipped sideways, so the frame never widens the page).
//
// Mounting: inside a scene, around its list. Desktop with a fine pointer only (FOLLOW_FINE); touch and phones get
// nothing from it, so the scene shows each photo inline there (hide those with FOLLOW_INLINE). The rows answer
// data-current on the hovered row and data-active on the wrapper, for the scene's own "others step back" styling.
//
// Motion (kit/feel.ts, read from data-temperament="weighted" or the one the site sets on <body>): the follow reaches the pointer in about a third of the feel's enter duration (crisp snaps to
// it, slow lags behind it), and leans by the temperament (slow leans least); swaps wipe over a share of duration.swap
// on the enter ease, the push-in from the feel's media scale; the fold opens on the enter ease and shuts on the exit
// ease. Trail prints land on the enter ease and live for a step of the feel. Keyboard: a focused row shows its photo
// once, placed beside its words. Reduced motion: the photo stands beside the hovered or focused row, no follow, no
// lean, no wipe, no trail. No scripts, the server render, touch: nothing renders visibly; the list stands alone.
import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { feel } from "../feel";
import { gsap, useGSAP } from "../gsap";
import type { StruqImage } from "../images";

type Props = {
  images: StruqImage[];
  children: ReactNode;
  mode?: "follow" | "trail";
  className?: string;
};

/** Where the frame exists at all: a wide screen and a fine pointer that hovers. */
export const FOLLOW_FINE = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";
/** For the scene's inline photos: hidden where the frame takes over. */
export const FOLLOW_INLINE = "[@media(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:hidden";
const FRAME_ONLY = "hidden [@media(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:block";

/** The frame rides beside the pointer, not on it, so the hovered name stays readable. */
const AHEAD_X = 0.35;
const AHEAD_Y = 0.08;
/** A placed frame (keyboard, reduced motion) stands at least this share of the width across. */
const PLACE_X = 0.8;
/** Trail: prints in the pool, pointer travel between two (px), the land, hold and life as shares of a print's life. */
const POOL = 6;
const STEP = 110;

/** The lean per temperament: degrees per pixel of speed per frame, and the most. Slow leans least. */
const LEAN = { crisp: [0.6, 10], weighted: [0.55, 9], slow: [0.3, 5] } as const;

function waitFor(img: HTMLImageElement | null) {
  if (!img) return Promise.resolve();
  img.loading = "eager";
  const loaded = img.complete
    ? Promise.resolve()
    : new Promise<void>((res) => {
        img.addEventListener("load", () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      });
  return loaded.then(() => img.decode()).catch(() => undefined);
}

/** Where a frame of this size stands for row i when it does not follow: beside the row's words, inside the wrapper. */
function placeFor(el: HTMLElement, row: HTMLElement, w: number, h: number) {
  const er = el.getBoundingClientRect();
  const rr = row.getBoundingClientRect();
  const text = row.querySelector<HTMLElement>("[data-follow-text]");
  const end = (text ? text.getBoundingClientRect().right : rr.left) - er.left;
  const half = w / 2;
  const edge = er.width - half - er.width * 0.02;
  const beside = Math.max(er.width * PLACE_X, end + half + er.width * 0.035);
  if (beside <= edge) return { x: beside, y: rr.top - er.top + rr.height / 2 };
  return { x: edge, y: rr.top - er.top - h / 2 - rr.height * 0.12 };
}

function runFollow(el: HTMLElement, reduce: boolean) {
  const frame = el.querySelector<HTMLElement>("[data-ff-frame]");
  const fold = el.querySelector<HTMLElement>("[data-ff-fold]");
  const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-follow-row]"));
  const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-ff-layer]"));
  const pics = layers.map((l) => l.querySelector<HTMLElement>("[data-ff-pic]"));
  if (!frame || !fold || rows.length === 0) return () => {};
  const f = feel(el);
  const follow = Math.round(f.duration.enter * 0.29 * 1000) / 1000;
  const [lean, leanMax] = LEAN[f.name];
  const wipeDur = f.duration.swap * 0.62;
  const push = 1 + (f.travel.media - 1) * 0.45;

  const ready = layers.map((l) => waitFor(l.querySelector("img")));
  const decoded = layers.map(() => false);
  ready.forEach((p, i) => p.then(() => (decoded[i] = true)));

  // The masks as plain numbers: how far the fold has closed toward the middle, and each layer's hidden share.
  const fd = { v: 50 };
  const paintFold = () => {
    fold.style.clipPath = `inset(${fd.v.toFixed(2)}% 0% ${fd.v.toFixed(2)}% 0%)`;
  };
  const wipe = layers.map(() => ({ a: 100, dir: 1 }));
  const paintLayer = (i: number) => {
    const w = wipe[i];
    const a = w.a.toFixed(2);
    layers[i].style.clipPath = w.dir > 0 ? `inset(0% 0% ${a}% 0%)` : `inset(${a}% 0% 0% 0%)`;
  };
  paintFold();
  layers.forEach((_, i) => paintLayer(i));

  gsap.set(frame, { xPercent: -50, yPercent: -50, x: 0, y: 0, rotation: 0, scale: 0.92 });
  const xTo = gsap.quickTo(frame, "x", { duration: follow, ease: "power3.out" });
  const yTo = gsap.quickTo(frame, "y", { duration: follow, ease: "power3.out" });
  const rTo = gsap.quickTo(frame, "rotation", { duration: follow * 2, ease: "power3.out" });
  const st = { shown: false, current: -1, want: -1, follow: !reduce, px: 0, py: 0, lastX: 0, vx: 0, z: 1 };

  const target = () => {
    const er = el.getBoundingClientRect();
    const fw = frame.offsetWidth;
    const fh = frame.offsetHeight;
    const room = (fh / 2) * Math.sin(leanMax * (Math.PI / 180)) + 4;
    const x = gsap.utils.clamp(fw / 2 + room, er.width - fw / 2 - room, st.px - er.left + fw * AHEAD_X);
    const y = gsap.utils.clamp(fh / 2 + 4, er.height - fh / 2 - 4, st.py - er.top - fh * AHEAD_Y);
    return { x, y };
  };
  const tick = () => {
    if (!st.shown || !st.follow) return;
    const t = target();
    xTo(t.x);
    yTo(t.y);
    st.vx += (st.px - st.lastX - st.vx) * 0.35;
    st.lastX = st.px;
    rTo(gsap.utils.clamp(-leanMax, leanMax, st.vx * lean));
  };
  gsap.ticker.add(tick);

  const mark = (i: number) => {
    rows.forEach((r, j) => (j === i ? (r.dataset.current = "") : delete r.dataset.current));
    if (i >= 0) el.dataset.active = "";
    else delete el.dataset.active;
  };

  const open = (i: number) => {
    gsap.killTweensOf(fd);
    for (let j = 0; j < layers.length; j += 1) {
      wipe[j].a = j === i ? 0 : 100;
      paintLayer(j);
    }
    layers[i].style.zIndex = String(++st.z);
    if (pics[i]) gsap.set(pics[i], { scale: 1, yPercent: 0 });
    if (st.follow) {
      const t = target();
      xTo(t.x, t.x);
      yTo(t.y, t.y);
      st.lastX = st.px;
      st.vx = 0;
    } else {
      const p = placeFor(el, rows[i], frame.offsetWidth, frame.offsetHeight);
      gsap.set(frame, { x: p.x, y: p.y, rotation: 0 });
    }
    frame.style.visibility = "visible";
    st.shown = true;
    if (reduce) {
      fd.v = 0;
      paintFold();
      gsap.set(frame, { scale: 1 });
      return;
    }
    gsap.to(fd, { v: 0, duration: f.duration.enter * 0.67, ease: f.ease.enter, onUpdate: paintFold, overwrite: true });
    gsap.to(frame, { scale: 1, duration: f.duration.enter * 0.67, ease: f.ease.enter, overwrite: "auto" });
  };

  const swap = (i: number, from: number) => {
    if (!st.follow) {
      const p = placeFor(el, rows[i], frame.offsetWidth, frame.offsetHeight);
      gsap.set(frame, { x: p.x, y: p.y });
    }
    // Back to a photo that still shows under the ones wiping over it: those draw back the way they came.
    if (wipe[i].a < 99.5) {
      const zi = Number(layers[i].style.zIndex) || 0;
      for (let j = 0; j < layers.length; j += 1) {
        const wj = wipe[j];
        if (j === i || wj.a >= 100 || (Number(layers[j].style.zIndex) || 0) <= zi) continue;
        gsap.killTweensOf(wj);
        if (reduce) {
          wj.a = 100;
          paintLayer(j);
        } else gsap.to(wj, { a: 100, duration: wipeDur * 0.85, ease: f.ease.enter, onUpdate: () => paintLayer(j) });
      }
      const wi = wipe[i];
      if (wi.a > 0) {
        gsap.killTweensOf(wi);
        if (reduce) {
          wi.a = 0;
          paintLayer(i);
        } else gsap.to(wi, { a: 0, duration: wipeDur, ease: f.ease.enter, onUpdate: () => paintLayer(i) });
      }
      return;
    }
    // The new photo wipes in the way the hand travels, over the old one, out of a push-in.
    const dir = i > from ? 1 : -1;
    const w = wipe[i];
    gsap.killTweensOf(w);
    w.dir = dir;
    w.a = 100;
    layers[i].style.zIndex = String(++st.z);
    paintLayer(i);
    if (reduce) {
      w.a = 0;
      paintLayer(i);
      return;
    }
    if (pics[i]) gsap.fromTo(pics[i], { scale: push, yPercent: -7 * dir }, { scale: 1, yPercent: 0, duration: wipeDur + 0.2, ease: f.ease.enter, overwrite: true });
    gsap.to(w, {
      a: 0,
      duration: wipeDur,
      ease: f.ease.enter,
      onUpdate: () => paintLayer(i),
      onComplete: () => {
        // Only the photo on top stays open, so the next wipe always covers a whole picture.
        for (let j = 0; j < layers.length; j += 1) {
          if (j === i || j === st.current) continue;
          wipe[j].a = 100;
          paintLayer(j);
        }
      },
    });
  };

  const show = (i: number) => {
    st.want = i;
    if (i === st.current && st.shown) return;
    const go = () => {
      if (st.want !== i) return;
      const from = st.current;
      st.current = i;
      mark(i);
      if (!st.shown) open(i);
      else swap(i, from);
    };
    if (decoded[i]) go();
    else ready[i].then(go);
  };

  const hide = () => {
    st.want = -1;
    if (!st.shown) return;
    st.shown = false;
    st.current = -1;
    mark(-1);
    if (reduce) {
      frame.style.visibility = "hidden";
      fd.v = 50;
      paintFold();
      return;
    }
    const out = { duration: f.duration.exit * 1.1, ease: f.ease.exit };
    gsap.to(fd, {
      v: 50,
      ...out,
      onUpdate: paintFold,
      overwrite: true,
      onComplete: () => {
        if (!st.shown) frame.style.visibility = "hidden";
      },
    });
    gsap.to(frame, { scale: 0.92, ...out, overwrite: "auto" });
  };

  const onMove = (e: PointerEvent) => {
    st.px = e.clientX;
    st.py = e.clientY;
    if (!reduce && !st.follow) {
      st.follow = true;
      st.lastX = st.px;
      st.vx = 0;
    }
  };
  const enters = rows.map((row, i) => {
    const fn = (e: PointerEvent) => {
      st.px = e.clientX;
      st.py = e.clientY;
      show(i);
    };
    row.addEventListener("pointerenter", fn);
    return fn;
  });
  const focuses = rows.map((row, i) => {
    const fn = () => {
      if (!row.matches(":focus-visible")) return;
      st.follow = false;
      gsap.to(frame, { rotation: 0, duration: f.duration.exit, ease: f.ease.enter, overwrite: "auto" });
      if (st.shown) {
        const p = placeFor(el, row, frame.offsetWidth, frame.offsetHeight);
        gsap.to(frame, { x: p.x, y: p.y, duration: reduce ? 0 : f.duration.enter * 0.5, ease: f.ease.enter, overwrite: "auto" });
      }
      show(i);
    };
    row.addEventListener("focus", fn);
    return fn;
  });
  const onLeave = () => hide();
  const onFocusOut = (e: FocusEvent) => {
    if (!el.contains(e.relatedTarget as Node | null)) hide();
  };
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("focusout", onFocusOut);

  return () => {
    gsap.ticker.remove(tick);
    rows.forEach((row, i) => {
      row.removeEventListener("pointerenter", enters[i]);
      row.removeEventListener("focus", focuses[i]);
      delete row.dataset.current;
    });
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("focusout", onFocusOut);
    delete el.dataset.active;
    frame.style.visibility = "";
    fold.style.clipPath = "";
    for (const l of layers) {
      l.style.clipPath = "";
      l.style.zIndex = "";
    }
  };
}

function runTrail(el: HTMLElement, reduce: boolean, count: number) {
  const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-follow-row]"));
  const prints = Array.from(el.querySelectorAll<HTMLElement>("[data-ff-print]"));
  const still = el.querySelector<HTMLElement>("[data-ff-still]");
  if (rows.length === 0 || prints.length === 0 || !still) return () => {};
  const f = feel(el);
  // A print's life follows the feel: it lands over a share of enter, holds, then shrinks and fades.
  const life = f.duration.enter * 1.17;
  const landT = f.duration.enter * 0.36;
  const hold = f.duration.enter * 0.31;
  const drop = 1 + (f.travel.media - 1) * 0.27;
  const easeLand = gsap.parseEase(f.ease.enter);
  const easeFade = gsap.parseEase(f.ease.exit);
  const shots = prints.map((p) => Array.from(p.querySelectorAll<HTMLElement>("[data-ff-shot]")));
  const stillShots = Array.from(still.querySelectorAll<HTMLElement>("[data-ff-shot]"));

  const decoded = Array.from({ length: count }, () => false);
  for (let i = 0; i < count; i += 1) {
    const imgs = [...shots.map((s) => s[i]), stillShots[i]].map((s) => s?.querySelector("img") ?? null);
    Promise.all(imgs.map(waitFor)).then(() => (decoded[i] = true));
  }

  const state = prints.map(() => ({ x: 0, y: 0, r: 0, born: -1 }));
  const showShot = (list: HTMLElement[], item: number) => list.forEach((s, j) => (s.style.visibility = j === item ? "inherit" : "hidden"));
  const st = { inside: false, current: -1, px: 0, py: 0, lastX: 0, lastY: 0, travel: 0, next: 0, z: 1, speed: 0 };
  const mark = (i: number) => {
    rows.forEach((r, j) => (j === i ? (r.dataset.current = "") : delete r.dataset.current));
    if (i >= 0) el.dataset.active = "";
    else delete el.dataset.active;
  };
  const free = (now: number) => {
    const s = state[st.next];
    return s.born < 0 || now - s.born >= life;
  };
  const deal = (now: number, dx: number) => {
    const item = st.current;
    if (item < 0 || !decoded[item]) return;
    const k = st.next;
    st.next = (st.next + 1) % prints.length;
    const s = state[k];
    const er = el.getBoundingClientRect();
    s.x = Math.round(st.px - er.left);
    s.y = Math.round(st.py - er.top);
    s.r = gsap.utils.clamp(-8, 8, dx * 0.08) + (Math.random() - 0.5) * 5;
    s.born = now;
    prints[k].style.zIndex = String(++st.z);
    showShot(shots[k], item);
  };
  const paint = (now: number) => {
    for (let k = 0; k < prints.length; k += 1) {
      const s = state[k];
      const p = prints[k];
      if (s.born < 0) continue;
      const a = now - s.born;
      if (a >= life) {
        s.born = -1;
        p.style.opacity = "0";
        p.style.visibility = "hidden";
        continue;
      }
      const land = easeLand(Math.min(1, a / landT));
      const fade = easeFade(Math.max(0, (a - hold) / (life - hold)));
      const scale = (drop + (1 - drop) * land) * (1 - 0.22 * fade);
      const r = s.r * (1.7 - 0.7 * land);
      p.style.visibility = "visible";
      p.style.opacity = (1 - fade).toFixed(3);
      p.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${r.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    }
  };
  const tick = (time: number, deltaMs: number) => {
    const dt = Math.max(0.001, Math.min(0.1, deltaMs / 1000));
    const dx = st.px - st.lastX;
    const dy = st.py - st.lastY;
    const moved = Math.hypot(dx, dy);
    st.speed += (moved / dt - st.speed) * (1 - Math.exp(-dt / 0.08));
    if (st.inside && st.current >= 0 && !reduce) {
      // A hand moving mostly up or down is crossing rows, not reading one: it deals nothing.
      if (Math.abs(dy) <= Math.abs(dx) * 1.4) st.travel += moved;
      const step = Math.max(STEP, (st.speed * life) / prints.length);
      if (st.travel >= step && free(time)) {
        st.travel = 0;
        deal(time, dx);
      }
    }
    st.lastX = st.px;
    st.lastY = st.py;
    paint(time);
  };
  gsap.ticker.add(tick);

  const place = (i: number) => {
    const p = placeFor(el, rows[i], still.offsetWidth, still.offsetHeight);
    showShot(stillShots, i);
    still.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0) translate(-50%, -50%)`;
    still.style.visibility = "visible";
    still.style.opacity = "1";
  };
  const hideStill = () => {
    still.style.visibility = "hidden";
  };
  const onEnter = rows.map((row, i) => {
    const fn = (e: PointerEvent) => {
      st.px = e.clientX;
      st.py = e.clientY;
      if (st.current !== i) st.travel = 0;
      st.current = i;
      mark(i);
      if (reduce && decoded[i]) place(i);
    };
    row.addEventListener("pointerenter", fn);
    return fn;
  });
  const onFocus = rows.map((row, i) => {
    const fn = () => {
      if (!row.matches(":focus-visible")) return;
      mark(i);
      if (decoded[i]) place(i);
    };
    row.addEventListener("focus", fn);
    return fn;
  });
  const onMove = (e: PointerEvent) => {
    st.px = e.clientX;
    st.py = e.clientY;
    if (!st.inside) {
      st.inside = true;
      st.lastX = st.px;
      st.lastY = st.py;
    }
  };
  const onLeave = () => {
    st.inside = false;
    st.current = -1;
    st.travel = 0;
    mark(-1);
    hideStill();
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!el.contains(e.relatedTarget as Node | null)) {
      mark(-1);
      hideStill();
    }
  };
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("focusout", onFocusOut);

  return () => {
    gsap.ticker.remove(tick);
    rows.forEach((row, i) => {
      row.removeEventListener("pointerenter", onEnter[i]);
      row.removeEventListener("focus", onFocus[i]);
      delete row.dataset.current;
    });
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("focusout", onFocusOut);
    delete el.dataset.active;
    for (const p of [...prints, still]) {
      p.style.transform = "";
      p.style.opacity = "";
      p.style.visibility = "";
      p.style.zIndex = "";
    }
  };
}

export function FollowFrame({ images, children, mode = "follow", className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add({ fine: FOLLOW_FINE, reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { fine, reduce } = ctx.conditions as { fine: boolean; reduce: boolean };
        if (!fine) return;
        return mode === "trail" ? runTrail(el, reduce, images.length) : runFollow(el, reduce);
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [images.length, mode] },
  );

  const sizes = "(min-width: 1024px) clamp(13rem, 19vw, 22rem), 1px";
  const shot = (image: StruqImage, key: string, attr: Record<string, string>) => (
    <div key={key} {...attr} className="invisible absolute inset-0">
      <Image src={image.src} alt="" fill loading="lazy" sizes={sizes} unoptimized={image.unoptimized} className="object-cover" />
    </div>
  );
  // A print carries every row's photo and shows the one it is dealt; no shadow, the photo's own edge is the frame.
  const print = (key: string, attr: Record<string, string>) => (
    <div
      key={key}
      {...attr}
      aria-hidden
      className={`pointer-events-none invisible absolute left-0 top-0 z-20 aspect-[4/5] w-[clamp(11rem,15vw,17rem)] overflow-hidden bg-surface-2 opacity-0 ${FRAME_ONLY}`}
    >
      {images.map((image, j) => shot(image, `${j}`, { "data-ff-shot": "" }))}
    </div>
  );

  return (
    <div ref={ref} data-follow-frame={mode} className={`relative ${mode === "trail" ? "[overflow:clip]" : "[overflow-x:clip]"} ${className}`}>
      {/* The list stands above the trail's prints and below the following frame. */}
      <div className={mode === "trail" ? "relative z-10" : "relative"}>{children}</div>
      {mode === "trail" ? (
        <>
          {Array.from({ length: POOL }, (_, k) => print(`p${k}`, { "data-ff-print": "" }))}
          {print("still", { "data-ff-still": "" })}
        </>
      ) : (
        <div
          data-ff-frame=""
          aria-hidden
          className={`pointer-events-none invisible absolute left-0 top-0 z-20 aspect-[4/5] w-[clamp(13rem,19vw,22rem)] ${FRAME_ONLY}`}
        >
          <div data-ff-fold="" className="absolute inset-0 overflow-hidden bg-surface-2" style={{ clipPath: "inset(50% 0% 50% 0%)" }}>
            {images.map((image, i) => (
              <div key={`${image.src}:${i}`} data-ff-layer="" className="absolute inset-0 overflow-hidden" style={{ clipPath: "inset(100% 0% 0% 0%)", zIndex: i === 0 ? 1 : 0 }}>
                <div data-ff-pic="" className="absolute inset-0">
                  <Image src={image.src} alt="" fill loading="lazy" sizes={sizes} unoptimized={image.unoptimized} className="object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
