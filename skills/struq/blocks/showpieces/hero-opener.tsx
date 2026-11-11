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
// The line is the display face at poster size, with at most one italic accent word. The flat scrim
// keeps the copy at 4.5:1; never a gradient. Reduced motion and phones: the composed still, no pin.
// The section after the opener slides over it: globals.css gives it a ground and a higher layer.
//
// The entrance (the line rising through its masks, the split words, the lead and the CTA) waits for
// any preloader or page transition to start leaving (whenUncovered, from the helper the frames share),
// and plays at once when nothing covers the page.
import { useRef } from "react";
import { HeroCanvas } from "../kit/HeroCanvas";
import { MagneticButton } from "../kit/MagneticButton";
import { SplitText, gsap, useGSAP } from "../kit/gsap";
import type { StruqImage } from "../kit/images";
import { whenUncovered } from "../preloaders/preloader-slices-uncovered";

type Props = {
  /** The beeldbank or client photo. Without one (imageFit "none"), the opener is typographic on the inverse ground over the dots scene. */
  image?: StruqImage;
  /** The poster line ("across"). */
  title?: string;
  /** One word in the display face's italic, after the title. */
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
  className?: string;
};

export function HeroOpener({ image, title, accent, split, lead, cta, header, scrim = 0.34, calm, className = "" }: Props) {
  // The lead goes on the photo's calm side; the CTA takes the other. Over a busy frame (no calm
  // side known) the lead gets a flat backing at a fixed opacity and is set a step larger.
  const side = calm ?? (image?.negativeSpace === "left" || image?.negativeSpace === "right" ? image.negativeSpace : image ? "none" : "left");
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
        let uncovered = false;
        const intro = gsap.timeline({ paused: true });
        if (split) {
          intro.from(q("[data-split-word]"), { yPercent: 110, duration: 1.4, ease: "expo.out", stagger: 0.12 }, 0.25);
        }
        intro.from(q("[data-opener-copy] > *"), { y: 32, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.1 }, 0.7);
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
                  .from(self.lines, { yPercent: 115, duration: 1.25, ease: "expo.out", stagger: 0.09 }, 0.15);
                return lines;
              },
            })
          : null;
        if (title) title.dataset.ready = "1";
        const stop = whenUncovered(() => {
          uncovered = true;
          intro.play();
          lines?.play();
        });
        return () => {
          stop();
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
    <section ref={stage} data-showpiece="hero-opener" className={`relative h-svh overflow-hidden ${image ? "bg-black text-on-photo" : "scene-inverse"} ${className}`}>
      <div data-opener-inner="" className="absolute inset-0 origin-top">
        {image ? <HeroCanvas scene="ripple" image={image} grade={0.15} priority /> : <HeroCanvas scene="dots" />}
        {image ? <div aria-hidden className="absolute inset-0 bg-black" style={{ opacity: scrim }} /> : null}
        <div data-opener-dim="" aria-hidden className="absolute inset-0 bg-black opacity-0" />
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
              {title}
              {accent ? (
                <>
                  {" "}
                  <em className="font-accent font-light italic tracking-[-0.02em] [word-spacing:0.09em]">{accent}</em>
                </>
              ) : null}
            </h1>
          ) : null}
        </div>
      </div>
    </section>
  );
}
