// lib/gsap.ts (Struq recipe)
// One registry for every GSAP plugin the site uses. Import gsap from here, never from "gsap"
// directly, so a component rendered on its own still has its plugins registered.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// The Struq entrance: expo.out inside the reveal band.
gsap.defaults({ ease: "expo.out", duration: 0.9 });

export const EASE = {
  enter: "expo.out",
  exit: "power2.in",
  swap: "power3.inOut",
  curtain: "power4.inOut",
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
