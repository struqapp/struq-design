"use client";
// toonstuk-hero-opener (Struq showpiece recipe): the full-bleed cinematic opener
// The first screen is the photo (or the WebGL scene over it), edge to edge, with the display line
// set across it at 14 to 20vw: either one poster line along the held-clear bottom ("across"), or
// the name split to the left and right edges with the photo between ("split"). One short lead and
// one confident rectangular CTA sit above the line. On scroll the opener hands over with a real
// move: it pins, scales down and darkens while the next section slides up over it.
//
// <HeroOpener image={images.hero[0]} title="Koken op" accent="vuur." lead="..." cta={{ href: "#reserveren", label: "Reserveer een tafel" }} header={<SiteHeader />} />
// <HeroOpener image={images.hero[0]} split={["Vuur", "Noord"]} lead="..." cta={...} />
//
// <HeroOpener image={images.hero[0]} title="Koken op vuur." accent="vuur" lead="..." cta={...} />
// <HeroOpener title="Getijden" backdrop={<TideLines />} lead="..." cta={...} />
//
// Without a photo the opener is type on the inverse ground, over the site's own motif. `backdrop` takes the builder's
// own drawing (an SVG or a small canvas from the site's world), set behind the display line; it wins over `scene`.
// `scene` picks a stock WebGL field instead ("dots", "contours") or nothing at all ("none": the ground and the type).
// The dots are the default only so earlier pages keep working: a fallback, not a choice. Every photoless site that
// leaves it on opens on the same dot wave, so give it a backdrop of its own or pick a scene that fits.
//
// The section says its ground to the header bar (data-bar-tone): "photo" over a photo, "inverse" without one, and
// "ground" when a className sets a page surface (bg-surface-*). Any other ground a className brings needs `barTone`.
// The scrim and the handover's dim are data-veil, so the bar reads the photo under it as the page shows it.
//
// The line is the display face at poster size, with at most one italic accent word: the site's one accent word, marked
// in place when the title holds it (the same mark as the Statement and the Close, kept whole by SplitText's line cut),
// or set after the title when it does not. The flat scrim
// keeps the copy at 4.5:1; never a gradient. Reduced motion and phones: the composed still, no pin.
// The section after the opener slides over it: globals.css gives it a ground and a higher layer.
//
// The entrance (the line rising through its masks, the split words, the lead and the CTA) waits for
// any preloader or page transition to start leaving (whenUncovered, from the helper the frames share),
// and plays at once when nothing covers the page, or `delay` seconds later when the backdrop has a first beat of its
// own (a drawn street whose lights come on as the gate opens).
import { useRef, type ReactNode } from "react";
import { findAccent, withAccent } from "../kit/accent";
import { feel } from "../kit/feel";
import { HeroCanvas } from "../kit/HeroCanvas";
import { MagneticButton } from "../kit/MagneticButton";
import { SplitText, gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { staggerIn, timeIn, travelIn } from "../kit/tempo";
import { whenUncovered } from "../preloaders/preloader-slices-uncovered";

type Props = {
  /** The beeldbank or client photo. Without one, the opener is typographic on the inverse ground, over `backdrop` or `scene`. */
  image?: StruqImage;
  /** The poster line ("across"). */
  title?: string;
  /**
   * The site's one accent word, in the pairing's italic accent face. A word the title holds is marked where it first
   * stands (whole word, any case, punctuation outside), as the Statement and the Close mark it; a word the title does
   * not hold is set after the title, as before.
   */
  accent?: string;
  /** Two words for the split wordmark; replaces title. */
  split?: [string, string];
  lead: string;
  cta: { href: string; label: string };
  /** The site header (with the data-wordmark name), set over the photo. */
  header?: React.ReactNode;
  /** 0.2 to 0.5: the flat scrim under the copy. */
  scrim?: number;
  /**
   * The photo's calm side, where the lead reads. Defaults to the image's own negativeSpace from the
   * beeldbank. With no calm left or right side, the lead gets a fixed backing and a step up in size.
   */
  calm?: "left" | "right" | "none";
  /**
   * Without a photo: the stock WebGL field behind the type, or "none" for the ground alone. "dots" by default, kept
   * only so earlier pages keep working; a backdrop wins over it.
   */
  scene?: "dots" | "contours" | "none";
  /** Without a photo: the builder's own motif (an SVG or a small canvas), drawn behind the display line. Wins over scene. */
  backdrop?: ReactNode;
  /** The ground the header bar reads here, when a className turns it to one the block cannot tell from its classes. */
  barTone?: "ground" | "photo" | "inverse";
  /**
   * Seconds between the page being uncovered and the entrance: room for the backdrop's own first beat (the street's
   * lights coming on, a field settling) before the line rises. 0 by default; keep it under 1.5.
   */
  delay?: number;
  className?: string;
};

export function HeroOpener({
  image,
  title,
  accent,
  split,
  lead,
  cta,
  header,
  scrim = 0.34,
  calm,
  scene = "dots",
  backdrop,
  barTone,
  delay = 0,
  className = "",
}: Props) {
  const tone = barTone ?? (image ? "photo" : /(^|\s)bg-surface-\d(\s|$)/.test(className) ? "ground" : "inverse");
  // The lead goes on the photo's calm side; the CTA takes the other. Over a busy frame (no calm
  // side known) the lead gets a flat backing at a fixed opacity and is set a step larger.
  const side = calm ?? (image?.negativeSpace === "left" || image?.negativeSpace === "right" ? image.negativeSpace : image ? "none" : "left");
  const inTitle = Boolean(title && findAccent(title, accent));
  const stage = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const title = q("[data-opener-title]")[0] as HTMLElement | undefined;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (!title) return;
        title.dataset.ready = "1";
        gsap.from(title, { autoAlpha: 0, duration: 0.6 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Every part is set in its start state now and the whole entrance plays once nothing covers the page.
        const f = feel(el);
        let uncovered = false;
        const intro = gsap.timeline({ paused: true });
        if (split) {
          intro.from(
            q("[data-split-word]"),
            { yPercent: travelIn(f, 110, "text"), duration: timeIn(f, 1.4, "line"), ease: f.ease.enter, stagger: staggerIn(f, 0.12, "word") },
            timeIn(f, 0.25),
          );
        }
        intro.from(
          q("[data-opener-copy] > *"),
          { y: travelIn(f, 32), autoAlpha: 0, duration: timeIn(f, 1), ease: f.ease.enter, stagger: staggerIn(f, 0.1, "block") },
          timeIn(f, 0.7),
        );
        // The poster line rises line by line through its masks, cut again when the width or the face changes (a cut
        // after the entrance carries its progress over, so it never replays).
        let lines: gsap.core.Timeline | null = null;
        const cut = title
          ? SplitText.create(title, {
              type: "lines",
              mask: "lines",
              linesClass: "struq-line",
              autoSplit: true,
              onSplit(self) {
                lines = gsap
                  .timeline({ paused: !uncovered })
                  .from(self.lines, { yPercent: f.travel.text, duration: f.duration.line, ease: f.ease.enter, stagger: f.stagger.line }, timeIn(f, 0.15, "line"));
                return lines;
              },
            })
          : null;
        if (title) title.dataset.ready = "1";
        // A held entrance says so on <html data-entrance="held"> until its line is up, so a screenshot (look.mjs) waits
        // for the first frame a visitor is meant to read instead of the beat before it.
        const root = document.documentElement;
        if (delay > 0) root.dataset.entrance = "held";
        const release = () => {
          if (delay > 0) delete root.dataset.entrance;
        };
        let wait: gsap.core.Tween | null = null;
        let done: gsap.core.Tween | null = null;
        const stop = whenUncovered(() => {
          wait = gsap.delayedCall(Math.max(0, delay), () => {
            uncovered = true;
            intro.play();
            lines?.play();
            done = gsap.delayedCall(f.duration.line + 0.4, release);
          });
        });
        return () => {
          stop();
          wait?.kill();
          done?.kill();
          release();
          cut?.revert();
        };
      });
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        // The handover: the opener holds, then scales down and darkens under the next section.
        gsap.timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", pin: true, pinSpacing: false, scrub: true },
        })
          .to(q("[data-opener-inner]"), { scale: 0.84, yPercent: -4, ease: "none" }, 0)
          .to(q("[data-opener-dim]"), { opacity: 0.6, ease: "none" }, 0);
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  // At poster size the words need air of their own: tight tracking pulls the letters together, and
  // word spacing in em keeps the gap in step with the size for any face.
  // The size sits on each word's mask too: the shared mask's room for accents and descenders is in its own em.
  const size = "text-[19vw] md:text-[16vw]";
  const poster = `font-display block ${size} leading-[0.92] tracking-[-0.045em] [word-spacing:0.09em]`;
  return (
    <section
      ref={stage}
      data-showpiece="hero-opener"
      data-bar-tone={tone}
      className={`relative h-svh overflow-hidden ${image ? "bg-black text-on-photo" : "scene-inverse"} ${className}`}
    >
      <div data-opener-inner="" className="absolute inset-0 origin-top">
        {image ? (
          <HeroCanvas scene="ripple" image={image} grade={0.15} priority />
        ) : backdrop ? (
          <div data-opener-backdrop="" aria-hidden className="absolute inset-0 overflow-hidden">
            {backdrop}
          </div>
        ) : scene !== "none" ? (
          <HeroCanvas scene={scene} />
        ) : null}
        {image ? <div data-veil="" aria-hidden className="absolute inset-0 bg-black" style={{ opacity: scrim }} /> : null}
        <div data-opener-dim="" data-veil="" aria-hidden className="absolute inset-0 bg-black opacity-0" />
        {header ? <div className="absolute inset-x-0 top-0 z-20">{header}</div> : null}
        {split ? (
          <h1 aria-label={split.join(" ")} className="absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 justify-between px-sheet-margin">
            {split.map((word) => (
              <span key={word} className={`struq-line-mask block ${size}`}>
                <span data-split-word="" data-quiet="" className={poster}>
                  {word}
                </span>
              </span>
            ))}
          </h1>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-[3vh] px-sheet-margin pb-[3vh]">
          <div data-opener-copy="" className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${side === "right" ? "md:flex-row-reverse md:text-right" : ""}`}>
            {side === "none" ? (
              <p data-quiet="" className="relative isolate max-w-[30ch] text-h3">
                <span aria-hidden className="absolute -inset-x-5 -inset-y-4 -z-10 bg-black opacity-55" />
                {lead}
              </p>
            ) : (
              <p data-quiet="" className="max-w-[32ch] text-lead">{lead}</p>
            )}
            <div>
              <MagneticButton href={cta.href} size="lg">
                {cta.label}
              </MagneticButton>
            </div>
          </div>
          {!split && title ? (
            <h1 data-opener-title="" data-split="" data-quiet="" className={poster}>
              {/* An accent the title holds is marked in place; any other accent is the trailing word, as it always was. */}
              {inTitle ? (
                withAccent(title, accent)
              ) : (
                <>
                  {title}
                  {accent ? (
                    <>
                      {" "}
                      <em className="font-accent font-light italic tracking-[-0.02em] [word-spacing:0.09em]">{accent}</em>
                    </>
                  ) : null}
                </>
              )}
            </h1>
          ) : null}
        </div>
      </div>
    </section>
  );
}
