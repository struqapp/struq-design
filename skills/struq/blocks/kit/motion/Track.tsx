"use client";
// components/struq/kit/motion/Track.tsx (Struq recipe)
// A sideways run of items. Pinned, the section holds while the run slides sideways as you scroll down; unpinned, the
// run is a native swipe row with snap at every width, nothing held. Either way each photo marked data-pan pans a
// little against its frame as it crosses, which gives the run depth. Extracted from kit/HorizontalGallery (its slide,
// its containerAnimation pan and its phone swipe row), with the timing moved onto the feel and the pin made optional.
//
// <Track label="The rooms" pin>
//   <figure className="w-[80vw] md:w-[34vw]"><div className="relative aspect-[3/2] overflow-hidden">
//     <div data-pan="" className="absolute inset-[-8%]"><img src="/room.jpg" alt="The garden room" /></div>
//   </div></figure>
// </Track>
//
// Props
// - children: the items, each a direct child of the row. Give each its width; Track adds the snap point.
// - label: what the run shows, for the swipe row's region (it is keyboard reachable and scrolls with the arrows).
// - pin: true holds the section and slides the row with the scroll on wide screens (energy 2, it spends the film's
//   pin budget); false (default) is the swipe row everywhere (energy 1).
// - className: on the root. rowClassName: on the row (its padding and gap).
//
// Mounting: a section's run of media. The root carries data-track="pinned" or "swipe" (what renders on this screen is
// decided by the pin prop; phones and reduced motion always swipe).
//
// Motion (kit/feel.ts, read from data-temperament="weighted" or the one the site sets on <body>): pinned, the slide is linear with the feel's scrub.pinned smoothing over exactly the row's
// overflow; the pans are linear and follow the slide. Swipe, the pans follow the row's own scroll. Reduced motion: no
// pin, no pan, the swipe row. No scripts or the server render: the swipe row, every item in place.
import { useRef, type ReactNode } from "react";
import { feel } from "../feel";
import { gsap, ScrollTrigger, useGSAP } from "../gsap";

type Props = {
  children: ReactNode;
  label: string;
  pin?: boolean;
  className?: string;
  rowClassName?: string;
};

/** How far a photo pans across its frame over its crossing, in percent of its own width each way. */
const PAN = 6;

export function Track({ children, label, pin = false, className = "", rowClassName = "gap-4 px-sheet-margin md:gap-[2vw]" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const run = row.current;
      if (!el || !run) return;
      const f = feel(el);
      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 768px)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { wide, motion } = ctx.conditions as { wide: boolean; motion: boolean };
        if (!motion) return;
        const pans = gsap.utils.toArray<HTMLElement>("[data-pan]", run);
        if (pin && wide) {
          el.dataset.track = "pinned";
          const distance = () => Math.max(0, run.scrollWidth - el.clientWidth);
          const slide = gsap.to(run, {
            x: () => -distance(),
            ease: f.ease.scrub,
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: f.scrub.pinned,
              invalidateOnRefresh: true,
            },
          });
          const tweens = pans.map((photo) =>
            gsap.fromTo(
              photo,
              { xPercent: -PAN },
              { xPercent: PAN, ease: "none", scrollTrigger: { trigger: photo, containerAnimation: slide, start: "left right", end: "right left", scrub: true } },
            ),
          );
          return () => {
            for (const t of tweens) t.scrollTrigger?.kill();
            slide.scrollTrigger?.kill();
            delete el.dataset.track;
          };
        }
        // The swipe row: each photo pans with the row's own sideways scroll.
        const triggers = pans.map((photo) => {
          const tween = gsap.fromTo(photo, { xPercent: -PAN }, { xPercent: PAN, ease: "none", paused: true });
          return ScrollTrigger.create({
            trigger: photo,
            scroller: run,
            horizontal: true,
            start: "left right",
            end: "right left",
            onUpdate: (self) => tween.progress(self.progress),
            onRefresh: (self) => tween.progress(self.progress),
            onKill: () => tween.revert(),
          });
        });
        return () => {
          for (const t of triggers) t.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [pin] },
  );

  return (
    <div ref={root} data-track={pin ? "pinned" : "swipe"} className={`relative overflow-hidden ${pin ? "md:flex md:min-h-svh md:flex-col md:justify-center" : ""} ${className}`}>
      <div
        ref={row}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={`flex snap-x snap-mandatory scroll-px-sheet-margin overflow-x-auto pb-2 outline-offset-4 [scrollbar-width:none] *:shrink-0 *:snap-start [&::-webkit-scrollbar]:hidden ${
          // Only a page running scripts, with motion allowed, lays the row out for the slide; without them it swipes.
          pin ? "md:motion-safe:[:is(.js,.sq-js)_&]:w-max md:motion-safe:[:is(.js,.sq-js)_&]:snap-none md:motion-safe:[:is(.js,.sq-js)_&]:overflow-visible" : ""
        } ${rowClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
