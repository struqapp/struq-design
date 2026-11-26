"use client";
// components/struq/kit/gl/signals.ts (Struq kit): the inputs a real-time scene listens to.
//
// Every value here is a ref, read inside useFrame, so the scene never re-renders React to move:
// - useScrollProgress(ref): 0 to 1 while a section crosses the screen (or while it is pinned), from ScrollTrigger on
//   the page's one GSAP clock. Camera, object, light and type all read this one value, so they cannot drift apart.
// - useScrollVelocity(): the Lenis scroll speed, damped and normalised to about -1..1. Feed it to a stretch, a spin
//   or a ripple that grows with speed and relaxes when the scroll stops.
// - usePointer(): the pointer, -1..1 on both axes, damped. Lean an object 3 to 8 degrees toward it: presence, not a
//   spotlight.
// - useTokenColor(name): a palette token (--accent, --surface-0 ...) as a THREE.Color, so the scene follows the palette.
// - prefersReducedMotion(): true when the visitor asked for less motion; the Stage then renders one still frame.
// - span(signal, from, to): the part of a progress between two beats, again 0 to 1, eased if you like. One world
//   across the page reads one page progress and gives each chapter its span: span(page, 0.2, 0.35) lights the lamp
//   while the second scene crosses the screen.
import { useEffect, useRef, useState, type RefObject } from "react";
import { Color } from "three";
import { ScrollTrigger } from "../gsap";
import { getLenis } from "../SmoothScroll";

export type Signal = { current: number };

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type ProgressOptions = {
  /** ScrollTrigger start, default "top bottom" (the section enters). With pin, use "top top". */
  start?: string;
  /** ScrollTrigger end, default "bottom top" (the section leaves). With pin, for example "+=250%". */
  end?: string;
  /** Pin the section while the progress runs. Keep pins short: every pinned screen must change something. */
  pin?: boolean;
};

/** 0 to 1 while `target` crosses its start and end. Reduced motion: it still follows the native scroll. */
export function useScrollProgress(target: RefObject<HTMLElement | null>, { start = "top bottom", end = "bottom top", pin = false }: ProgressOptions = {}): Signal {
  const progress = useRef(0);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      pin,
      scrub: true,
      onUpdate: (self) => {
        progress.current = self.progress;
      },
    });
    progress.current = st.progress;
    return () => st.kill();
  }, [target, start, end, pin]);
  return progress;
}

/**
 * The part of `signal` between `from` and `to`, as its own 0 to 1 signal (read live, so it never goes stale).
 * Pass `ease` for a shaped beat, for example (t) => t * t * (3 - 2 * t).
 */
export function span(signal: Signal, from: number, to: number, ease: (t: number) => number = (t) => t): Signal {
  return {
    get current() {
      const t = (signal.current - from) / (to - from || 1);
      return ease(Math.max(0, Math.min(1, t)));
    },
  };
}

/** The scroll speed, damped, about -1..1 (positive scrolling down). Zero under reduced motion. */
export function useScrollVelocity(damping = 0.12): Signal {
  const velocity = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = getLenis()?.velocity ?? 0;
      const target = Math.max(-1, Math.min(1, v / 60));
      velocity.current += (target - velocity.current) * damping;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [damping]);
  return velocity;
}

/** The pointer, -1..1 on both axes (y up), damped toward where it is. Rests at 0 on touch screens. */
export function usePointer(damping = 0.08): { current: { x: number; y: number } } {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const goal = { x: 0, y: 0 };
    const move = (e: PointerEvent) => {
      goal.x = (e.clientX / window.innerWidth) * 2 - 1;
      goal.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    let raf = 0;
    const tick = () => {
      pointer.current.x += (goal.x - pointer.current.x) * damping;
      pointer.current.y += (goal.y - pointer.current.y) * damping;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [damping]);
  return pointer;
}

/** A palette token from :root or [data-blocks] as a THREE.Color, read after mount. */
export function useTokenColor(name: string, fallback = "#888888") {
  const [color, setColor] = useState(() => new Color(fallback));
  useEffect(() => {
    const scope = document.querySelector("[data-blocks]") ?? document.documentElement;
    const value = getComputedStyle(scope).getPropertyValue(name).trim();
    if (!value) return;
    // Tokens may be oklch or color-mix, which three cannot parse: paint one pixel and read it back as sRGB.
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    setColor(new Color().setRGB(r / 255, g / 255, b / 255, "srgb"));
  }, [name]);
  return color;
}
