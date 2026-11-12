"use client";
// zoom-through (Struq transition recipe)
// A scene change inside a page: the camera pushes into a photo until that photo is the next
// section's ground. The stage pins on a composed frame: the display line on the ground, a short
// lead, and the photo in an upright window on the other side with its caption and four corner
// marks. It holds. Then the camera travels toward the window. Everything on the ground is nearer
// the lens than the photo, so it scales faster and falls away past the edges (the lead fastest,
// the display line next, the caption with the wall), while the window opens until all four of its
// edges leave the screen together: the camera arrives, it does not wipe. The photo sits deeper than
// the window: it grows far less than the frame, eases out of a small push-in and settles at full
// bleed, its subject held on the same point throughout. Then the next section stands in it: a strip
// of the page's ground rises from the bottom edge with the first line, and the heading, at the same
// display size as the line the camera left, rises out of masks on the photo's calm side. It holds,
// and the pin lets go with the photo drifting slower than the page, which continues from the strip.
//
// The camera is one number (`e`, 0 to 1). The window, the photo, every layer of type and the
// marks are all derived from it on every frame, about one fixed point (the window's centre), so
// the photo stays registered on its subject. The window's clip is written as pixel insets from
// plain numbers, never tweened as a string. The pin is 300%: every key frame holds.
// Lead for an architect, a hotel, a studio: any brief whose photo is a place to walk into.
//
// <ZoomThrough image={images.hero[1]} title="Licht" accent="eerst." lead="..." caption="Patiohuis, Alentejo"
//   heading={["Naar", "binnen."]} line="We tekenen eerst het licht, daarna pas de muren." />
//
// The window goes over the photo's subject: by default on the side opposite the photo's calm side
// (`negativeSpace`), so the copy of both scenes stands where the photo is quiet. Pass `side` when the
// beeldbank's calm side is wrong for the photo.
//
// Contrast, on every path. The small line always sits on the ground strip, in ink on the page's
// own ground. The heading stands on the photo only where the photo earns it: once the photo has
// loaded, the block reads its pixels under the heading, low and then high on the calm side, then
// low and high on the window's side (the beeldbank's calm side can be wrong), and keeps the first
// place where a dark ink (derived from the ground) or the palette's on-photo ink holds 4.5:1 over
// the median and 3:1 over 95 in 100 pixels. Where none does, or the photo cannot be read (another
// origin without CORS), each heading line gets a band of ground running out to the calm edge, stepped
// on top of the strip: still display size, still in the photo's frame. That stepped frame is also the
// first paint, so nothing waits on a script to be legible. `headingInk` skips the reading when the
// author knows the photo. No scrim, no veil, no fixed black or white.
//
// Phones and reduced motion: the composed still. The lead and the display line on the ground,
// then the photo full bleed with the heading standing in it over the same ground strip.
import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { photoLuminances } from "../kit/photo-read";

type Side = "left" | "right";
type Ink = "auto" | "light" | "dark" | "ground";

type Props = {
  image: StruqImage;
  /** The composed frame's display word or words, the first line. */
  title: string;
  /** The second line, in the display face's italic: the one accent. */
  accent?: string;
  /** One or two sentences on the ground, small against the display line. */
  lead?: string;
  /** Metadata for the photo: under the window, and on the ground strip at the end. */
  caption?: string;
  /** The next section's heading, one short entry per line: it is set at display size. */
  heading: string[];
  /** The next section's first line, on the ground strip. */
  line?: string;
  /** Where the copy of both scenes stands. Defaults to the photo's calm side; the window takes the other. */
  side?: Side;
  /**
   * The heading's ink over the photo. "auto" (the default) reads the photo; "light" or "dark" is the author's
   * word that the photo is dark or bright under the heading; "ground" always sets it on the ground strip.
   */
  headingInk?: Ink;
  className?: string;
};

/** The photo's push-in inside the window at the start; it eases to 1 as the camera arrives. */
const PUSH = 1.3;
/** Sharpness of the soft limit that stops the photo growing once the window clears the screen. */
const KNEE = 6;
const soft = (x: number) => Math.pow(Math.pow(x, -KNEE) + 1, -1 / KNEE);
/** The camera position at which all four window edges reach the screen edges, together; they carry on past them. */
const CROSS = 0.93;
/** How near the lens each layer of the composed frame sits (1 is the wall the window is cut into). */
const DEPTH = { caption: 1, title: 0.97, lead: 0.94 };
/** The window's centre on the screen, as a share of the stage: over the photo's subject. */
const AIM_Y = 46;
/** Half the window's width and height. Upright 4:5, at most 52% of the screen high and 30% wide. */
const HALF_W = "min(20.8svh, 15vw)";
const HALF_H = "min(26svh, 18.75vw)";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/**
 * Which ink the photo allows under one box: "dark" (the ground-derived dark, luminance under 0.012), "light"
 * (the palette's on-photo ink, taken at a cautious 0.8), "none" when neither holds 4.5:1 over the median and
 * 3:1 over 95 in 100 pixels, and null when the pixels cannot be read.
 */
function readInk(img: HTMLImageElement, box: { x: number; y: number; w: number; h: number }, W: number, H: number) {
  if (!W || !H) return null;
  const ys = photoLuminances(img, { x: 0, y: 0, w: W, h: H }, box);
  if (!ys) return null;
  const at = (q: number) => ys[Math.min(ys.length - 1, Math.floor(ys.length * q))];
  // Dark ink: (Y + 0.05) / 0.062 is 4.5 at Y 0.229 and 3 at Y 0.136.
  if (at(0.5) >= 0.229 && at(0.05) >= 0.136) return "dark";
  // Light ink: 0.85 / (Y + 0.05) is 4.5 at Y 0.139 and 3 at Y 0.233.
  if (at(0.5) <= 0.139 && at(0.95) <= 0.233) return "light";
  return "none";
}

export function ZoomThrough({
  image,
  title,
  accent,
  lead,
  caption,
  heading,
  line,
  side,
  headingInk = "auto",
  className = "",
}: Props) {
  const stage = useRef<HTMLElement>(null);
  // Set when the photo is calmer under the heading on the window's side than on its own (the beeldbank's calm side
  // can be wrong): the arrived copy then stands on that side.
  const [flip, setFlip] = useState(false);
  const flipNow = useRef(false);
  const copySide: Side = side ?? (image.negativeSpace === "right" ? "right" : "left");
  const aimX = copySide === "left" ? 70 : 30;
  // The first paint is always legible: the heading on the ground strip unless the author vouches for the photo.
  const firstPlace = headingInk === "light" || headingInk === "dark" ? "low" : "ground";
  const firstInk = headingInk === "dark" ? "dark" : "light";

  // The composed frame, laid out in CSS so the first paint is already the first frame.
  const win = {
    left: `calc(${aimX}% - ${HALF_W})`,
    top: `calc(${AIM_Y}% - ${HALF_H})`,
    width: `calc(2 * ${HALF_W})`,
    height: `calc(2 * ${HALF_H})`,
  };
  const startClip = `inset(calc(${AIM_Y}% - ${HALF_H}) calc(${100 - aimX}% - ${HALF_W}) calc(${100 - AIM_Y}% - ${HALF_H}) calc(${aimX}% - ${HALF_W}))`;
  const origin = `${aimX}% ${AIM_Y}%`;
  const startScale = "scale(0.73)";

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      // Scripts run: the pinned stage replaces the still (CSS reads this, or the layout's pre-paint class).
      el.dataset.live = "";
      const one = <T extends HTMLElement = HTMLElement>(s: string) => el.querySelector<T>(s);
      const tree = one("[data-tree]");
      const windowBox = one("[data-window]");
      const clip = one("[data-clip]");
      const drift = one("[data-drift]");
      const plane = one("[data-plane]");
      const copy = one("[data-copy]");
      const titleBox = one("[data-title]");
      const stillTitle = one("[data-still-title]");
      const still = one("[data-still-photo]");
      if (!tree || !windowBox || !clip || !drift || !plane || !copy || !titleBox || !stillTitle || !still) return;
      const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-depth]"));
      const marks = Array.from(el.querySelectorAll<HTMLElement>("[data-mark]"));

      // Layout positions, untouched by transforms: offsets walk up to `top`.
      const box = (n: HTMLElement, top: HTMLElement) => {
        let x = 0;
        let y = 0;
        let cur: HTMLElement | null = n;
        while (cur && cur !== top) {
          x += cur.offsetLeft;
          y += cur.offsetTop;
          cur = cur.offsetParent as HTMLElement | null;
        }
        return { x, y, w: n.offsetWidth, h: n.offsetHeight };
      };

      // Fit: the display line never runs into the window or past the edge, whatever the face; the arrived
      // heading takes the same size and fits the calm half of the photo.
      const fit = () => {
        const set = (name: string, room: number, lines: HTMLElement[]) => {
          const need = Math.max(0, ...lines.map((n) => n.offsetWidth));
          if (need > 0) el.style.setProperty(name, String(Math.floor(Math.min(1, room / need) * 1000) / 1000));
        };
        const all = (root: HTMLElement, s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
        for (const v of ["--zt-fit", "--zt-sfit", "--zt-hfit"]) el.style.setProperty(v, "1");
        if (tree.offsetParent) {
          const W = tree.clientWidth;
          const wb = box(windowBox, tree);
          set("--zt-fit", copySide === "left" ? wb.x - W * 0.09 : W - (wb.x + wb.w) - W * 0.09, all(titleBox, "[data-line]"));
          set("--zt-hfit", W * 0.44, all(copy, "[data-hline]"));
        } else {
          set("--zt-sfit", stillTitle.clientWidth, all(stillTitle, "[data-line]"));
          const W = still.clientWidth;
          set("--zt-hfit", W >= 768 ? W * 0.44 : W - 48, all(still, "[data-hline]"));
        }
      };

      // Where the heading stands, read from whichever photo is on screen: low on the calm side, then high, else
      // on the ground strip. In the pinned stage the heading is outside the window until the push, so the choice
      // never shows. The pixels come from a plain CORS copy of the loaded file: a srcset image's natural size is
      // density-corrected, and a photo from another origin without CORS cannot be read at all (it stays on ground).
      let probe: HTMLImageElement | null = null;
      let alive = true;
      let onPlace = () => {};
      const tone = () => {
        if (headingInk !== "auto") return;
        const motion = tree.offsetParent !== null;
        const img = (motion ? plane : still).querySelector("img");
        const src = img?.currentSrc || img?.src;
        if (!img || !src || !img.complete) return;
        if (probe?.src !== new URL(src, location.href).href || !probe.complete) {
          const next = document.createElement("img");
          next.crossOrigin = "anonymous";
          next.decoding = "async";
          next.src = src;
          probe = next;
          next.decode().then(
            () => alive && probe === next && tone(),
            () => undefined,
          );
          return;
        }
        const host = motion ? tree : still;
        const head = (motion ? copy : still).querySelector<HTMLElement>("[data-head]");
        if (!head) return;
        // `other`: the heading mirrored onto the window's side of the photo (the layout is symmetric, so its box
        // is the mirror of the measured one).
        const read = (place: "low" | "high", other: boolean) => {
          el.dataset.place = place;
          const W = host.clientWidth;
          const b = Array.from(head.querySelectorAll<HTMLElement>("[data-hline]")).map((n) => {
            const p = box(n, host);
            return other !== flipNow.current ? { ...p, x: W - p.x - p.w } : p;
          });
          if (!b.length) return null;
          const x0 = Math.min(...b.map((p) => p.x));
          const y0 = Math.min(...b.map((p) => p.y));
          const x1 = Math.max(...b.map((p) => p.x + p.w));
          const y1 = Math.max(...b.map((p) => p.y + p.h));
          const pad = 16;
          return readInk(probe!, { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }, W, host.clientHeight);
        };
        // The calm side low, then high; then the other side; only then the ground bands.
        let place = "ground";
        let ink = "light";
        let other = false;
        for (const [p, o] of [["low", false], ["high", false], ["low", true], ["high", true]] as const) {
          const r = read(p, o);
          if (r === "dark" || r === "light") {
            place = p;
            ink = r;
            other = o;
            break;
          }
        }
        el.dataset.place = place;
        el.dataset.ink = ink;
        flipNow.current = other;
        setFlip(other);
        onPlace();
      };
      const imgs = Array.from(el.querySelectorAll("img"));
      for (const img of imgs) img.addEventListener("load", tone);

      const settle = () => {
        fit();
        tone();
      };
      settle();
      document.fonts?.ready.then(settle);
      window.addEventListener("resize", settle);

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const strip = copy.querySelector<HTMLElement>("[data-strip]");
        const headWrap = copy.querySelector<HTMLElement>("[data-head]");
        const g = {
          W: 1, H: 1, px: 0, py: 0, hw: 1, hh: 1,
          // Per side (left, right, top, bottom): the window's start reach from the centre, the screen's, their ratio.
          h0: [1, 1, 1, 1], d: [1, 1, 1, 1], r: [1, 1, 1, 1],
          R: 1, Kc: 1, slab: 0,
        };
        const slab = () => {
          const ground = el.dataset.place === "ground";
          g.slab = (strip?.offsetHeight ?? 0) + (ground && headWrap ? headWrap.offsetHeight : 0);
        };
        const measure = () => {
          fit();
          g.W = tree.clientWidth;
          g.H = tree.clientHeight;
          const b = box(windowBox, tree);
          g.hw = b.w / 2;
          g.hh = b.h / 2;
          g.px = b.x + g.hw;
          g.py = b.y + g.hh;
          g.h0 = [g.hw, g.hw, g.hh, g.hh];
          g.d = [g.px, g.W - g.px, g.py, g.H - g.py];
          g.r = g.h0.map((h, i) => h / g.d[i]);
          g.R = Math.max(...g.r);
          // The camera's own travel, for the type on the wall: as far as the window's farthest edge goes.
          g.Kc = Math.pow(1 / Math.min(...g.r), 1 / CROSS);
          slab();
          const o = `${g.px.toFixed(1)}px ${g.py.toFixed(1)}px`;
          for (const n of [plane, copy, ...layers]) n.style.transformOrigin = o;
        };

        // The camera (0 at the composed frame, 1 when the photo is the ground) and the ground strip's rise.
        const s = { e: 0, strip: 0 };
        const paint = () => {
          // Each edge of the window opens from its own start to just past its own screen edge, on the same
          // exponential curve, so all four leave the screen together however far off centre the window sits.
          const reach = g.h0.map((h, i) => h * Math.pow(g.d[i] / h, s.e / CROSS));
          const l = g.px - reach[0];
          const r = g.px + reach[1];
          const t = g.py - reach[2];
          const b = g.py + reach[3];
          const px = (v: number) => `${Math.max(0, v).toFixed(2)}px`;
          clip.style.clipPath = `inset(${px(t)} ${px(g.W - r)} ${px(g.H - b)} ${px(l)})`;
          // The photo: it grows less than the window, settles out of its push-in, and is exactly full bleed when
          // the camera arrives. It always covers what the window shows.
          const push = 1 + (PUSH - 1) * Math.pow(1 - s.e, 1.2);
          const base = Math.pow(g.R, 1 - s.e / CROSS);
          let sig = (soft(base) / soft(Math.pow(g.R, 1 - 1 / CROSS))) * push;
          for (let i = 0; i < 4; i += 1) sig = Math.max(sig, Math.min(reach[i] / g.d[i], 1));
          const ps = `scale(${sig.toFixed(5)})`;
          plane.style.transform = ps;
          copy.style.transform = ps;
          // The composed frame, nearer the lens: each layer scales as its distance closes, and is put away
          // once it is past the edges.
          const m = 1 - 1 / Math.pow(g.Kc, s.e);
          for (const n of layers) {
            const dd = Number(n.dataset.depth) || 1;
            const k = dd / Math.max(dd - m, 0.001);
            n.style.transform = `scale(${k.toFixed(4)})`;
            n.style.visibility = k > 14 ? "hidden" : "";
          }
          // The marks ride out on the window's corners.
          for (const n of marks) {
            const at = n.dataset.mark ?? "";
            const x = at.includes("l") ? g.hw - reach[0] : reach[1] - g.hw;
            const y = at.includes("t") ? g.hh - reach[2] : reach[3] - g.hh;
            n.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
          }
          // The ground strip (and the heading's ground, when it stands there) rises from the bottom edge.
          const lift = `translate3d(0, ${((1 - s.strip) * g.slab).toFixed(2)}px, 0)`;
          if (strip) strip.style.transform = lift;
          if (headWrap) headWrap.style.transform = el.dataset.place === "ground" ? lift : "";
        };
        onPlace = () => {
          slab();
          paint();
        };

        measure();
        paint();

        const heads = Array.from(copy.querySelectorAll<HTMLElement>("[data-rise]"));
        const after = Array.from(copy.querySelectorAll<HTMLElement>("[data-after]"));
        const PUSH_AT = 1.2;
        const PUSH_FOR = 2.4;
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
        // Hold on the composed frame: half the push.
        tl.to({}, { duration: PUSH_AT })
          // The push: the composed frame falls away, the window opens past every edge at once, the photo settles.
          .to(s, { e: 1, duration: PUSH_FOR, ease: "power2.inOut" })
          // As the last edges leave, the ground strip rises with the line, and the heading stands up in the photo.
          .to(s, { strip: 1, duration: 0.9, ease: "power3.inOut" }, PUSH_AT + PUSH_FOR * 0.8)
          .from(heads, { yPercent: 118, duration: 0.95, stagger: 0.09, ease: "expo.out" }, PUSH_AT + PUSH_FOR * 0.84)
          .from(after, { yPercent: 118, duration: 0.95, stagger: 0.06, ease: "expo.out" }, "<0.2")
          // Hold on the arrived scene (more than half the push); the pin then lets it go.
          .to({}, { duration: 1.5 });

        // Depth on the way in and out: the photo lags the page as the stage arrives and as it leaves.
        const pin = tl.scrollTrigger!;
        gsap.fromTo(
          drift,
          { yPercent: -6 },
          { yPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: true } },
        );
        gsap.fromTo(
          drift,
          { yPercent: 0 },
          {
            yPercent: 32,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { start: () => pin.end, end: () => pin.end + el.offsetHeight, scrub: true },
          },
        );

        return () => {
          onPlace = () => {};
          clip.style.clipPath = startClip;
          for (const n of [plane, copy]) {
            n.style.transform = startScale;
            n.style.transformOrigin = origin;
          }
          for (const n of layers) {
            n.style.transform = "";
            n.style.visibility = "";
            n.style.transformOrigin = "";
          }
          for (const n of [...marks, strip, headWrap]) if (n) n.style.transform = "";
        };
      });

      return () => {
        alive = false;
        delete el.dataset.live;
        window.removeEventListener("resize", settle);
        for (const img of imgs) img.removeEventListener("load", tone);
        mm.revert();
      };
    },
    { scope: stage, dependencies: [copySide, headingInk] },
  );

  const right = copySide === "right";
  const display = `font-display block w-fit whitespace-nowrap leading-[0.86] tracking-[-0.04em] [word-spacing:0.08em]`;
  const italic = "font-accent font-light italic tracking-[-0.02em]";

  const photo = () => (
    <>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="100vw"
        unoptimized={image.unoptimized}
        className="object-cover [filter:saturate(0.9)_contrast(1.06)]"
      />
      {/* The grade: shadows lifted toward the page's own ground. */}
      <div aria-hidden className="absolute inset-0 bg-surface-0 opacity-[0.07] mix-blend-screen" />
    </>
  );

  // The arrived scene, the same in the pinned stage and the still: the heading over the photo and the strip with
  // the line and the caption. `motion` adds the masks the heading and line rise from. Where the photo cannot carry
  // the heading, each heading line gets its own band of ground running out to the calm edge, stepped on top of
  // the strip: one cut-paper shape of the page's ground set into the photo, the heading still at display size and
  // still in the photo's frame, never a block of copy under a picture.
  const headRight = right !== flip;
  const band = headRight
    ? "group-data-[place=ground]/zt:-mr-6 group-data-[place=ground]/zt:pr-6 md:group-data-[place=ground]/zt:-mr-[5vw] md:group-data-[place=ground]/zt:pr-[5vw] group-data-[place=ground]/zt:pl-[0.2em]"
    : "group-data-[place=ground]/zt:-ml-6 group-data-[place=ground]/zt:pl-6 md:group-data-[place=ground]/zt:-ml-[5vw] md:group-data-[place=ground]/zt:pl-[5vw] group-data-[place=ground]/zt:pr-[0.2em]";
  const arrived = (motion: boolean, size: string) => (
    <div className="absolute inset-0 flex flex-col justify-end">
      <div
        data-head=""
        className={`px-6 pb-[3svh] md:px-[5vw] text-on-photo group-data-[ink=dark]/zt:text-[var(--zt-dark)] group-data-[place=high]/zt:absolute group-data-[place=high]/zt:inset-x-0 group-data-[place=high]/zt:top-[11svh] group-data-[place=ground]/zt:pb-0 group-data-[place=ground]/zt:text-ink`}
      >
        <h2 className={`font-display ${size} leading-[0.88] tracking-[-0.04em] [word-spacing:0.08em]`}>
          {heading.map((h) => (
            <span key={h} className={`-mx-6 flex px-6 md:-mx-[5vw] md:px-[5vw] ${headRight ? "justify-end" : "justify-start"}`}>
              {/* The ground band sits outside the shared line mask, so the mask's child paints no plate and a band
                  never grows into the line above it. */}
              <span className={`block group-data-[place=ground]/zt:bg-surface-0 group-data-[place=ground]/zt:pb-[0.12em] group-data-[place=ground]/zt:pt-[0.08em] ${band}`}>
                <span className={`block ${motion ? "struq-line-mask" : ""}`}>
                  <span data-rise={motion ? "" : undefined} data-hline="" className="block whitespace-nowrap">
                    {h}
                  </span>
                </span>
              </span>
            </span>
          ))}
        </h2>
      </div>
      {line || caption ? (
        <div
          data-strip=""
          className={`flex flex-col gap-3 bg-surface-0 px-6 py-6 md:flex-row md:items-end md:justify-between md:gap-10 md:px-[5vw] md:py-[3.4svh] ${
            headRight ? "items-end text-right md:flex-row-reverse" : ""
          }`}
        >
          {line ? (
            <span className={`block max-w-[38ch] ${motion ? "struq-line-mask" : ""}`}>
              <span data-after={motion ? "" : undefined} className="block text-balance text-lead text-ink">
                {line}
              </span>
            </span>
          ) : null}
          {caption ? (
            <span className={`block ${motion ? "struq-line-mask" : ""}`}>
              <span data-after={motion ? "" : undefined} className="block text-small text-ink-muted">
                {caption}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const mark = (at: "tl" | "tr" | "bl" | "br") => (
    <span
      key={at}
      data-mark={at}
      aria-hidden
      className={`absolute size-[0.9rem] border-ink ${at[0] === "t" ? "-top-3 border-t" : "-bottom-3 border-b"} ${
        at[1] === "l" ? "-left-3 border-l" : "-right-3 border-r"
      }`}
    />
  );

  return (
    <section
      ref={stage}
      data-transition="zoom-through"
      data-place={firstPlace}
      data-ink={firstInk}
      style={
        {
          "--zt-dark": "oklch(from var(--surface-0) min(calc(l * 0.42), 0.19) c h)",
        } as React.CSSProperties
      }
      className={`group/zt relative bg-surface-0 ${className}`}
    >
      {/* The pinned stage (wide screens with motion). Shown only once the page runs scripts. */}
      <div data-tree="" className="relative hidden h-svh overflow-hidden md:motion-safe:[:is(.js,.sq-js)_&]:block md:motion-safe:group-data-[live]/zt:block">
        <div data-clip="" className="absolute inset-0" style={{ clipPath: startClip }}>
          <div data-drift="" className="absolute inset-0">
            <div data-plane="" className="absolute inset-0" style={{ transform: startScale, transformOrigin: origin }}>
              {photo()}
            </div>
          </div>
          <div data-copy="" className="absolute inset-0" style={{ transform: startScale, transformOrigin: origin }}>
            {arrived(true, "text-[length:calc(min(15vw,25svh)*var(--zt-hfit,1))]")}
          </div>
        </div>

        {/* The composed frame: three layers at their own distance from the lens. */}
        {lead ? (
          <div data-depth={DEPTH.lead} className="pointer-events-none absolute inset-0">
            <p className={`absolute top-[10svh] max-w-[30ch] text-body text-ink ${right ? "right-[5vw] text-right" : "left-[5vw]"}`}>
              {lead}
            </p>
          </div>
        ) : null}
        <div data-depth={DEPTH.title} className="pointer-events-none absolute inset-0">
          <p
            data-title=""
            className={`absolute bottom-[7svh] flex flex-col text-[length:calc(min(15vw,25svh)*var(--zt-fit,1))] text-ink ${
              right ? "right-[5vw] items-end" : "left-[5vw] items-start"
            }`}
          >
            <span data-line="" className={display}>
              {title}
            </span>
            {accent ? (
              <span data-line="" className={`${display} ${italic}`}>
                {accent}
              </span>
            ) : null}
          </p>
        </div>
        {caption ? (
          <div data-depth={DEPTH.caption} className="pointer-events-none absolute inset-0">
            <p
              className="absolute text-small text-ink-muted"
              style={{ left: win.left, top: `calc(${AIM_Y}% + ${HALF_H} + 1.1rem)` }}
            >
              {caption}
            </p>
          </div>
        ) : null}
        <div data-window="" aria-hidden className="pointer-events-none absolute" style={win}>
          {(["tl", "tr", "bl", "br"] as const).map(mark)}
        </div>
      </div>

      {/* The composed still: phones, reduced motion, and pages without scripts. */}
      <div className="md:motion-safe:[:is(.js,.sq-js)_&]:hidden md:motion-safe:group-data-[live]/zt:hidden">
        <div className={`flex flex-col gap-8 px-6 pb-10 pt-16 md:px-[5vw] md:pb-[8svh] md:pt-[12svh] ${right ? "items-end text-right" : ""}`}>
          {lead ? <p className="max-w-[30ch] text-body text-ink">{lead}</p> : null}
          <p
            data-still-title=""
            className={`flex w-full flex-col text-[length:calc(19vw*var(--zt-sfit,1))] text-ink md:text-[length:calc(min(13vw,22svh)*var(--zt-sfit,1))] ${
              right ? "items-end" : "items-start"
            }`}
          >
            <span data-line="" className={display}>
              {title}
            </span>
            {accent ? (
              <span data-line="" className={`${display} ${italic}`}>
                {accent}
              </span>
            ) : null}
          </p>
        </div>
        <div data-still-photo="" className="relative h-[92svh] overflow-hidden md:h-svh">
          {photo()}
          {arrived(false, "text-[length:calc(19vw*var(--zt-hfit,1))] md:text-[length:calc(min(13vw,22svh)*var(--zt-hfit,1))]")}
        </div>
      </div>
    </section>
  );
}
