"use client";
// hover-list (Struq section recipe)
// A list of work set at display size: one project per row, its name as the composition and a quiet
// line of place and year on the name's baseline. Hover a row and that project's photograph stands in a
// small upright frame that follows the pointer, close behind it, tilting with the pointer's speed;
// the other rows step back and the hovered name moves a little forward. Moving from row to row swaps
// the photograph inside the frame through a mask: the new one wipes in the way the pointer travels,
// out of a slight push-in, over the old one. Leave the list and the frame folds shut on its middle.
//
// One clock: the frame follows on the GSAP ticker through quickTo, transforms only, and is within
// reach of the pointer in about 0.15 seconds, so it reads as attached, never as delayed. Every mask
// is written from plain numbers on update. Each photograph loads at the frame's size and is decoded
// before it is first shown, so a swap never shows an empty frame.
//
// <HoverList title="Gebouwd en bewoond." items={[
//   { title: "De Lantaarn", place: "Utrecht", year: "2023", image: images.column[0], href: "#lantaarn" },
//   ...
// ]} />
//
// Keyboard: a focused row shows its photograph in a fixed place beside it. Reduced motion: the frame
// stands beside the hovered row the same way, without the follow, the tilt or the wipes. Touch and
// phones: no floating frame; each row carries its photograph inline.
import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Item = {
  title: string;
  /** Where it is; set with the year as one quiet line. */
  place: string;
  year: string;
  image: StruqImage;
  href?: string;
};

type Props = {
  /** An optional heading above the list. */
  title?: string;
  items: Item[];
  className?: string;
};

/** The frame follows within reach in about 0.15s: a 0.26s power3.out covers nine tenths of the way by then. */
const FOLLOW = 0.26;
/** Tilt: degrees per pixel of pointer speed per frame, and the most it leans. */
const LEAN = 0.55;
const LEAN_MAX = 9;
/** A new photograph wipes in over this long, out of this push-in. */
const WIPE = 0.62;
const PUSH = 1.14;
/** The following frame rides beside the pointer, not on it, so the hovered name stays readable: its centre
 * this share of its width to the right and this share of its height above. */
const AHEAD_X = 0.35;
const AHEAD_Y = 0.08;
/** Where a placed frame stands (keyboard, reduced motion) at the least: its centre, as a share of the width. */
const PLACE_X = 0.8;

const FINE = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";

export function HoverList({ title, items, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const list = el.querySelector<HTMLElement>("[data-list]");
      const frame = el.querySelector<HTMLElement>("[data-frame]");
      const fold = el.querySelector<HTMLElement>("[data-fold]");
      const shade = el.querySelector<HTMLElement>("[data-shadow]");
      const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));
      const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-layer]"));
      const pics = layers.map((l) => l.querySelector<HTMLElement>("[data-pic]"));
      const imgs = layers.map((l) => l.querySelector<HTMLImageElement>("img"));
      if (!list || !frame || !fold || rows.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add({ fine: FINE, reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { fine, reduce } = ctx.conditions as { fine: boolean; reduce: boolean };
        if (!fine) return;

        // Every photograph loads now, at the frame's size, and is decoded before it is first shown.
        const ready = imgs.map((img) => {
          if (!img) return Promise.resolve();
          img.loading = "eager";
          const loaded = img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.addEventListener("load", () => res(), { once: true });
                img.addEventListener("error", () => res(), { once: true });
              });
          return loaded.then(() => img.decode()).catch(() => undefined);
        });
        const decoded = imgs.map(() => false);
        ready.forEach((p, i) => p.then(() => (decoded[i] = true)));

        // The masks, as plain numbers: the frame's fold (how far each edge has closed toward the middle, in
        // %) and each layer's wipe (how much of it is still hidden, in %, from the side it wipes toward).
        const fd = { v: 50 };
        const paintFold = () => {
          fold.style.clipPath = `inset(${fd.v.toFixed(2)}% 0% ${fd.v.toFixed(2)}% 0%)`;
          if (shade) shade.style.transform = `scaleY(${(1 - fd.v / 50).toFixed(4)})`;
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
        const xTo = gsap.quickTo(frame, "x", { duration: FOLLOW, ease: "power3.out" });
        const yTo = gsap.quickTo(frame, "y", { duration: FOLLOW, ease: "power3.out" });
        const rTo = gsap.quickTo(frame, "rotation", { duration: 0.5, ease: "power3.out" });

        const st = { shown: false, current: -1, want: -1, follow: !reduce, px: 0, py: 0, lastX: 0, vx: 0, z: 1 };

        // Where the frame stands for a row when it does not follow: beside the row's words, clear of them and
        // of the focus ring drawn around them, centred on the row. When a wide face leaves no room beside them,
        // it stands at the right edge just above the row instead, so it never covers the row it belongs to.
        const placeFor = (i: number) => {
          const er = el.getBoundingClientRect();
          const rr = rows[i].getBoundingClientRect();
          const text = rows[i].querySelector<HTMLElement>("[data-text]");
          const end = (text ? text.getBoundingClientRect().right : rr.left) - er.left;
          const half = frame.offsetWidth / 2;
          const edge = er.width - half - er.width * 0.02;
          const beside = Math.max(er.width * PLACE_X, end + half + er.width * 0.035);
          if (beside <= edge) return { x: beside, y: rr.top - er.top + rr.height / 2 };
          return { x: edge, y: rr.top - er.top - frame.offsetHeight / 2 - rr.height * 0.12 };
        };

        // The follow target: beside the pointer, kept wholly inside the section (with room for the most it
        // leans), so the section's clip never cuts the frame at an edge.
        const target = () => {
          const er = el.getBoundingClientRect();
          const fw = frame.offsetWidth;
          const fh = frame.offsetHeight;
          const lean = (fh / 2) * Math.sin(LEAN_MAX * (Math.PI / 180)) + 4;
          const x = gsap.utils.clamp(fw / 2 + lean, er.width - fw / 2 - lean, st.px - er.left + fw * AHEAD_X);
          const y = gsap.utils.clamp(fh / 2 + 4, er.height - fh / 2 - 4, st.py - er.top - fh * AHEAD_Y);
          return { x, y };
        };

        // The one loop: while the frame follows, it eases toward the pointer and leans with its speed.
        const tick = () => {
          if (!st.shown || !st.follow) return;
          const t = target();
          xTo(t.x);
          yTo(t.y);
          st.vx += (st.px - st.lastX - st.vx) * 0.35;
          st.lastX = st.px;
          rTo(gsap.utils.clamp(-LEAN_MAX, LEAN_MAX, st.vx * LEAN));
        };
        gsap.ticker.add(tick);

        const mark = (i: number) => {
          rows.forEach((r, j) => {
            if (j === i) r.dataset.current = "";
            else delete r.dataset.current;
          });
          if (i >= 0) list.dataset.active = "";
          else delete list.dataset.active;
        };

        const open = (i: number) => {
          // First show: the frame unfolds where it is wanted, with the row's photograph already in it.
          gsap.killTweensOf(fd);
          for (let j = 0; j < layers.length; j += 1) {
            wipe[j].a = j === i ? 0 : 100;
            paintLayer(j);
          }
          layers[i].style.zIndex = String(++st.z);
          const pic = pics[i];
          if (pic) gsap.set(pic, { scale: 1, yPercent: 0 });
          if (st.follow) {
            const t = target();
            xTo(t.x, t.x);
            yTo(t.y, t.y);
            st.lastX = st.px;
            st.vx = 0;
          } else {
            const p = placeFor(i);
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
          gsap.to(fd, { v: 0, duration: 0.6, ease: "expo.out", onUpdate: paintFold, overwrite: true });
          gsap.to(frame, { scale: 1, duration: 0.6, ease: "expo.out", overwrite: "auto" });
        };

        const swap = (i: number, from: number) => {
          if (!st.follow) {
            const p = placeFor(i);
            gsap.set(frame, { x: p.x, y: p.y });
          }
          // Back to a photograph that still shows under the ones wiping over it (a quick graze across a row
          // and back): those draw back the way they came and it is never re-hidden, so no part of the frame
          // is ever left without a picture.
          if (wipe[i].a < 99.5) {
            const zi = Number(layers[i].style.zIndex) || 0;
            for (let j = 0; j < layers.length; j += 1) {
              const wj = wipe[j];
              if (j === i || wj.a >= 100 || (Number(layers[j].style.zIndex) || 0) <= zi) continue;
              gsap.killTweensOf(wj);
              if (reduce) {
                wj.a = 100;
                paintLayer(j);
              } else {
                gsap.to(wj, { a: 100, duration: WIPE * 0.85, ease: "expo.out", onUpdate: () => paintLayer(j) });
              }
            }
            const wi = wipe[i];
            if (wi.a > 0) {
              gsap.killTweensOf(wi);
              if (reduce) {
                wi.a = 0;
                paintLayer(i);
              } else {
                gsap.to(wi, { a: 0, duration: WIPE, ease: "expo.out", onUpdate: () => paintLayer(i) });
              }
            }
            return;
          }
          // The new photograph wipes in the way the pointer travels, over the old one, out of a push-in.
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
          const pic = pics[i];
          if (pic) gsap.fromTo(pic, { scale: PUSH, yPercent: -7 * dir }, { scale: 1, yPercent: 0, duration: WIPE + 0.2, ease: "expo.out", overwrite: true });
          gsap.to(w, {
            a: 0,
            duration: WIPE,
            ease: "expo.out",
            onUpdate: () => paintLayer(i),
            onComplete: () => {
              // Only the photograph on top stays open, so the next wipe always covers a whole picture.
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
          // The frame folds shut on its middle and steps back.
          gsap.to(fd, {
            v: 50,
            duration: 0.38,
            ease: "power2.in",
            onUpdate: paintFold,
            overwrite: true,
            onComplete: () => {
              if (!st.shown) frame.style.visibility = "hidden";
            },
          });
          gsap.to(frame, { scale: 0.92, duration: 0.38, ease: "power2.in", overwrite: "auto" });
        };

        const onMove = (e: PointerEvent) => {
          st.px = e.clientX;
          st.py = e.clientY;
          if (!reduce && !st.follow) {
            // The pointer takes over from the keyboard: the frame starts following from where it stands.
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
            gsap.to(frame, { rotation: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
            if (st.shown) {
              const p = placeFor(i);
              gsap.to(frame, { x: p.x, y: p.y, duration: reduce ? 0 : 0.45, ease: "expo.out", overwrite: "auto" });
            }
            show(i);
          };
          row.addEventListener("focus", fn);
          return fn;
        });
        const onLeave = () => hide();
        const onFocusOut = (e: FocusEvent) => {
          if (!list.contains(e.relatedTarget as Node | null)) hide();
        };
        list.addEventListener("pointermove", onMove, { passive: true });
        list.addEventListener("pointerleave", onLeave);
        list.addEventListener("focusout", onFocusOut);

        return () => {
          gsap.ticker.remove(tick);
          rows.forEach((row, i) => {
            row.removeEventListener("pointerenter", enters[i]);
            row.removeEventListener("focus", focuses[i]);
            delete row.dataset.current;
          });
          list.removeEventListener("pointermove", onMove);
          list.removeEventListener("pointerleave", onLeave);
          list.removeEventListener("focusout", onFocusOut);
          delete list.dataset.active;
          frame.style.visibility = "";
          fold.style.clipPath = "";
          if (shade) shade.style.transform = "";
          for (const l of layers) {
            l.style.clipPath = "";
            l.style.zIndex = "";
          }
        };
      });
      return () => mm.revert();
    },
    { scope: stage, dependencies: [items.length] },
  );

  // The shadow is made from the ground itself, a step deeper than it in light and dark palettes alike.
  const shadow =
    "0 2px 6px oklch(from var(--surface-0) calc(l * 0.3) c h / 0.3), 0 30px 60px -24px oklch(from var(--surface-0) calc(l * 0.22) c h / 0.55)";

  return (
    <section
      ref={stage}
      data-section="hover-list"
      aria-labelledby={title ? "hover-list-title" : undefined}
      className={`relative bg-surface-0 px-6 py-20 [overflow-x:clip] lg:px-[4vw] lg:py-[12svh] ${className}`}
    >
      {title ? (
        <h2 id="hover-list-title" className="font-display mb-10 text-h2 text-ink lg:mb-[6svh]">
          {title}
        </h2>
      ) : null}

      <ul data-list="" className="group/list border-t border-line">
        {items.map((item, i) => {
          const body = (
            <>
              {/* Touch and phones: the photograph inline, beside the name. */}
              <span className="relative block aspect-[4/5] w-[22vw] shrink-0 overflow-hidden rounded-[0.15rem] bg-surface-2 sm:w-[16vw] [@media(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:hidden">
                <Image
                  src={item.image.src}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 16vw, 22vw"
                  unoptimized={item.image.unoptimized}
                  className="object-cover"
                />
              </span>
              {/* The focus ring is drawn around the words only, so the placed frame can stand clear of it. */}
              <span
                data-text=""
                className="flex min-w-0 flex-col gap-1.5 rounded-[0.15rem] outline-offset-[0.6rem] transition-[translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[current]/row:translate-x-[1.4vw] group-focus-visible/row:outline-2 group-focus-visible/row:outline-solid group-focus-visible/row:outline-accent lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-[2.2vw]"
              >
                <span
                  data-name=""
                  className="font-display block text-[10.5vw] leading-[0.95] tracking-[-0.035em] text-ink lg:text-[clamp(2.75rem,1rem_+_7vw,9rem)]"
                >
                  {item.title}
                </span>
                <span data-meta="" className="block text-small text-ink-muted">
                  {item.place}, {item.year}
                </span>
              </span>
            </>
          );
          const rowClass =
            "group/row flex items-center gap-4 py-4 focus-visible:outline-none! transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:py-[1.3vw] group-data-[active]/list:not-data-[current]:opacity-[0.28]";
          return (
            <li key={item.title} className="border-b border-line">
              {item.href ? (
                <a data-row="" href={item.href} className={rowClass}>
                  {body}
                </a>
              ) : (
                <div data-row="" className={rowClass}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* The frame: desktop with a fine pointer only. Hidden until a row is hovered or focused. */}
      <div
        data-frame=""
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 z-20 hidden aspect-[4/5] w-[clamp(13rem,19vw,22rem)] [@media(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:block"
      >
        {/* The shadow folds with the frame: scaled on its height, since a clip would cut it off. */}
        <div data-shadow="" className="absolute inset-0 rounded-[0.2rem]" style={{ boxShadow: shadow, transform: "scaleY(0)" }} />
        <div data-fold="" className="absolute inset-0 overflow-hidden rounded-[0.2rem] bg-surface-2" style={{ clipPath: "inset(50% 0% 50% 0%)" }}>
          {items.map((item, i) => (
            <div key={item.title} data-layer="" className="absolute inset-0 overflow-hidden" style={{ clipPath: "inset(100% 0% 0% 0%)", zIndex: i === 0 ? 1 : 0 }}>
              <div data-pic="" className="absolute inset-0">
                <Image
                  src={item.image.src}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) clamp(13rem, 19vw, 22rem), 1px"
                  unoptimized={item.image.unoptimized}
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
