"use client";
// components/struq/kit/motion/ImageCurtain.tsx (Struq recipe)
// A panel in the page's ground colour covers a photo and lifts off it as it enters, while the photo settles. Use it
// for a photo that should be uncovered, as if the page itself drew back; MaskWipe is the plainer cut. Extracted from
// showpieces/panel-wipe (ground-colour panels travelling off on the structural ease, the photo settling under them),
// made a single panel on enter.
//
// <ImageCurtain className="aspect-[3/2]"><img src="/rooms/table.jpg" alt="The long table by the window" className="h-full w-full object-cover" /></ImageCurtain>
//
// Props
// - children: the photo (an img, a next/image with fill, or kit/MediaFrame with reveal="none"). Give the wrapper its
//   size (className) when the photo fills it.
// - lift: where the panel goes: "up" (default), "down", "left" or "right".
// - on: "scroll" (default, once at the feel's trigger) or "load" (on mount, for a hero).
// - delay: seconds before it starts. className: on the wrapper. The panel takes bg-surface-0, the scene's ground,
//   so it reads correctly inside scene-inverse and scene-field too.
//
// Motion: the panel travels off over dur("curtain", size) on the feel's curtain ease; the photo settles from
// feel().travel.media scale to 1 over dur("settle", size) on the enter ease, both from the same moment. Reduced
// motion, no scripts or the server render: the photo uncovered and at rest. No layout shift: only transforms move.
import { useRef, type ReactNode } from "react";
import { feel, LOCKED, prefersReduced } from "../feel";
import { gsap, useGSAP } from "../gsap";

type Lift = "up" | "down" | "left" | "right";

type Props = {
  children: ReactNode;
  lift?: Lift;
  on?: "scroll" | "load";
  delay?: number;
  className?: string;
};

const AWAY: Record<Lift, gsap.TweenVars> = {
  up: { yPercent: -100 },
  down: { yPercent: 100 },
  left: { xPercent: -100 },
  right: { xPercent: 100 },
};

export function ImageCurtain({ children, lift = "up", on = "scroll", delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const panel = el?.querySelector<HTMLElement>("[data-curtain-panel]");
      const photo = el?.querySelector<HTMLElement>("[data-curtain-photo]");
      if (!el || !panel || !photo) return;
      if (prefersReduced()) {
        el.dataset.ready = "1";
        return;
      }
      const f = feel(el);
      const size = lift === "up" || lift === "down" ? el.offsetHeight : el.offsetWidth;
      // The panel stands in place until the trigger; CSS holds it there before hydration. x and y are zeroed too:
      // GSAP reads the resting CSS transform (translate -100%) into x or y in px, which would keep it off the photo.
      gsap.set(panel, { x: 0, y: 0, xPercent: 0, yPercent: 0 });
      const tl = gsap.timeline({
        delay,
        scrollTrigger: on === "scroll" ? { trigger: el, start: LOCKED.trigger.start, once: LOCKED.trigger.once } : undefined,
      });
      tl.to(panel, { ...AWAY[lift], duration: f.dur("curtain", size), ease: f.ease.curtain }, 0);
      tl.fromTo(photo, { scale: f.travel.media }, { scale: 1, duration: f.dur("settle", size), ease: f.ease.enter }, 0);
      el.dataset.ready = "1";
    },
    { scope: ref, dependencies: [lift, on, delay] },
  );

  return (
    <div ref={ref} data-curtain={lift} className={`relative overflow-hidden ${className}`}>
      <div data-curtain-photo="" className="absolute inset-0">
        {children}
      </div>
      <span aria-hidden data-curtain-panel="" className="absolute inset-0 bg-surface-0" />
    </div>
  );
}
