"use client";
// fanned-cards (Struq section recipe)
// The offers, or a few cases, as a hand of cards that is played onto the table. The heading is the
// composition: its first line runs across the top at poster size, its italic second line stands at
// the bottom right, and the cards cross the type. The stage pins on the held opening frame: the
// cards, all one size and all photographs, fanned large in real 3D between the two lines, turned on a
// shared pivot, the hand turned and tipped back, the cards behind deeper in the room. Then the hand is
// played from the back: each card leaves the hand along an arc through space, swinging toward the lens
// and turning as it flies, and is laid down at its own scale, so the hand ends as a spread on the table:
// the lead card large in front, each card behind it smaller and partly under the one before, all of
// them laid over the first line of type. Each title rises out of its mask as its card lands, the lead
// paragraph last. The spread holds; when the pin lets go the cards are picked up off the table, each at
// its own speed and turn, while the type leaves with the page.
//
// Before the pin the first line rises out of its mask and the hand rises into the frame and opens, so
// every entrance is done before the first hold. One clock (Lenis on the GSAP ticker); every value is a
// plain number written as a transform, nothing else moves. The pin is 300%: the opening hand and the
// spread own long holds, the deal between them is one move.
//
// <FannedCards title="Vier vakken," accent="één hand." lead="..." items={[
//   { image: images.column[0], title: "Interieur", text: "Binnen alles op maat, van trap tot lamp.", href: "#interieur" },
//   ...three or four in all, the lead card first
// ]} />
//
// The layout in the markup is the spread, so without JavaScript and under reduced motion the section is
// that composed frame. Below 1024px it is the type, then the hand as a still fan of photographs, then
// the titles. Desktop cards lift a little on hover and focus.
import Image from "next/image";
import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";

type Item = {
  image: StruqImage;
  title: string;
  /** One line under the title. */
  text: string;
  href?: string;
};

type Props = {
  /** The heading's first line, set across the top. */
  title: string;
  /** The second line, in the display face's italic, at the bottom right: the one accent. */
  accent?: string;
  /** One or two sentences; they rise in as the last card lands. */
  lead?: string;
  /** Three or four cards, the lead card first. */
  items: Item[];
  className?: string;
};

const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const unit = (v: number) => Math.min(1, Math.max(0, v));
const move2 = gsap.parseEase("power2.inOut");
const move3 = gsap.parseEase("power3.inOut");
const outExpo = gsap.parseEase("expo.out");

/**
 * The spread, in svh from the left gutter: each card's height, top and turn on the table. Each card after
 * the first is laid partly under the one before (OVER of that card's width), smaller, so the hand recedes.
 * The tops sit just over the first line's baseline, so every card crosses the type.
 */
type Slot = { h: number; top: number; r: number };
const SPREAD: Record<3 | 4, Slot[]> = {
  4: [
    { h: 60, top: 22.5, r: -2.5 },
    { h: 44, top: 21, r: 2 },
    { h: 35, top: 20.5, r: -1.5 },
    { h: 28, top: 21.5, r: 3 },
  ],
  3: [
    { h: 60, top: 22.5, r: -2.5 },
    { h: 45, top: 21, r: 2.5 },
    { h: 34, top: 21, r: -2 },
  ],
};
const OVER = 0.3;
/** Photographs are 4:5. */
const ASPECT = 0.8;

/** The hand: its card height (share of the screen), degrees between cards, the pivot below in card heights. */
const HAND = 0.62;
const SPREAD_DEG = 12;
const PIVOT = 1.45;
/** The hand turned and tipped back, in degrees; each card behind sits this much deeper. */
const TURN_Y = 30;
const TIP_X = 12;
const DEPTH = 130;
/** How far the deepest card in the hand recedes toward the ground colour. */
const SHADE = 0.32;
/** The deal: each card's share of it, how high its arc rises (share of the screen), how far toward the lens. */
const WINDOW = 0.64;
const ARC = 0.17;
const NEAR = 360;
const SWING = 24;
/** On release each card is picked up at its own speed (share of the screen) and turn. */
const LIFT = [0.55, 0.85, 1.05, 1.25];
const SPIN = [-6, 5, -7, 8];
/** The pointer turns the held hand by up to this many degrees. */
const TILT = 5;

const svh = (v: number) => `${v.toFixed(2)}svh`;

export function FannedCards({ title, accent, lead, items, className = "" }: Props) {
  const stage = useRef<HTMLElement>(null);
  const cards = items.slice(0, 4);
  const n = cards.length;
  const slots = SPREAD[n >= 4 ? 4 : 3].slice(0, n);

  // The spread's geometry in svh, shared by the markup (the still) and the script (the landing places).
  let x = 0;
  const geo = slots.map((s, i) => {
    const w = s.h * ASPECT;
    const left = x;
    x += w * (1 - OVER);
    return { ...s, i, w, left, right: left + w, bottom: s.top + s.h };
  });

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const one = (s: string) => el.querySelector<HTMLElement>(s);
      const all = (s: string) => Array.from(el.querySelectorAll<HTMLElement>(s));
      const type = one("[data-type]");
      const lineOne = one("[data-line-one]");
      const lineTwo = one("[data-line-two]");
      const deck = one("[data-deck]");
      const leadBox = one("[data-lead]");
      const rise = all("[data-rise]");
      const cardEls = all("[data-card]");
      const shades = cardEls.map((c) => c.querySelector<HTMLElement>("[data-shade]"));
      const caps = all("[data-cap]");
      const capLines = caps.map((c) => Array.from(c.querySelectorAll<HTMLElement>("[data-cap-line]")));
      if (!type || !lineOne || !deck || cardEls.length === 0) return;

      // The type fits its frame whatever the face: the first line within the width, the second clear of the
      // lead card's title. Measured at the natural size, then scaled.
      const fit = () => {
        el.style.setProperty("--fit", "1");
        const W = el.clientWidth;
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        const one1 = lineOne.offsetWidth;
        const two = lineTwo?.offsetWidth ?? 0;
        const k = Math.min(
          1,
          one1 > 0 ? (wide ? W * 0.92 : W - 48) / one1 : 1,
          two > 0 ? (wide ? W * 0.64 : W - 48) / two : 1,
        );
        if (k < 0.995) el.style.setProperty("--fit", String(Math.floor(k * 1000) / 1000));
      };
      fit();
      document.fonts?.ready.then(fit);
      window.addEventListener("resize", fit);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        el.dataset.motion = "1";

        // Layout positions, untouched by transforms: offsets walk up to the stage.
        const box = (node: HTMLElement) => {
          let bx = 0;
          let by = 0;
          let cur: HTMLElement | null = node;
          while (cur && cur !== el) {
            bx += cur.offsetLeft;
            by += cur.offsetTop;
            cur = cur.offsetParent as HTMLElement | null;
          }
          return { x: bx, y: by, w: node.offsetWidth, h: node.offsetHeight };
        };

        const g = {
          W: 1,
          H: 1,
          hand: { x: 0, y: 0 },
          radius: 0,
          cards: [] as { sx: number; sy: number; k: number; a: number; r: number; start: number; dir: number }[],
        };

        // How far the held hand reaches down over the italic line: its lowest projected edge over that line,
        // against the top of the line's accents. Read from the boxes the browser has drawn, with the hand
        // set to its opening frame for the reading and put back after.
        const overLineTwo = () => {
          if (!lineTwo) return 0;
          const er = el.getBoundingClientRect();
          const lr = lineTwo.getBoundingClientRect();
          const em = parseFloat(getComputedStyle(lineTwo).fontSize) || 100;
          const limit = lr.top - er.top - em * 0.14;
          const saved = { ...s };
          Object.assign(s, { enter: 1, deal: 0, exit: 0, tx: 0, ty: 0 });
          paint();
          let low = -Infinity;
          for (const c of cardEls) {
            const r = c.getBoundingClientRect();
            if (r.right > lr.left && r.left < lr.right) low = Math.max(low, r.bottom - er.top);
          }
          Object.assign(s, saved);
          paint();
          return low - limit;
        };

        // The hand sits between the two lines and never over the italic one, so "één" keeps its accents in
        // every face: it rises first (a little more of the first line goes under it), then holds smaller.
        const measure = () => {
          fit();
          g.W = el.clientWidth;
          g.H = el.clientHeight;
          layout(1, 0);
          let over = overLineTwo();
          if (over > 0) {
            const lift = Math.min(over + 4, g.H * 0.07);
            layout(1, lift);
            over = overLineTwo();
            if (over > 0) layout(Math.max(0.72, 1 - (over + 6) / (g.H * HAND)), lift);
          }
        };

        const layout = (scale: number, lift: number) => {
          const hh = g.H * HAND * scale;
          const hw = hh * ASPECT;
          const edge = ((n - 1) / 2) * SPREAD_DEG * DEG;
          g.radius = hh * PIVOT;
          // The hand's reach either side of its centre, a little less than flat since it is turned.
          const half = 0.9 * (g.radius * Math.sin(edge) + (hw / 2) * Math.cos(edge) + (hh / 2) * Math.sin(edge));
          const hx = Math.min(g.W * 0.6, g.W * 0.965 - half);
          const hy = g.H * 0.5 - lift;
          g.hand = { x: hx, y: hy + g.radius };
          g.cards = cardEls.map((c, i) => {
            const b = box(c);
            const sx = b.x + b.w / 2;
            const a = (i - (n - 1) / 2) * SPREAD_DEG;
            const fx = g.hand.x + g.radius * Math.sin(a * DEG);
            return {
              sx,
              sy: b.y + b.h / 2,
              k: hh / Math.max(1, b.h),
              a,
              r: geo[i]?.r ?? 0,
              // The hand is played from the back, so each card is laid down over the one before.
              start: n > 1 ? ((n - 1 - i) * (1 - WINDOW)) / (n - 1) : 0,
              dir: Math.sign(sx - fx) || 1,
            };
          });
          // One shared lens, its vanishing point on the hand.
          const db = box(deck);
          deck.style.perspective = `${Math.round(Math.max(g.W, g.H) * 1.1)}px`;
          deck.style.perspectiveOrigin = `${(hx - db.x).toFixed(1)}px ${(hy - db.y).toFixed(1)}px`;
        };

        // Every value the scroll and the pointer drive, as plain numbers.
        const s = { enter: 0, deal: 0, exit: 0, tx: 0, ty: 0 };
        let leadLines: HTMLElement[] = [];

        const paint = () => {
          const { H } = g;
          // Before the pin: the first line rises, the hand rises into the frame and opens.
          const typeIn = outExpo(unit((s.enter - 0.02) / 0.42));
          for (const r of rise) r.style.transform = `translate3d(0, ${((1 - typeIn) * 112).toFixed(2)}%, 0)`;
          const up = outExpo(unit((s.enter - 0.12) / 0.66));
          const open = move3(unit((s.enter - 0.42) / 0.58));

          for (let i = 0; i < cardEls.length; i += 1) {
            const c = g.cards[i];
            if (!c) continue;
            // The card in the hand.
            const a = c.a * open;
            const x0 = g.hand.x + g.radius * Math.sin(a * DEG) + (1 - open) * i * 8;
            const y0 = g.hand.y - g.radius * Math.cos(a * DEG) + (1 - up) * H * 1.0 - (1 - open) * i * 6;
            const z0 = -i * DEPTH * (0.35 + 0.65 * open);
            // The deal: along an arc through space, swinging toward the lens and turning as it flies.
            const t = unit((s.deal - c.start) / WINDOW);
            const e = move3(t);
            const flat = move2(unit(t / 0.8));
            const bump = Math.sin(Math.PI * e);
            const xc = (x0 + c.sx) / 2;
            const yc = (y0 + c.sy) / 2 - ARC * H;
            const u = 1 - e;
            const px = u * u * x0 + 2 * u * e * xc + e * e * c.sx;
            const py = u * u * y0 + 2 * u * e * yc + e * e * c.sy;
            // The release: picked up off the table, each at its own speed and turn.
            const lift = s.exit * H * (LIFT[i] ?? 1);
            const z = lerp(z0, 0, e) + NEAR * bump + s.exit * 140;
            const ry = (-TURN_Y + s.ty) * (1 - flat) + SWING * bump * c.dir;
            const rx = (TIP_X + s.tx) * (1 - flat) - 12 * bump;
            const rz = lerp(a, c.r, e) + 9 * bump * c.dir + s.exit * (SPIN[i] ?? 0);
            const k = lerp(c.k, 1, e);
            cardEls[i].style.transform = `translate3d(${(px - c.sx).toFixed(2)}px, ${(py - c.sy - lift).toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${k.toFixed(4)})`;
            const shade = shades[i];
            if (shade) shade.style.opacity = (n > 1 ? (i / (n - 1)) * SHADE * (1 - e) : 0).toFixed(3);
            // The card's title rises out of its mask as the card lands, and leaves with it.
            const land = move3(unit((t - 0.7) / 0.3));
            const cap = caps[i];
            if (cap) cap.style.transform = `translate3d(0, ${(-lift).toFixed(2)}px, 0)`;
            const ls = capLines[i] ?? [];
            for (let j = 0; j < ls.length; j += 1) {
              const lj = move3(unit((land - j * 0.18) / 0.82));
              ls[j].style.transform = `translate3d(0, ${((1 - lj) * 112).toFixed(2)}%, 0)`;
            }
          }
          // The lead paragraph rises line by line as the last card lands.
          const m = leadLines.length;
          for (let j = 0; j < m; j += 1) {
            const span = m > 1 ? 0.35 / (m - 1) : 0;
            const e = move3(unit((s.deal - 0.66 - j * span * 0.34) / 0.34));
            leadLines[j].style.transform = `translate3d(0, ${((1 - e) * 112).toFixed(2)}%, 0)`;
          }
        };

        const leadP = leadBox?.querySelector("p");
        const split = leadP
          ? SplitText.create(leadP, {
              type: "lines",
              mask: "lines",
              linesClass: "struq-line",
              autoSplit: true,
              onSplit(self) {
                leadLines = self.lines as HTMLElement[];
                paint();
              },
            })
          : null;

        for (const c of cardEls) c.style.rotate = "none";
        measure();
        paint();
        for (const node of [type, deck, leadBox, ...caps]) if (node) node.style.visibility = "visible";

        // Before the pin: the type and the hand arrive with the scroll, done by the time it pins.
        gsap.to(s, {
          enter: 1,
          ease: "none",
          onUpdate: paint,
          scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 1 },
        });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          onUpdate: paint,
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 1,
            onRefresh: () => {
              measure();
              paint();
            },
          },
        });
        // Hold on the open hand, the deal as one move, hold on the spread: the holds take more than the bar's
        // half and three fifths of the move.
        tl.to({}, { duration: 0.95 }).to(s, { deal: 1, duration: 1.65 }).to({}, { duration: 1.15 });

        // The release: once the pin lets go the cards are picked up off the table.
        const pinned = tl.scrollTrigger!;
        gsap.to(s, {
          exit: 1,
          ease: "none",
          onUpdate: paint,
          scrollTrigger: {
            start: () => pinned.end,
            end: () => pinned.end + window.innerHeight,
            scrub: 0.6,
          },
        });

        // The pointer turns the held hand a little; the turn leaves each card as it is played.
        const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const toX = gsap.quickTo(s, "tx", { duration: 0.9, ease: "power3.out", onUpdate: paint });
        const toY = gsap.quickTo(s, "ty", { duration: 0.9, ease: "power3.out", onUpdate: paint });
        const onMove = (ev: PointerEvent) => {
          toY((ev.clientX / window.innerWidth - 0.5) * 2 * TILT);
          toX((ev.clientY / window.innerHeight - 0.5) * -1.4 * TILT);
        };
        if (fine) window.addEventListener("pointermove", onMove, { passive: true });

        return () => {
          window.removeEventListener("pointermove", onMove);
          split?.revert();
          delete el.dataset.motion;
          for (const c of cardEls) {
            c.style.transform = "";
            c.style.rotate = "";
          }
          for (const sh of shades) if (sh) sh.style.opacity = "";
          for (const r of rise) r.style.transform = "";
          for (const cap of caps) cap.style.transform = "";
          for (const ls of capLines) for (const l of ls) l.style.transform = "";
          deck.style.perspective = "";
          deck.style.perspectiveOrigin = "";
        };
      });
      return () => {
        window.removeEventListener("resize", fit);
        mm.revert();
      };
    },
    { scope: stage, dependencies: [n] },
  );

  // Hidden until the script has set the opening frame, on desktop with motion only, and shown after 3s
  // whatever happens, so a failed script can never leave the section empty. The page's pre-paint class is
  // `js` in a client project and `sq-js` on struq.nl.
  const gate =
    "lg:motion-safe:[.js_&]:invisible lg:motion-safe:[.sq-js_&]:invisible lg:motion-safe:animate-[struq-show_0s_3s_forwards]";
  // The shared line mask (blocks.css): it clips only top and bottom, with room for accents and descenders measured
  // in its own em, so each mask carries the size of the line it holds.
  const mask = "struq-line-mask block";
  const size = "text-[length:calc(var(--d)*var(--fit,1))]";
  const display = `font-display block w-fit whitespace-nowrap ${size} leading-[0.92] tracking-[-0.04em]`;
  // A soft shadow made from the ground itself, deeper than the ground in light and dark palettes alike.
  const shadow =
    "0 2px 6px oklch(from var(--surface-0) calc(l * 0.3) c h / 0.3), 0 36px 64px -28px oklch(from var(--surface-0) calc(l * 0.22) c h / 0.62)";

  return (
    <section
      ref={stage}
      data-section="fanned-cards"
      aria-labelledby="fanned-cards-title"
      className={`relative overflow-hidden bg-surface-0 py-16 [--d:15vw] lg:h-svh lg:py-0 lg:[--d:min(12.5vw,19.5svh)] ${className}`}
    >
      <h2
        id="fanned-cards-title"
        data-type=""
        className={`relative z-0 px-6 lg:static lg:px-0 ${gate}`}
      >
        <span className={`${mask} ${size} lg:absolute lg:left-[4vw] lg:top-[5svh]`}>
          <span data-rise="" data-line-one="" className={display}>
            {title}
          </span>
        </span>
        {accent ? (
          <span className={`${mask} ${size} ml-auto w-fit lg:absolute lg:bottom-[4svh] lg:right-[4vw]`}>
            <span
              data-line-two=""
              className={`${display} font-accent font-light italic tracking-[-0.03em]`}
            >
              {accent}
            </span>
          </span>
        ) : null}
      </h2>

      {lead ? (
        <div
          data-lead=""
          className={`relative mt-6 max-w-[34ch] px-6 lg:absolute lg:bottom-[calc(4svh+var(--d)*var(--fit,1)*0.92+2.2svh)] lg:right-[4vw] lg:mt-0 lg:w-[min(24vw,24ch)] lg:max-w-none lg:px-0 ${gate}`}
        >
          <p className="text-body text-ink-muted">{lead}</p>
        </div>
      ) : null}

      <div
        data-deck=""
        className={`relative z-10 mx-auto mt-10 h-[92vw] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto ${gate}`}
      >
        {cards.map((item, i) => {
          const s = geo[i];
          const fan = (i - (n - 1) / 2) * 7;
          const photo = (
            <span
              data-face=""
              className="relative block h-full w-full overflow-hidden rounded-[0.2rem] bg-surface-2 transition-[translate] duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:group-hover/card:-translate-y-3 lg:group-focus-visible/card:-translate-y-3"
              style={{ boxShadow: shadow }}
            >
              <Image
                src={item.image.src}
                alt={item.image.alt}
                fill
                sizes="(min-width: 1024px) 36vw, 50vw"
                unoptimized={item.image.unoptimized}
                className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] lg:group-hover/card:scale-[1.04]"
              />
              <span data-shade="" aria-hidden className="pointer-events-none absolute inset-0 bg-surface-0 opacity-0" />
            </span>
          );
          const shared = {
            "data-card": "",
            "aria-label": item.href ? item.title : undefined,
            className:
              "group/card absolute left-[21vw] top-[6vw] block aspect-[4/5] w-[58vw] origin-[50%_150%] rotate-[var(--fan)] outline-offset-4 lg:left-[calc(4vw+var(--x))] lg:top-[var(--y)] lg:aspect-auto lg:h-[var(--h)] lg:w-[var(--w)] lg:origin-center lg:rotate-[var(--r)]",
            style: {
              zIndex: n - i,
              "--fan": `${fan}deg`,
              "--x": svh(s.left),
              "--y": svh(s.top),
              "--w": svh(s.w),
              "--h": svh(s.h),
              "--r": `${s.r}deg`,
            } as React.CSSProperties,
          };
          return item.href ? (
            <a key={item.title} href={item.href} {...shared}>
              {photo}
            </a>
          ) : (
            <div key={item.title} {...shared}>
              {photo}
            </div>
          );
        })}
      </div>

      {/* The titles: a list under the fan on phones; on desktop each under its own card, the last beside it. */}
      <div className="relative z-20 mt-10 grid gap-6 px-6 lg:contents">
        {cards.map((item, i) => {
          const s = geo[i];
          const prev = geo[i - 1];
          const isLast = i === n - 1 && n > 1;
          const lead0 = i === 0;
          const pos = isLast
            ? { "--cx": svh(s.right + 2.5), "--cb": `calc(100svh - ${svh(s.bottom)})` }
            : { "--cx": svh(prev ? prev.right + 1.6 : s.left), "--cy": svh(s.bottom + 1.8) };
          return (
            <div
              key={item.title}
              data-cap=""
              className={`border-t border-line pt-3 lg:absolute lg:left-[calc(4vw+var(--cx))] lg:w-[min(29svh,21vw)] lg:border-0 lg:pt-0 ${
                isLast ? "lg:bottom-[var(--cb)]" : "lg:top-[var(--cy)]"
              } ${lead0 ? "lg:w-[min(34svh,26vw)]" : ""} ${gate}`}
              style={pos as React.CSSProperties}
            >
              <span className={`${mask} text-h3 ${lead0 ? "lg:text-[clamp(2rem,1rem_+_1.7vw,3rem)]" : ""}`}>
                <span
                  data-cap-line=""
                  className={`font-display block text-h3 text-ink hyphens-auto ${
                    lead0 ? "lg:text-[clamp(2rem,1rem_+_1.7vw,3rem)] lg:leading-[1.05]" : ""
                  }`}
                >
                  {item.title}
                </span>
              </span>
              {/* The spacing sits on a plain wrapper: the mask's own negative margins would cancel it. */}
              <span className="mt-1.5 block">
                <span className={`${mask} text-small`}>
                  <span data-cap-line="" className="block text-small text-ink-muted">
                    {item.text}
                  </span>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
