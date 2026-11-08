"use client";
// image-trail (Struq section recipe)
// A list of work set at display size; moving the pointer over it deals the hovered project's photographs
// onto the page. Each time the pointer has travelled a set distance a new print lands exactly where the
// pointer is, slightly turned, settling as if dropped from a hand; the prints before it hold a moment,
// then shrink and fade behind it. At most six are on screen. A fast hand leaves a longer, wider trail, a
// still hand leaves nothing new, and leaving the list lets the last prints settle away.
//
// One ticker loop, a fixed pool of six prints reused in turn (nothing is created per move), transforms
// and opacity only, positions in whole pixels. Each print carries every project's photograph and shows
// the one it is dealt; a project's photograph is decoded in every print before it can be dealt, so a
// print never lands empty.
//
// <ImageTrail title="Werk." items={[
//   { title: "De Lantaarn", place: "Utrecht", year: "2023", image: images.column[0], href: "#lantaarn" },
//   ...
// ]} />
//
// Keyboard: a focused row shows its photograph once, beside the row and clear of its focus ring. Reduced
// motion: hovering a row shows that one print beside it, no trail. Touch and phones: each row carries its
// photograph inline. Without scripts: the list.
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

/** Prints in the pool, the most on screen at once. */
const POOL = 6;
/** Pointer travel (px) between two prints. */
const STEP = 110;
/** A print lands over this long, holds, then shrinks and fades by the end of its life (seconds). */
const LAND = 0.32;
const HOLD = 0.28;
const LIFE = 1.05;
/** A landing print drops from this scale and this much extra turn. */
const DROP = 1.08;
const SPIN = 1.7;
/** Old prints shrink to this. */
const END = 0.78;

const easeLand = gsap.parseEase("expo.out");
const easeFade = gsap.parseEase("power2.in");

const FINE = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";

export function ImageTrail({ title, items, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const list = el.querySelector<HTMLElement>("[data-list]");
      const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));
      const prints = Array.from(
        el.querySelectorAll<HTMLElement>("[data-print]"),
      );
      const still = el.querySelector<HTMLElement>("[data-still]");
      if (!list || rows.length === 0 || prints.length === 0 || !still) return;
      const shots = prints.map((p) =>
        Array.from(p.querySelectorAll<HTMLElement>("[data-shot]")),
      );
      const stillShots = Array.from(
        still.querySelectorAll<HTMLElement>("[data-shot]"),
      );

      const mm = gsap.matchMedia();
      mm.add(
        { fine: FINE, reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { fine, reduce } = ctx.conditions as {
            fine: boolean;
            reduce: boolean;
          };
          if (!fine) return;

          // A project can be dealt once its photograph is decoded in every print that may show it.
          const decoded = items.map(() => false);
          items.forEach((_, i) => {
            const imgs = [...shots.map((s) => s[i]), stillShots[i]]
              .map((s) => s?.querySelector("img"))
              .filter((img): img is HTMLImageElement => Boolean(img));
            Promise.all(
              imgs.map((img) => {
                img.loading = "eager";
                const loaded = img.complete
                  ? Promise.resolve()
                  : new Promise<void>((res) => {
                      img.addEventListener("load", () => res(), { once: true });
                      img.addEventListener("error", () => res(), {
                        once: true,
                      });
                    });
                return loaded.then(() => img.decode()).catch(() => undefined);
              }),
            ).then(() => {
              decoded[i] = true;
            });
          });

          // Each print's state as plain numbers: where it landed, its turn, which photograph, when it landed.
          const state = prints.map(() => ({
            x: 0,
            y: 0,
            r: 0,
            item: -1,
            born: -1,
          }));
          const show = (shotsOf: HTMLElement[], item: number) => {
            shotsOf.forEach((s, j) => {
              s.style.visibility = j === item ? "inherit" : "hidden";
            });
          };
          const st = {
            inside: false,
            current: -1,
            px: 0,
            py: 0,
            lastX: 0,
            lastY: 0,
            travel: 0,
            next: 0,
            z: 1,
            speed: 0,
          };

          const mark = (i: number) => {
            rows.forEach((r, j) => {
              if (j === i) r.dataset.current = "";
              else delete r.dataset.current;
            });
            if (i >= 0) list.dataset.active = "";
            else delete list.dataset.active;
          };

          // The next print in turn may be dealt only once it has faded out completely; a print that still shows
          // is never taken back (the widening step makes this the rare case, this makes it the rule).
          const free = (now: number) => {
            const s = state[st.next];
            return s.born < 0 || now - s.born >= LIFE;
          };

          // One print, dealt at the pointer in this frame.
          const deal = (now: number, dx: number) => {
            const item = st.current;
            if (item < 0 || !decoded[item]) return;
            const k = st.next;
            st.next = (st.next + 1) % prints.length;
            const s = state[k];
            const er = el.getBoundingClientRect();
            s.x = Math.round(st.px - er.left);
            s.y = Math.round(st.py - er.top);
            // Turned a little toward the way the hand is moving, with a touch of chance so no two land alike.
            s.r =
              gsap.utils.clamp(-8, 8, dx * 0.08) + (Math.random() - 0.5) * 5;
            s.item = item;
            s.born = now;
            prints[k].style.zIndex = String(++st.z);
            show(shots[k], item);
          };

          const paint = (now: number) => {
            for (let k = 0; k < prints.length; k += 1) {
              const s = state[k];
              const p = prints[k];
              if (s.born < 0) continue;
              const a = now - s.born;
              if (a >= LIFE) {
                s.born = -1;
                p.style.opacity = "0";
                p.style.visibility = "hidden";
                continue;
              }
              const land = easeLand(Math.min(1, a / LAND));
              const fade = easeFade(Math.max(0, (a - HOLD) / (LIFE - HOLD)));
              const scale = (DROP + (1 - DROP) * land) * (1 - (1 - END) * fade);
              const r = s.r * (SPIN + (1 - SPIN) * land);
              p.style.visibility = "visible";
              p.style.opacity = (1 - fade).toFixed(3);
              p.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${r.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
            }
          };

          // The one loop: deal when the pointer has travelled far enough, then age every print.
          const tick = (time: number, deltaMs: number) => {
            const dt = Math.max(0.001, Math.min(0.1, deltaMs / 1000));
            const dx = st.px - st.lastX;
            const dy = st.py - st.lastY;
            const moved = Math.hypot(dx, dy);
            // The hand's speed, lightly smoothed.
            st.speed += (moved / dt - st.speed) * (1 - Math.exp(-dt / 0.08));
            if (st.inside && st.current >= 0 && !reduce) {
              // A hand moving mostly up or down is passing across rows, not reading one: it deals nothing.
              if (Math.abs(dy) <= Math.abs(dx) * 1.4) st.travel += moved;
              // The step widens with speed so six prints always cover one life of the trail: a fast hand
              // leaves a longer, wider trail, and no print is ever taken back while it still shows.
              const step = Math.max(STEP, (st.speed * LIFE) / prints.length);
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

          // The single print beside a row: for keyboard focus, and for hover under reduced motion.
          const place = (i: number) => {
            const er = el.getBoundingClientRect();
            const rr = rows[i].getBoundingClientRect();
            const text = rows[i].querySelector<HTMLElement>("[data-text]");
            const end =
              (text ? text.getBoundingClientRect().right : rr.left) - er.left;
            const half = still.offsetWidth / 2;
            const edge = er.width - half - er.width * 0.03;
            const beside = Math.max(
              er.width * 0.72,
              end + half + er.width * 0.035,
            );
            const x = Math.round(Math.min(beside, edge));
            const y = Math.round(
              beside <= edge
                ? rr.top - er.top + rr.height / 2
                : rr.top - er.top - still.offsetHeight / 2 - 8,
            );
            show(stillShots, i);
            still.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
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
              // A row deals only after the hand has travelled a full step inside it, so rows merely crossed on
              // the way out stay quiet.
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
            if (!list.contains(e.relatedTarget as Node | null)) {
              mark(-1);
              hideStill();
            }
          };
          list.addEventListener("pointermove", onMove, { passive: true });
          list.addEventListener("pointerleave", onLeave);
          list.addEventListener("focusout", onFocusOut);

          return () => {
            gsap.ticker.remove(tick);
            rows.forEach((row, i) => {
              row.removeEventListener("pointerenter", onEnter[i]);
              row.removeEventListener("focus", onFocus[i]);
              delete row.dataset.current;
            });
            list.removeEventListener("pointermove", onMove);
            list.removeEventListener("pointerleave", onLeave);
            list.removeEventListener("focusout", onFocusOut);
            delete list.dataset.active;
            for (const p of [...prints, still]) {
              p.style.transform = "";
              p.style.opacity = "";
              p.style.visibility = "";
              p.style.zIndex = "";
            }
          };
        },
      );
      return () => mm.revert();
    },
    { scope: stage, dependencies: [items.length] },
  );

  // A soft shadow made from the ground itself, a step deeper than it in light and dark palettes alike.
  const shadow =
    "0 2px 6px oklch(from var(--surface-0) calc(l * 0.3) c h / 0.28), 0 26px 50px -22px oklch(from var(--surface-0) calc(l * 0.22) c h / 0.5)";
  const print = (key: string, attr: Record<string, string>) => (
    <div
      key={key}
      {...attr}
      aria-hidden
      className="pointer-events-none invisible absolute left-0 top-0 z-20 hidden aspect-[4/5] w-[clamp(11rem,15vw,17rem)] overflow-hidden rounded-[0.15rem] bg-surface-2 opacity-0 [@media(hover:hover)_and_(pointer:fine)_and_(min-width:1024px)]:block"
      style={{ boxShadow: shadow }}
    >
      {items.map((item, j) => (
        <div
          key={item.title}
          data-shot=""
          className="invisible absolute inset-0"
          data-index={j}
        >
          <Image
            src={item.image.src}
            alt=""
            fill
            loading="lazy"
            sizes="(min-width: 1024px) clamp(11rem, 15vw, 17rem), 1px"
            unoptimized={item.image.unoptimized}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );

  return (
    <section
      ref={stage}
      data-section="image-trail"
      aria-labelledby={title ? "image-trail-title" : undefined}
      className={`relative bg-surface-0 px-6 py-20 [overflow:clip] lg:px-[4vw] lg:py-[12svh] ${className}`}
    >
      {title ? (
        <h2
          id="image-trail-title"
          className="font-display mb-10 text-h2 text-ink lg:mb-[6svh]"
        >
          {title}
        </h2>
      ) : null}

      <ul
        data-list=""
        className="group/list relative z-10 border-t border-line"
      >
        {items.map((item) => {
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
              {/* The focus ring is drawn around the words only, so the print beside it stands clear of it. */}
              <span
                data-text=""
                className="flex min-w-0 flex-col gap-1.5 rounded-[0.15rem] outline-offset-[0.6rem] group-focus-visible/row:outline-2 group-focus-visible/row:outline-solid group-focus-visible/row:outline-accent lg:flex-row lg:flex-wrap lg:items-baseline lg:gap-x-[2.2vw]"
              >
                <span className="font-display block text-[10.5vw] leading-[0.95] tracking-[-0.035em] text-ink lg:text-[clamp(2.75rem,1rem_+_7vw,9rem)]">
                  {item.title}
                </span>
                <span className="block text-small text-ink-muted">
                  {item.place}, {item.year}
                </span>
              </span>
            </>
          );
          const rowClass =
            "group/row flex items-center gap-4 py-4 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none! lg:py-[1.2vw] group-data-[active]/list:not-data-[current]:opacity-[0.3]";
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

      {/* The prints: a fixed pool dealt in turn, and the one that stands beside a focused row. */}
      {Array.from({ length: POOL }, (_, k) =>
        print(`p${k}`, { "data-print": "" }),
      )}
      {print("still", { "data-still": "" })}
    </section>
  );
}
