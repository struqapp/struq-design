// lib/gsap.ts (Struq recipe)
// One registry for every GSAP plugin the site uses. Import gsap from here, never from "gsap"
// directly, so a component rendered on its own still has its plugins registered.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { FEELS } from "./feel";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// The Struq entrance: the weighted (house) arrival, expo.out inside the reveal band.
const HOUSE = FEELS.weighted;
gsap.defaults({ ease: HOUSE.ease.enter, duration: HOUSE.duration.enter });

/** The house eases by role, from the weighted feel (./feel). Per-site motion reads feel() instead. */
export const EASE = {
  enter: HOUSE.ease.enter,
  exit: HOUSE.ease.exit,
  swap: HOUSE.ease.swap,
  curtain: HOUSE.ease.curtain,
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
